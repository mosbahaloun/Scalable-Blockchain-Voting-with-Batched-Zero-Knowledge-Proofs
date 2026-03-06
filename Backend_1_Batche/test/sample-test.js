// SPDX-License-Identifier: NONE
const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const wc = require("../circuit/witness_calculator");
const $u = require("../utils/$u.js");
const snarkjs = require("snarkjs");
const { mimc5Sponge } = require("../utils/mimc5.js");

describe("Full Test: 40 single vote commitments (1×40), 40 vote submissions (1×), 40 recovery tokens (1×), with addCandidate", function () {
    let hasher, verifier, tornado, witnessCalc;
    let eaWallet;   // Simulated Election Authority signer

    // ---- constants ----
    const TOTAL_VOTERS = 40;   // 40 individual transactions each

    const depositValue = ethers.utils.parseEther("0.01"); // 0.01 ETH per voteCommitment

    const depositWasm  = path.join(__dirname, "../utils/batch_deposit_1.wasm");
    const withdrawWasm = path.join(__dirname, "../utils/BatchWithdraw_1.wasm");
    const zkey         = path.join(__dirname, "../utils/setup_1_final.zkey");

    const levelDefaults = [
        23183772226880328093887215408966704399401918833188238128725944610428185466379n,
        24000819369602093814416139508614852491908395579435466932859056804037806454973n,
        90767735163385213280029221395007952082767922246267858237072012090673396196740n,
        36838446922933702266161394000006956756061899673576454513992013853093276527813n,
        68942419351509126448570740374747181965696714458775214939345221885282113404505n,
        50082386515045053504076326033442809551011315580267173564563197889162423619623n,
        73182421758286469310850848737411980736456210038565066977682644585724928397862n,
        60176431197461170637692882955627917456800648458772472331451918908568455016445n,
        105740430515862457360623134126179561153993738774115400861400649215360807197726n,
        76840483767501885884368002925517179365815019383466879774586151314479309584255n
    ];

    // ---- timing helpers ----
    const nowNs = () => process.hrtime.bigint();
    const nsToMs = (ns) => Number(ns) / 1e6;
    function computeStats(msArray) {
        if (!msArray.length) return { n: 0, mean: NaN, p50: NaN, p90: NaN, p99: NaN };
        const a = [...msArray].sort((x, y) => x - y);
        const n = a.length;
        const mean = a.reduce((s, v) => s + v, 0) / n;
        const q = (p) => {
            const idx = (n - 1) * p, lo = Math.floor(idx), hi = Math.ceil(idx);
            return lo === hi ? a[lo] : a[lo] + (a[hi] - a[lo]) * (idx - lo);
        };
        return { n, mean, p50: q(0.5), p90: q(0.9), p99: q(0.99) };
    }
    function printStats(label, msArray) {
        const s = computeStats(msArray);
        const fmt = (x) => Number.isFinite(x) ? x.toFixed(2) : "—";
        console.log(`⏱ ${label}: n=${s.n}  mean=${fmt(s.mean)}ms  p50=${fmt(s.p50)}ms  p90=${fmt(s.p90)}ms  p99=${fmt(s.p99)}ms`);
    }
    const bigIntMax = (arr) => arr.reduce((m, v) => (v > m ? v : m));

    // ----------------------------------------------------------------
    // buildSigBuffer — produces a single packed 65-byte sig buffer
    // expected by recoveryToken: v(1) | r(32) | s(32)
    // ethers.Wallet.signMessage returns r(32)|s(32)|v(1); we repack.
    // ----------------------------------------------------------------
    async function buildSigBuffer(signer, uniqueId, voterPubKey) {
        const msgHash = ethers.utils.keccak256(
            ethers.utils.concat([uniqueId, voterPubKey])
        );
        const sig      = await signer.signMessage(ethers.utils.arrayify(msgHash));
        const sigBytes = ethers.utils.arrayify(sig); // 65 bytes: r|s|v
        const packed   = new Uint8Array(65);
        packed[0] = sigBytes[64];                    // v
        packed.set(sigBytes.slice(0, 32),  1);       // r
        packed.set(sigBytes.slice(32, 64), 33);      // s
        return packed;
    }

    // ================================================================
    // before — deploy contracts, register EA, add candidates
    // ================================================================
    before(async () => {
        const [owner] = await ethers.getSigners();

        // Fresh random wallet simulates the Election Authority
        eaWallet = ethers.Wallet.createRandom().connect(ethers.provider);

        const Hasher = await ethers.getContractFactory("Hasher");
        hasher = await Hasher.deploy();
        await hasher.deployed();

        const Verifier = await ethers.getContractFactory("Groth1Verifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();

        const Tornado = await ethers.getContractFactory("Tornado");
        tornado = await Tornado.deploy(
            hasher.address,
            verifier.address,
            ["Alice"],
            [owner.address]
        );
        await tornado.deployed();

        // Register the EA address so recoveryToken can verify sigs
        await (await tornado.connect(owner).setElectionAuthority(eaWallet.address)).wait();
        console.log("🔑 Election Authority set to:", eaWallet.address);

        const depositBuffer = fs.readFileSync(depositWasm);
        witnessCalc = await wc(depositBuffer);

        // Add 10 candidates
        const gasUsedToAddCandidates = [];
        for (let i = 1; i <= 10; i++) {
            const candidateName = `Candidate${i}`;
            const candidateAddr = ethers.Wallet.createRandom().address;
            const tx = await tornado.connect(owner).addCandidate(candidateName, candidateAddr);
            const receipt = await tx.wait();
            gasUsedToAddCandidates.push(receipt.gasUsed);
            console.log(`🧾 Gas Used to Add ${candidateName}:`, receipt.gasUsed.toString());
        }
        const totalAddCandidateGas = gasUsedToAddCandidates.reduce(
            (acc, g) => acc.add(g),
            ethers.BigNumber.from(0)
        );
        console.log("📊 Total Gas to Add 10 Candidates:", totalAddCandidateGas.toString());
    });

    // ================================================================
    // Test 1: voteCommitment — 40 individual txs (1 note each)
    //         voteSubmission — 40 individual txs (1 note each)
    // ================================================================
    it("should perform 40 voteCommitment txs (1 note each) and 40 voteSubmission txs (1×)", async () => {
        const [user] = await ethers.getSigners();

        const commitWitnessMs    = [];
        const merklePathMs       = [];
        const commitInclMs       = [];
        const commitMinedNs      = [];
        const submitProofMs      = [];
        const submitInclMs       = [];
        const submitWaitMs       = [];
        const submitEndToEndMs   = [];
        const commitGasReceipts  = [];
        const submitGasReceipts  = [];
        const allDecodedEvents   = [];
        const allDecryptedProofs = [];

        // ---- 40 individual voteCommitment transactions ----
        for (let t = 0; t < TOTAL_VOTERS; t++) {
            const secret   = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString();
            const nullifier = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString();

            const depInput = {
                secret:   $u.BN256ToBin(secret).split(""),
                nullifier: $u.BN256ToBin(nullifier).split("")
            };

            const wStart = nowNs();
            // witness[1] = commitment, witness[2] = nullifierHash
            const witness = await witnessCalc.calculateWitness(depInput, 0);
            const wEnd = nowNs();
            commitWitnessMs.push(nsToMs(wEnd - wStart));

            const commitment    = BigInt(witness[1]);
            const nullifierHash = BigInt(witness[2]);

            let idx = Number(await tornado.nextLeafIdx());
            let currentHash = commitment;
            const key = commitment;
            const hashPairings  = [];
            const pairDirection = [];

            const mStart = nowNs();
            for (let level = 0; level < 10; level++) {
                const isLeft = idx % 2 === 0;
                const sibling = levelDefaults[level];
                const left  = isLeft ? currentHash : sibling;
                const right = isLeft ? sibling    : currentHash;
                hashPairings.push(sibling);
                pairDirection.push(isLeft ? 0 : 1);
                currentHash = mimc5Sponge([left, right], key);
                idx = Math.floor(idx / 2);
            }
            const mEnd = nowNs();
            merklePathMs.push(nsToMs(mEnd - mStart));

            const newRoot = currentHash;

            const dStart = nowNs();
            const tx = await tornado.voteCommitment(
                commitment.toString(),
                newRoot.toString(),
                hashPairings,
                pairDirection,
                { value: depositValue }
            );
            const receipt = await tx.wait();
            const dEnd = nowNs();

            expect(receipt.status).to.equal(1);
            console.log(`✅ voteCommitment ${t + 1} Gas Used:`, receipt.gasUsed.toString());

            commitInclMs.push(nsToMs(dEnd - dStart));
            commitMinedNs.push(dEnd);
            commitGasReceipts.push(receipt.gasUsed);

            allDecodedEvents.push({
                root: newRoot.toString(),
                hashPairings,
                pairDirection
            });
            allDecryptedProofs.push({
                secret,
                nullifier,
                nullifierHash: nullifierHash.toString()
            });
        }

        // ---- 40 individual voteSubmission transactions ----
        for (let i = 0; i < TOTAL_VOTERS; i++) {
            const decoded = allDecodedEvents[i];
            const proof   = allDecryptedProofs[i];
            const recipientBig = BigInt(user.address.toLowerCase());

            const proofInput = {
                root:          $u.BNToDecimal(decoded.root),
                nullifierHash: proof.nullifierHash,
                recipient:     recipientBig.toString(),
                secret:        $u.BN256ToBin(proof.secret).split(""),
                nullifier:     $u.BN256ToBin(proof.nullifier).split(""),
                hashPairings:  decoded.hashPairings.map($u.BNToDecimal),
                hashDirections: decoded.pairDirection
            };

            const pStart = nowNs();
            const { proof: zkProof, publicSignals } = await snarkjs.groth16.fullProve(
                proofInput, withdrawWasm, zkey
            );
            const pEnd = nowNs();
            submitProofMs.push(nsToMs(pEnd - pStart));

            // public signals: [root, nullifierHash, recipient]
            if (publicSignals.length !== 3)
                throw new Error(`expected 3 public signals, got ${publicSignals.length}`);

            const a = zkProof.pi_a.slice(0, 2).map($u.BN256ToHex);
            const b = zkProof.pi_b.slice(0, 2).map(row => $u.reverseCoordinate(row.map($u.BN256ToHex)));
            const c = zkProof.pi_c.slice(0, 2).map($u.BN256ToHex);

            const input = [
                publicSignals[0], // root
                publicSignals[1], // nullifierHash
                publicSignals[2], // recipient
            ];

            const recipient = ethers.utils.getAddress(
                "0x" + BigInt(publicSignals[2]).toString(16).padStart(40, "0")
            );

            const batchReadyNs = commitMinedNs[i];

            const wStart    = nowNs();
            const submitTx  = await tornado.voteSubmission(a, b, c, input, recipient);
            const wSubmitNs = wStart;
            const submitReceipt = await submitTx.wait();
            const wEnd = nowNs();

            expect(submitReceipt.status).to.equal(1);
            console.log(`✅ voteSubmission ${i + 1} Gas Used:`, submitReceipt.gasUsed.toString());

            submitInclMs.push(nsToMs(wEnd - wSubmitNs));
            submitWaitMs.push(nsToMs(wSubmitNs - batchReadyNs));
            submitEndToEndMs.push(nsToMs(wEnd - batchReadyNs));
            submitGasReceipts.push({ gasUsed: submitReceipt.gasUsed, gasPrice: submitTx.gasPrice });
        }

        // ---- gas totals ----
        let totalGas = ethers.BigNumber.from(0);
        for (const g of commitGasReceipts)           totalGas = totalGas.add(g);
        for (const { gasUsed } of submitGasReceipts) totalGas = totalGas.add(gasUsed);
        console.log("📊 Total Gas Used (40 voteCommitment + 40 voteSubmission):", totalGas.toString());

        const avgGasPrice = submitGasReceipts
            .reduce((sum, { gasPrice }) => sum.add(gasPrice), ethers.BigNumber.from(0))
            .div(submitGasReceipts.length);
        const totalEthCost = ethers.utils.formatEther(totalGas.mul(avgGasPrice));
        const totalGbpCost = (parseFloat(totalEthCost) * 2400).toFixed(2);
        console.log("💷 Estimated GBP Cost:", `£${totalGbpCost}`);

        printStats("voteCommitment witness (single deposit circuit)", commitWitnessMs);
        printStats("Merkle path compute (MiMC, 1 path per tx)",       merklePathMs);
        printStats("voteCommitment inclusion (submit→mined)",          commitInclMs);
        printStats("voteSubmission proof gen (single note)",           submitProofMs);
        printStats("voteSubmission inclusion (submit→mined)",          submitInclMs);
        printStats("Submit wait (commit mined→submit voteSubmission)", submitWaitMs);
        printStats("End-to-end (commit mined→voteSubmission mined)",   submitEndToEndMs);
    });

    // ================================================================
    // Test 2: recoveryToken — 40 individual calls (1 token each)
    //
    // For each voter the EA signs (uniqueId, voterPubKey).
    // The contract verifies the signature then stores
    //   H = keccak256(recToken || voterPubKey)
    // in a single 32-byte slot — hash-based storage gives recovery
    // tokens superior gas scaling vs. voter commitments.
    // ================================================================
    it("measures gas for 40 × recoveryToken calls (1 token each, 40 voters total)", async () => {
        const [owner] = await ethers.getSigners();

        const recoveryGasReceipts = [];
        const recoveryInclMs      = [];

        for (let i = 0; i < TOTAL_VOTERS; i++) {
            const uniqueId    = ethers.utils.hexZeroPad(ethers.utils.randomBytes(32), 32);
            const recToken    = ethers.utils.hexZeroPad(ethers.utils.randomBytes(32), 32);
            const voterPubKey = ethers.utils.hexZeroPad(ethers.utils.randomBytes(32), 32);

            // EA signs (uniqueId, voterPubKey); pack into v|r|s buffer
            const sigBuffer = await buildSigBuffer(eaWallet, uniqueId, voterPubKey);

            const dStart = nowNs();
            const tx = await tornado.connect(owner).recoveryToken(
                uniqueId,
                recToken,
                voterPubKey,
                sigBuffer
            );
            const receipt = await tx.wait();
            const dEnd = nowNs();

            expect(receipt.status).to.equal(1);
            console.log(`✅ recoveryToken voter ${i + 1} Gas Used:`, receipt.gasUsed.toString());

            recoveryGasReceipts.push(receipt.gasUsed);
            recoveryInclMs.push(nsToMs(dEnd - dStart));
        }

        const totalGas = recoveryGasReceipts.reduce(
            (acc, g) => acc.add(g), ethers.BigNumber.from(0)
        );
        console.log("📊 Total gas (40 × recoveryToken of 1):", totalGas.toString());
        console.log("📈 Avg gas per recoveryToken call:",       totalGas.div(TOTAL_VOTERS).toString());

        printStats("recoveryToken inclusion (submit→mined)", recoveryInclMs);
    });

    // ================================================================
    // Test 3: addCandidate gas — 10 calls (for reference)
    // ================================================================
    it("measures gas for 10 addCandidate calls", async () => {
        const [owner] = await ethers.getSigners();
        const N = 10;

        const gasUsedPerTx = [];
        const txCostsWei   = [];

        for (let i = 1; i <= N; i++) {
            const name = `ExtraCandidate${i}`;
            const addr = ethers.Wallet.createRandom().address;
            const tx   = await tornado.connect(owner).addCandidate(name, addr);
            const rc   = await tx.wait();

            const gasUsed   = rc.gasUsed;
            const gasPrice  = rc.effectiveGasPrice || rc.gasPrice;
            const txCostWei = gasUsed.mul(gasPrice);

            gasUsedPerTx.push(gasUsed);
            txCostsWei.push(txCostWei);
            console.log(`🧾 addCandidate(${name}) gasUsed: ${gasUsed.toString()}`);
        }

        const totalGas     = gasUsedPerTx.reduce((a, g) => a.add(g), ethers.BigNumber.from(0));
        const totalCostWei = txCostsWei.reduce((a, c) => a.add(c),   ethers.BigNumber.from(0));
        const avgGas       = totalGas.div(N);

        console.log("📊 Total gas (10 addCandidate calls):", totalGas.toString());
        console.log("📈 Avg gas per addCandidate:",          avgGas.toString());
        console.log("💰 Total cost (ETH):",                  ethers.utils.formatEther(totalCostWei));
    });
});