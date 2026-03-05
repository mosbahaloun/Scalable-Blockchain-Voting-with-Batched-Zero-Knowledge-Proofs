// SPDX-License-Identifier: NONE
const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const wc = require("../circuit/witness_calculator");
const $u = require("../utils/$u.js");
const snarkjs = require("snarkjs");
const { mimc5Sponge } = require("../utils/mimc5.js");

describe("Full Test: 40 deposits, 10 batch withdrawals (4×), with addCandidate", function () {
    let hasher, verifier, tornado, witnessCalc;
    const depositValue = ethers.utils.parseEther("0.01");

    // ---- constants (4× batch) ----
    const BATCH = 4;  // 4-batch withdrawals
    const TOTAL_DEPOSITS = 40; // Keep 40 deposits
    const NUM_BATCHES = Math.floor(TOTAL_DEPOSITS / BATCH); // 40 / 4 = 10 full batches

    const depositWasm = path.join(__dirname, "../utils/batch_deposit_1.wasm");
    // 4-note withdraw circuit artifacts
    const withdrawWasm = path.join(__dirname, "../utils/BatchWithdraw_4.wasm");
    const zkey = path.join(__dirname, "../utils/setup4_final.zkey");

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

    before(async () => {
        // Hasher
        const Hasher = await ethers.getContractFactory("Hasher");
        hasher = await Hasher.deploy();
        await hasher.deployed();

        // Verifier compiled for the 16× withdraw circuit (48 public signals)
        const Verifier = await ethers.getContractFactory("Groth16Verifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();

        // Main contract
        const Tornado = await ethers.getContractFactory("Tornado");
        const [owner] = await ethers.getSigners();
        tornado = await Tornado.deploy(
            hasher.address,
            verifier.address,
            ["Alice"],
            [owner.address]
        );
        await tornado.deployed();

        // deposit witness calculator
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

    it("should perform 40 deposits and 10 batch withdrawals (BATCH=4)", async () => {
        const [user] = await ethers.getSigners();

        // timing & gas buckets
        const depositInclMs = [];
        const depositWitnessMs = [];
        const merklePathMs = [];
        const depositMinedNs = [];

        const withdrawProofMs = [];
        const withdrawInclMs = [];
        const batchWaitMs = [];
        const batchEndToEndMs = [];

        const depositGasReceipts = [];
        const withdrawGasReceipts = [];

        const decodedEvents = [];
        const decryptedProofs = [];

        // ---- 40 deposits ----
        for (let t = 0; t < TOTAL_DEPOSITS; t++) {
            const secret = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString();
            const nullifier = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString();

            const depInput = {
                secret: $u.BN256ToBin(secret).split(""),
                nullifier: $u.BN256ToBin(nullifier).split("")
            };

            const wStart = nowNs();
            const witness = await witnessCalc.calculateWitness(depInput, 0);
            const wEnd = nowNs();
            depositWitnessMs.push(nsToMs(wEnd - wStart));

            const commitment = BigInt(witness[1]);
            const nullifierHash = BigInt(witness[2]);

            let idx = Number(await tornado.nextLeafIdx());
            let currentHash = commitment;
            const key = commitment;

            const hashPairings = [];
            const pairDirection = [];

            const mStart = nowNs();
            for (let i = 0; i < 10; i++) {
                const isLeft = idx % 2 === 0;
                const sibling = levelDefaults[i];
                const left = isLeft ? currentHash : sibling;
                const right = isLeft ? sibling : currentHash;

                hashPairings.push(sibling);
                pairDirection.push(isLeft ? 0 : 1);

                currentHash = mimc5Sponge([left, right], key);
                idx = Math.floor(idx / 2);
            }
            const mEnd = nowNs();
            merklePathMs.push(nsToMs(mEnd - mStart));

            const newRoot = currentHash;

            const dStart = nowNs();
            const tx = await tornado.deposit(
                commitment,
                newRoot,
                hashPairings,
                pairDirection,
                { value: depositValue }
            );
            const receipt = await tx.wait();
            const dEnd = nowNs();

            expect(receipt.status).to.equal(1);
            console.log(`✅ Deposit ${t + 1} Gas Used:`, receipt.gasUsed.toString());

            depositInclMs.push(nsToMs(dEnd - dStart));
            depositMinedNs.push(dEnd);
            depositGasReceipts.push(receipt.gasUsed);

            decodedEvents.push({ root: newRoot.toString(), hashPairings, pairDirection });
            decryptedProofs.push({ secret, nullifier, nullifierHash: nullifierHash.toString() });
        }

        // ---- 10 batches (withdrawals of 4 each) ----
        for (let i = 0; i < NUM_BATCHES; i++) {
            const sliceStart = i * BATCH;
            const sliceEnd = sliceStart + BATCH;

            const batchDecoded = decodedEvents.slice(sliceStart, sliceEnd);
            const batchProofs = decryptedProofs.slice(sliceStart, sliceEnd);

            const recipientBig = BigInt(user.address.toLowerCase());

            const proofInput = {
                root: batchDecoded.map(e => $u.BNToDecimal(e.root)),
                nullifierHash: batchProofs.map(p => p.nullifierHash),
                recipient: Array(BATCH).fill(recipientBig.toString()),
                secret: batchProofs.map(p => $u.BN256ToBin(p.secret).split("")),
                nullifier: batchProofs.map(p => $u.BN256ToBin(p.nullifier).split("")),
                hashPairings: batchDecoded.map(e => e.hashPairings.map($u.BNToDecimal)),
                hashDirections: batchDecoded.map(e => e.pairDirection)
            };

            const pStart = nowNs();
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(proofInput, withdrawWasm, zkey);
            const pEnd = nowNs();
            withdrawProofMs.push(nsToMs(pEnd - pStart));

            // Expect 12 public signals: 4 roots, 4 nullifierHashes, 4 recipients
            if (publicSignals.length !== 3 * BATCH) {
                throw new Error(`expected ${3 * BATCH} public signals, got ${publicSignals.length}`);
            }

            const a = proof.pi_a.slice(0, 2).map($u.BN256ToHex);
            const b = proof.pi_b.slice(0, 2).map(row => $u.reverseCoordinate(row.map($u.BN256ToHex)));
            const c = proof.pi_c.slice(0, 2).map($u.BN256ToHex);

            // [roots(16) | nullifiers(16) | recipients(16)]
            const input = [
                ...publicSignals.slice(0, BATCH),
                ...publicSignals.slice(BATCH, 2 * BATCH),
                ...publicSignals.slice(2 * BATCH, 3 * BATCH),
            ];

            const recipients = publicSignals
                .slice(2 * BATCH, 3 * BATCH)
                .map(v => ethers.utils.getAddress("0x" + BigInt(v).toString(16).padStart(40, "0")));

            if (recipients.length !== BATCH) {
                throw new Error(`expected ${BATCH} recipients, got ${recipients.length}`);
            }

            const batchReadyNs = bigIntMax(depositMinedNs.slice(sliceStart, sliceEnd));

            const wStart = nowNs();
            const withdrawTx = await tornado.withdraw(a, b, c, input, recipients);
            const wSubmitNs = wStart;
            const withdrawReceipt = await withdrawTx.wait();
            const wEnd = nowNs();

            expect(withdrawReceipt.status).to.equal(1);
            console.log(`✅ Withdraw ${i + 1} Gas Used:`, withdrawReceipt.gasUsed.toString());

            withdrawInclMs.push(nsToMs(wEnd - wSubmitNs));
            batchWaitMs.push(nsToMs(wSubmitNs - batchReadyNs));
            batchEndToEndMs.push(nsToMs(wEnd - batchReadyNs));

            withdrawGasReceipts.push({ gasUsed: withdrawReceipt.gasUsed, gasPrice: withdrawTx.gasPrice });
        }

        // ---- totals (gas) ----
        let totalGas = ethers.BigNumber.from(0);
        for (const g of depositGasReceipts) totalGas = totalGas.add(g);
        for (const { gasUsed } of withdrawGasReceipts) totalGas = totalGas.add(gasUsed);
        console.log("📊 Total Gas Used (40 deposits + 10 withdrawals of 4):", totalGas.toString());

        const avgGasPrice = withdrawGasReceipts.reduce(
            (sum, { gasPrice }) => sum.add(gasPrice),
            ethers.BigNumber.from(0)
        ).div(withdrawGasReceipts.length);
        const totalEthCost = ethers.utils.formatEther(totalGas.mul(avgGasPrice));
        const ethToGbp = 2400;
        const totalGbpCost = (parseFloat(totalEthCost) * ethToGbp).toFixed(2);
        console.log("💷 Estimated GBP Cost:", `£${totalGbpCost}`);

        // ---- timing summaries ----
        printStats("Deposit witness (deposit circuit)", depositWitnessMs);
        printStats("Merkle path compute (MiMC)", merklePathMs);
        printStats("Deposit inclusion (submit→mined)", depositInclMs);
        printStats("Withdraw proof gen (batch of 4)", withdrawProofMs);
        printStats("Withdraw inclusion (submit→mined)", withdrawInclMs);
        printStats("Batch wait (ready→submit withdraw)", batchWaitMs);
        printStats("Batch end-to-end (ready→withdraw mined)", batchEndToEndMs);
    });

    it("measures gas for 40 addVoter calls", async () => {
        const [owner] = await ethers.getSigners();
        const N = 40;  // Keep at 40

        const gasUsedPerTx = [];
        const txCostsWei = [];

        for (let i = 1; i <= N; i++) {
            const nid = `NID-${i}`;
            const tx = await tornado.connect(owner).addVoter(nid);
            const rc = await tx.wait();

            const gasUsed = rc.gasUsed;
            const gasPrice = rc.effectiveGasPrice || rc.gasPrice;
            const txCostWei = gasUsed.mul(gasPrice);

            gasUsedPerTx.push(gasUsed);
            txCostsWei.push(txCostWei);

            console.log(`🧾 addVoter(${nid}) gasUsed: ${gasUsed.toString()}`);
        }

        const totalGas = gasUsedPerTx.reduce((a, g) => a.add(g), ethers.BigNumber.from(0));
        const totalCostWei = txCostsWei.reduce((a, c) => a.add(c), ethers.BigNumber.from(0));
        const avgGas = totalGas.div(N);

        console.log("📊 Total gas (40 addVoter calls):", totalGas.toString());
        console.log("📈 Avg gas per addVoter:", avgGas.toString());
        console.log("💰 Total cost (ETH):", ethers.utils.formatEther(totalCostWei));
    });
});