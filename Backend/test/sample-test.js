// SPDX-License-Identifier: NONE
const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const wc = require("../circuit/witness_calculator");
const $u = require("../utils/$u.js");
const snarkjs = require("snarkjs");
const { mimc5Sponge } = require("../utils/mimc5.js");

describe("Full Test: 32 vote commitments (2×16), 2 vote submissions (16×), 2 recovery token batches (16×), with addCandidate", function () {
    let hasher, verifier, tornado, witnessCalc;
    let eaWallet;   // Simulated Election Authority signer

    // ---- constants ----
    const BATCH_SIZE     = 16;
    const TOTAL_VOTERS   = 32;                           // 2 × 16
    const NUM_COMMIT_TXS = TOTAL_VOTERS / BATCH_SIZE;   // 2 voteCommitment transactions
    const NUM_SUBMIT_TXS = TOTAL_VOTERS / BATCH_SIZE;   // 2 voteSubmission transactions

    const depositValue     = ethers.utils.parseEther("0.01");
    const batchCommitValue = depositValue.mul(BATCH_SIZE); // 0.16 ETH per voteCommitment

    const depositWasm  = path.join(__dirname, "../utils/batch_deposit_16.wasm");
    const withdrawWasm = path.join(__dirname, "../utils/BatchWithdraw_16.wasm");
    const zkey         = path.join(__dirname, "../utils/setup16_final.zkey");

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
    // buildSigBuffer — produces the packed 65-byte-per-sig calldata
    // expected by recoveryToken: [v(1)|r(32)|s(32)] × 16
    // ethers.Wallet.signMessage returns r(32)|s(32)|v(1); we repack.
    // ----------------------------------------------------------------
    async function buildSigBuffer(signer, uniqueIds, voterPubKeys) {
        const total = new Uint8Array(65 * uniqueIds.length);
        for (let i = 0; i < uniqueIds.length; i++) {
            const msgHash = ethers.utils.keccak256(
                ethers.utils.concat([uniqueIds[i], voterPubKeys[i]])
            );
            const sig      = await signer.signMessage(ethers.utils.arrayify(msgHash));
            const sigBytes = ethers.utils.arrayify(sig); // 65 bytes: r|s|v
            const base = i * 65;
            total[base]     = sigBytes[64];                   // v
            total.set(sigBytes.slice(0, 32),  base + 1);     // r
            total.set(sigBytes.slice(32, 64), base + 33);    // s
        }
        return total;
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

        const Verifier = await ethers.getContractFactory("Groth16Verifier");
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
    // Test 1: voteCommitment — 2 txs of 16 notes each
    //         voteSubmission — 2 txs of 16 notes each
    // ================================================================
    it("should perform 2 voteCommitment txs (16 notes each) and 2 voteSubmission txs (BATCH=16)", async () => {
        const [user] = await ethers.getSigners();

        const commitWitnessMs    = [];
        const merklePathMs       = [];
        const commitInclMs       = [];
        const commitMinedNs      = [];
        const submitProofMs      = [];
        const submitInclMs       = [];
        const batchWaitMs        = [];
        const batchEndToEndMs    = [];
        const commitGasReceipts  = [];
        const submitGasReceipts  = [];
        const allDecodedEvents   = [];
        const allDecryptedProofs = [];

        // ---- 2 voteCommitment transactions (16 notes each = 32 voters total) ----
        for (let batchIdx = 0; batchIdx < NUM_COMMIT_TXS; batchIdx++) {
            const secrets    = [];
            const nullifiers = [];
            for (let k = 0; k < BATCH_SIZE; k++) {
                secrets.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString());
                nullifiers.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString());
            }

            const depInput = {
                secret:    secrets.map(s => $u.BN256ToBin(s).split("")),
                nullifier: nullifiers.map(n => $u.BN256ToBin(n).split(""))
            };

            const wStart = nowNs();
            // witness[1..16]  = commitment[0..15]
            // witness[17..32] = nullifierHash[0..15]
            const witness = await witnessCalc.calculateWitness(depInput, 0);
            const wEnd = nowNs();
            commitWitnessMs.push(nsToMs(wEnd - wStart));

            const commitments     = Array.from({ length: BATCH_SIZE }, (_, k) => BigInt(witness[1 + k]));
            const nullifierHashes = Array.from({ length: BATCH_SIZE }, (_, k) => BigInt(witness[1 + BATCH_SIZE + k]));

            const batchNewRoots       = [];
            const batchHashPairings   = [];
            const batchPairDirections = [];

            const mStart = nowNs();
            for (let k = 0; k < BATCH_SIZE; k++) {
                let idx = Number(await tornado.nextLeafIdx()) + k;
                let currentHash = commitments[k];
                const key = commitments[k];
                const hashPairings  = [];
                const pairDirection = [];

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
                batchNewRoots.push(currentHash);
                batchHashPairings.push(hashPairings);
                batchPairDirections.push(pairDirection);
            }
            const mEnd = nowNs();
            merklePathMs.push(nsToMs(mEnd - mStart));

            // Level-major [10][16] for Solidity uint256[16][10] / uint8[16][10]
            const solHashPairings   = Array.from({ length: 10 }, (_, level) =>
                batchHashPairings.map(p => p[level])
            );
            const solPairDirections = Array.from({ length: 10 }, (_, level) =>
                batchPairDirections.map(p => p[level])
            );

            const dStart = nowNs();
            const tx = await tornado.voteCommitment(
                commitments.map(c => c.toString()),
                batchNewRoots.map(r => r.toString()),
                solHashPairings.map(row => row.map(v => v.toString())),
                solPairDirections,
                { value: batchCommitValue }
            );
            const receipt = await tx.wait();
            const dEnd = nowNs();

            expect(receipt.status).to.equal(1);
            console.log(
                `✅ voteCommitment ${batchIdx + 1} (voters ${batchIdx * 16 + 1}–${batchIdx * 16 + 16}) Gas Used:`,
                receipt.gasUsed.toString()
            );

            commitInclMs.push(nsToMs(dEnd - dStart));
            commitMinedNs.push(dEnd);
            commitGasReceipts.push(receipt.gasUsed);

            for (let k = 0; k < BATCH_SIZE; k++) {
                allDecodedEvents.push({
                    root: batchNewRoots[k].toString(),
                    hashPairings: batchHashPairings[k],
                    pairDirection: batchPairDirections[k]
                });
                allDecryptedProofs.push({
                    secret: secrets[k],
                    nullifier: nullifiers[k],
                    nullifierHash: nullifierHashes[k].toString()
                });
            }
        }

        // ---- 2 voteSubmission transactions (16 notes each) ----
        for (let i = 0; i < NUM_SUBMIT_TXS; i++) {
            const sliceStart = i * BATCH_SIZE;
            const sliceEnd   = sliceStart + BATCH_SIZE;

            const batchDecoded = allDecodedEvents.slice(sliceStart, sliceEnd);
            const batchProofs  = allDecryptedProofs.slice(sliceStart, sliceEnd);
            const recipientBig = BigInt(user.address.toLowerCase());

            const proofInput = {
                root:           batchDecoded.map(e => $u.BNToDecimal(e.root)),
                nullifierHash:  batchProofs.map(p => p.nullifierHash),
                recipient:      Array(BATCH_SIZE).fill(recipientBig.toString()),
                secret:         batchProofs.map(p => $u.BN256ToBin(p.secret).split("")),
                nullifier:      batchProofs.map(p => $u.BN256ToBin(p.nullifier).split("")),
                hashPairings:   batchDecoded.map(e => e.hashPairings.map($u.BNToDecimal)),
                hashDirections: batchDecoded.map(e => e.pairDirection)
            };

            const pStart = nowNs();
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(proofInput, withdrawWasm, zkey);
            const pEnd = nowNs();
            submitProofMs.push(nsToMs(pEnd - pStart));

            if (publicSignals.length !== 3 * BATCH_SIZE)
                throw new Error(`expected ${3 * BATCH_SIZE} public signals, got ${publicSignals.length}`);

            const a = proof.pi_a.slice(0, 2).map($u.BN256ToHex);
            const b = proof.pi_b.slice(0, 2).map(row => $u.reverseCoordinate(row.map($u.BN256ToHex)));
            const c = proof.pi_c.slice(0, 2).map($u.BN256ToHex);

            const input = [
                ...publicSignals.slice(0, BATCH_SIZE),
                ...publicSignals.slice(BATCH_SIZE, 2 * BATCH_SIZE),
                ...publicSignals.slice(2 * BATCH_SIZE, 3 * BATCH_SIZE),
            ];

            const recipients = publicSignals
                .slice(2 * BATCH_SIZE, 3 * BATCH_SIZE)
                .map(v => ethers.utils.getAddress("0x" + BigInt(v).toString(16).padStart(40, "0")));

            if (recipients.length !== BATCH_SIZE)
                throw new Error(`expected ${BATCH_SIZE} recipients, got ${recipients.length}`);

            const commitTxIndices = Array.from({ length: BATCH_SIZE }, (_, k) =>
                Math.floor((sliceStart + k) / BATCH_SIZE)
            );
            const batchReadyNs = bigIntMax(commitTxIndices.map(idx => commitMinedNs[idx]));

            const wStart  = nowNs();
            const submitTx = await tornado.voteSubmission(a, b, c, input, recipients);
            const wSubmitNs = wStart;
            const submitReceipt = await submitTx.wait();
            const wEnd = nowNs();

            expect(submitReceipt.status).to.equal(1);
            console.log(`✅ voteSubmission ${i + 1} Gas Used:`, submitReceipt.gasUsed.toString());

            submitInclMs.push(nsToMs(wEnd - wSubmitNs));
            batchWaitMs.push(nsToMs(wSubmitNs - batchReadyNs));
            batchEndToEndMs.push(nsToMs(wEnd - batchReadyNs));
            submitGasReceipts.push({ gasUsed: submitReceipt.gasUsed, gasPrice: submitTx.gasPrice });
        }

        // ---- gas totals ----
        let totalGas = ethers.BigNumber.from(0);
        for (const g of commitGasReceipts)           totalGas = totalGas.add(g);
        for (const { gasUsed } of submitGasReceipts) totalGas = totalGas.add(gasUsed);
        console.log("📊 Total Gas Used (2 voteCommitment of 16 + 2 voteSubmission of 16):", totalGas.toString());

        const avgGasPrice = submitGasReceipts
            .reduce((sum, { gasPrice }) => sum.add(gasPrice), ethers.BigNumber.from(0))
            .div(submitGasReceipts.length);
        const totalEthCost = ethers.utils.formatEther(totalGas.mul(avgGasPrice));
        const totalGbpCost = (parseFloat(totalEthCost) * 2400).toFixed(2);
        console.log("💷 Estimated GBP Cost:", `£${totalGbpCost}`);

        printStats("voteCommitment witness (BatchDeposit16 circuit, 16 notes)", commitWitnessMs);
        printStats("Merkle path compute (MiMC, 16 paths per batch)",            merklePathMs);
        printStats("voteCommitment inclusion (submit→mined, 2 txs)",            commitInclMs);
        printStats("voteSubmission proof gen (batch of 16)",                    submitProofMs);
        printStats("voteSubmission inclusion (submit→mined)",                   submitInclMs);
        printStats("Batch wait (ready→submit voteSubmission)",                  batchWaitMs);
        printStats("Batch end-to-end (ready→voteSubmission mined)",             batchEndToEndMs);
    });

    // ================================================================
    // Test 2: recoveryToken — 2 batches of 16 (32 voters total)
    //
    // For each voter the EA signs (uniqueId, voterPubKey).
    // The contract verifies the signature then stores
    //   H_i = keccak256(recToken_i || voterPubKey_i)
    // in a single 32-byte slot — hash-based storage that gives
    // recovery tokens their superior gas scaling vs. voter commitments.
    // ================================================================
    it("measures gas for 2 × recoveryToken calls (BATCH=16, 32 voters total)", async () => {
        const [owner] = await ethers.getSigners();
        const NUM_RECOVERY_BATCHES = 2; // 2 × 16 = 32 voters

        const recoveryGasReceipts = [];
        const recoveryInclMs      = [];

        for (let batch = 0; batch < NUM_RECOVERY_BATCHES; batch++) {
            const uniqueIds    = Array.from({ length: 16 }, () =>
                ethers.utils.hexZeroPad(ethers.utils.randomBytes(32), 32)
            );
            const recTokens    = Array.from({ length: 16 }, () =>
                ethers.utils.hexZeroPad(ethers.utils.randomBytes(32), 32)
            );
            const voterPubKeys = Array.from({ length: 16 }, () =>
                ethers.utils.hexZeroPad(ethers.utils.randomBytes(32), 32)
            );

            // EA signs each (uniqueId, voterPubKey) pair; pack into v|r|s buffer
            const sigBuffer = await buildSigBuffer(eaWallet, uniqueIds, voterPubKeys);

            const dStart = nowNs();
            const tx = await tornado.connect(owner).recoveryToken(
                uniqueIds,
                recTokens,
                voterPubKeys,
                sigBuffer
            );
            const receipt = await tx.wait();
            const dEnd = nowNs();

            expect(receipt.status).to.equal(1);
            console.log(
                `✅ recoveryToken batch ${batch + 1}` +
                ` (voters ${batch * 16 + 1}–${batch * 16 + 16}) Gas Used:`,
                receipt.gasUsed.toString()
            );

            recoveryGasReceipts.push(receipt.gasUsed);
            recoveryInclMs.push(nsToMs(dEnd - dStart));
        }

        const totalGas = recoveryGasReceipts.reduce(
            (acc, g) => acc.add(g), ethers.BigNumber.from(0)
        );
        console.log("📊 Total gas (2 × recoveryToken of 16):", totalGas.toString());
        console.log("📈 Avg gas per call (16 tokens):",         totalGas.div(NUM_RECOVERY_BATCHES).toString());
        console.log("📈 Avg gas per token:",                    totalGas.div(NUM_RECOVERY_BATCHES * 16).toString());

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