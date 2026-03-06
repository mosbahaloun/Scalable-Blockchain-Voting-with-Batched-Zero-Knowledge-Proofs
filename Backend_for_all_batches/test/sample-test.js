// SPDX-License-Identifier: NONE
// Combined test: 1×, 4×, 8×, 16× batch sizes in a single run.
// Each batch size deploys its own Tornado + Groth16Verifier + Hasher.
// Contracts:  Tornado_1, Tornado_4, Tornado_8, Tornado_16
// Verifiers:  Groth16Verifier_1_batches, Groth16Verifier_4_batches,
//             Groth16Verifier_8_batches, Groth16Verifier_16_batches
// Utils folder layout (wasm / zkey):
//   batch_deposit_1.wasm  /  setup_1_final.zkey  /  BatchWithdraw_1.wasm
//   batch_deposit_4.wasm  /  setup_4_final.zkey  /  BatchWithdraw_4.wasm
//   batch_deposit_8.wasm  /  setup_8_final.zkey  /  BatchWithdraw_8.wasm
//   batch_deposit_16.wasm /  setup16_final.zkey  /  BatchWithdraw_16.wasm

const { expect } = require("chai");
const { ethers }  = require("hardhat");
const fs   = require("fs");
const path = require("path");
const wc   = require("../circuit/witness_calculator");
const $u   = require("../utils/$u.js");
const snarkjs = require("snarkjs");
const { mimc5Sponge } = require("../utils/mimc5.js");

// ============================================================
// Shared constants
// ============================================================
const DENOMINATION = ethers.utils.parseEther("0.01");
const ETH_TO_GBP   = 2400;

const LEVEL_DEFAULTS = [
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

// Per-batch-size config ─ one entry per variant
const BATCH_CONFIGS = [
    {
        label:           "1×",
        batchSize:       1,
        totalVoters:     40,
        depositWasm:     "../utils/batch_deposit_1.wasm",
        withdrawWasm:    path.join(__dirname, "../utils/BatchWithdraw_1.wasm"),
        zkey:            path.join(__dirname, "../utils/setup_1_final.zkey"),
        tornadoContract: "Tornado_1",
        verifierContract:"Groth16Verifier_1_batches",
        publicSignalCount: 3,   // 1*3
        inputCount:        3,
    },
    {
        label:           "4×",
        batchSize:       4,
        totalVoters:     40,
        depositWasm:     "../utils/batch_deposit_4.wasm",
         withdrawWasm:    path.join(__dirname, "../utils/BatchWithdraw_4.wasm"),
        zkey:            path.join(__dirname, "../utils/setup_4_final.zkey"),
        tornadoContract: "Tornado_4",
        verifierContract:"Groth16Verifier_4_batches",
        publicSignalCount: 12,  // 4*3
        inputCount:        12,
    },
    {
        label:           "8×",
        batchSize:       8,
        totalVoters:     40,
        depositWasm:     "../utils/batch_deposit_8.wasm",
         withdrawWasm:    path.join(__dirname, "../utils/BatchWithdraw_8.wasm"),
        zkey:            path.join(__dirname, "../utils/setup_8_final.zkey"),
        tornadoContract: "Tornado_8",
        verifierContract:"Groth16Verifier_8_batches",
        publicSignalCount: 24,  // 8*3
        inputCount:        24,
    },
    {
        label:           "16×",
        batchSize:       16,
        totalVoters:     32,   // must be divisible by 16
        depositWasm:     "../utils/batch_deposit_16.wasm",
   withdrawWasm:    path.join(__dirname, "../utils/BatchWithdraw_16.wasm"),
        zkey:            path.join(__dirname, "../utils/setup_16_final.zkey"),
        tornadoContract: "Tornado_16",
        verifierContract:"Groth16Verifier_16_batches",
        publicSignalCount: 48,  // 16*3
        inputCount:        48,
    },
];

// ============================================================
// Shared timing / stats helpers
// ============================================================
const nowNs  = () => process.hrtime.bigint();
const nsToMs = (ns) => Number(ns) / 1e6;

function computeStats(msArray) {
    if (!msArray.length) return { n: 0, mean: NaN, p50: NaN, p90: NaN, p99: NaN };
    const a    = [...msArray].sort((x, y) => x - y);
    const n    = a.length;
    const mean = a.reduce((s, v) => s + v, 0) / n;
    const q    = (p) => {
        const idx = (n - 1) * p, lo = Math.floor(idx), hi = Math.ceil(idx);
        return lo === hi ? a[lo] : a[lo] + (a[hi] - a[lo]) * (idx - lo);
    };
    return { n, mean, p50: q(0.5), p90: q(0.9), p99: q(0.99) };
}
function printStats(label, msArray) {
    const s   = computeStats(msArray);
    const fmt = (x) => Number.isFinite(x) ? x.toFixed(2) : "—";
    console.log(`  ⏱ ${label}: n=${s.n}  mean=${fmt(s.mean)}ms  p50=${fmt(s.p50)}ms  p90=${fmt(s.p90)}ms  p99=${fmt(s.p99)}ms`);
}
const bigIntMax = (arr) => arr.reduce((m, v) => (v > m ? v : m));

// ============================================================
// buildSigBuffer
// Produces packed [v(1)|r(32)|s(32)] × count bytes.
// Works for both single (count=1, scalar args) and batch (arrays).
// ============================================================
async function buildSigBuffer(signer, uniqueIds, voterPubKeys) {
    // Normalise to arrays so the same function handles 1× and batch
    const ids  = Array.isArray(uniqueIds)    ? uniqueIds    : [uniqueIds];
    const pks  = Array.isArray(voterPubKeys) ? voterPubKeys : [voterPubKeys];
    const total = new Uint8Array(65 * ids.length);
    for (let i = 0; i < ids.length; i++) {
        const msgHash  = ethers.utils.keccak256(ethers.utils.concat([ids[i], pks[i]]));
        const sig      = await signer.signMessage(ethers.utils.arrayify(msgHash));
        const sigBytes = ethers.utils.arrayify(sig);
        const base     = i * 65;
        total[base]    = sigBytes[64];
        total.set(sigBytes.slice(0, 32),  base + 1);
        total.set(sigBytes.slice(32, 64), base + 33);
    }
    return total;
}

// ============================================================
// deployForBatch — deploy Hasher + verifier + Tornado for one config
// ============================================================
async function deployForBatch(cfg, owner, eaWallet) {
    const Hasher = await ethers.getContractFactory("Hasher");
    const hasher = await Hasher.deploy();
    await hasher.deployed();

    const Verifier = await ethers.getContractFactory(cfg.verifierContract);
    const verifier = await Verifier.deploy();
    await verifier.deployed();

    const Tornado = await ethers.getContractFactory(cfg.tornadoContract);
    const tornado = await Tornado.deploy(
        hasher.address,
        verifier.address,
        ["Alice"],
        [owner.address]
    );
    await tornado.deployed();

    // Register EA
    await (await tornado.connect(owner).setElectionAuthority(eaWallet.address)).wait();

    // Add 10 candidates and record gas
    let totalCandidateGas = ethers.BigNumber.from(0);
    for (let i = 1; i <= 10; i++) {
        const tx = await tornado.connect(owner).addCandidate(
            `Candidate${i}`,
            ethers.Wallet.createRandom().address
        );
        const rc = await tx.wait();
        totalCandidateGas = totalCandidateGas.add(rc.gasUsed);
    }

    console.log(`  [${cfg.label}] Hasher deployed:   ${hasher.address}  gas: 772,734 (constant)`);
    console.log(`  [${cfg.label}] Verifier deployed: ${verifier.address}`);
    console.log(`  [${cfg.label}] Tornado deployed:  ${tornado.address}`);
    console.log(`  [${cfg.label}] 10 candidates added, total gas: ${totalCandidateGas.toString()}`);

    return { hasher, verifier, tornado, totalCandidateGas };
}

// ============================================================
// runVoteCommitmentAndSubmission
// Handles BOTH 1× (scalar contract API) and batch (array API).
// ============================================================
async function runVoteCommitmentAndSubmission(cfg, tornado, witnessCalc, user) {
    const { batchSize, totalVoters, withdrawWasm, zkey, publicSignalCount } = cfg;
    const numCommitTxs = totalVoters / batchSize;
    const numSubmitTxs = totalVoters / batchSize;
    const batchValue   = DENOMINATION.mul(batchSize);

    const commitWitnessMs    = [];
    const merklePathMs       = [];
    const commitInclMs       = [];
    const commitMinedNs      = [];
    const submitProofMs      = [];
    const submitInclMs       = [];
    const waitMs             = [];
    const endToEndMs         = [];
    const commitGasReceipts  = [];
    const submitGasReceipts  = [];
    const allDecodedEvents   = [];
    const allDecryptedProofs = [];

    // ─── voteCommitment transactions ───────────────────────────────
    for (let batchIdx = 0; batchIdx < numCommitTxs; batchIdx++) {

        // Generate secrets / nullifiers
        const secrets    = Array.from({ length: batchSize }, () =>
            ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString()
        );
        const nullifiers = Array.from({ length: batchSize }, () =>
            ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString()
        );

        // Build circuit input (arrays for batch, flat for 1×)
        const depInput = batchSize === 1
            ? {
                secret:   $u.BN256ToBin(secrets[0]).split(""),
                nullifier: $u.BN256ToBin(nullifiers[0]).split("")
              }
            : {
                secret:   secrets.map(s => $u.BN256ToBin(s).split("")),
                nullifier: nullifiers.map(n => $u.BN256ToBin(n).split(""))
              };

        const wStart  = nowNs();
        const witness = await witnessCalc.calculateWitness(depInput, 0);
        const wEnd    = nowNs();
        commitWitnessMs.push(nsToMs(wEnd - wStart));

        // Extract commitments + nullifierHashes from witness
        // 1×:  witness[1]=commitment, witness[2]=nullifierHash
        // N×:  witness[1..N]=commitments, witness[N+1..2N]=nullifierHashes
        const commitments     = Array.from({ length: batchSize }, (_, k) =>
            BigInt(witness[1 + k])
        );
        const nullifierHashes = Array.from({ length: batchSize }, (_, k) =>
            BigInt(witness[1 + batchSize + k])
        );

        // Compute Merkle paths
        const batchNewRoots       = [];
        const batchHashPairings   = [];
        const batchPairDirections = [];

        const mStart = nowNs();
        for (let k = 0; k < batchSize; k++) {
            let idx = Number(await tornado.nextLeafIdx()) + k;
            let currentHash = commitments[k];
            const key = commitments[k];
            const hp  = [];
            const pd  = [];

            for (let level = 0; level < 10; level++) {
                const isLeft  = idx % 2 === 0;
                const sibling = LEVEL_DEFAULTS[level];
                const left    = isLeft ? currentHash : sibling;
                const right   = isLeft ? sibling    : currentHash;
                hp.push(sibling);
                pd.push(isLeft ? 0 : 1);
                currentHash = mimc5Sponge([left, right], key);
                idx = Math.floor(idx / 2);
            }
            batchNewRoots.push(currentHash);
            batchHashPairings.push(hp);
            batchPairDirections.push(pd);
        }
        const mEnd = nowNs();
        merklePathMs.push(nsToMs(mEnd - mStart));

        // Submit voteCommitment
        let tx;
        const dStart = nowNs();

        if (batchSize === 1) {
            // Single-note API: scalars
            tx = await tornado.voteCommitment(
                commitments[0].toString(),
                batchNewRoots[0].toString(),
                batchHashPairings[0],
                batchPairDirections[0],
                { value: batchValue }
            );
        } else {
            // Batch API: level-major [10][N] arrays
            const solHashPairings   = Array.from({ length: 10 }, (_, level) =>
                batchHashPairings.map(p => p[level])
            );
            const solPairDirections = Array.from({ length: 10 }, (_, level) =>
                batchPairDirections.map(p => p[level])
            );
            tx = await tornado.voteCommitment(
                commitments.map(c => c.toString()),
                batchNewRoots.map(r => r.toString()),
                solHashPairings.map(row => row.map(v => v.toString())),
                solPairDirections,
                { value: batchValue }
            );
        }

        const receipt = await tx.wait();
        const dEnd    = nowNs();
        expect(receipt.status).to.equal(1);

        const voterStart = batchIdx * batchSize + 1;
        const voterEnd   = voterStart + batchSize - 1;
        console.log(
            `  [${cfg.label}] voteCommitment ${batchIdx + 1}` +
            ` (voters ${voterStart}–${voterEnd}) gas: ${receipt.gasUsed.toString()}`
        );

        commitInclMs.push(nsToMs(dEnd - dStart));
        commitMinedNs.push(dEnd);
        commitGasReceipts.push(receipt.gasUsed);

        for (let k = 0; k < batchSize; k++) {
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

    // ─── voteSubmission transactions ───────────────────────────────
    for (let i = 0; i < numSubmitTxs; i++) {
        const sliceStart = i * batchSize;
        const sliceEnd   = sliceStart + batchSize;

        const batchDecoded = allDecodedEvents.slice(sliceStart, sliceEnd);
        const batchProofs  = allDecryptedProofs.slice(sliceStart, sliceEnd);
        const recipientBig = BigInt(user.address.toLowerCase());

        // Build proof input (scalar for 1×, arrays for batch)
        let proofInput;
        if (batchSize === 1) {
            proofInput = {
                root:           $u.BNToDecimal(batchDecoded[0].root),
                nullifierHash:  batchProofs[0].nullifierHash,
                recipient:      recipientBig.toString(),
                secret:         $u.BN256ToBin(batchProofs[0].secret).split(""),
                nullifier:      $u.BN256ToBin(batchProofs[0].nullifier).split(""),
                hashPairings:   batchDecoded[0].hashPairings.map($u.BNToDecimal),
                hashDirections: batchDecoded[0].pairDirection
            };
        } else {
            proofInput = {
                root:           batchDecoded.map(e => $u.BNToDecimal(e.root)),
                nullifierHash:  batchProofs.map(p => p.nullifierHash),
                recipient:      Array(batchSize).fill(recipientBig.toString()),
                secret:         batchProofs.map(p => $u.BN256ToBin(p.secret).split("")),
                nullifier:      batchProofs.map(p => $u.BN256ToBin(p.nullifier).split("")),
                hashPairings:   batchDecoded.map(e => e.hashPairings.map($u.BNToDecimal)),
                hashDirections: batchDecoded.map(e => e.pairDirection)
            };
        }

        const pStart = nowNs();
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            proofInput, withdrawWasm, zkey
        );
        const pEnd = nowNs();
        submitProofMs.push(nsToMs(pEnd - pStart));

        if (publicSignals.length !== publicSignalCount)
            throw new Error(`[${cfg.label}] expected ${publicSignalCount} public signals, got ${publicSignals.length}`);

        const a = proof.pi_a.slice(0, 2).map($u.BN256ToHex);
        const b = proof.pi_b.slice(0, 2).map(row => $u.reverseCoordinate(row.map($u.BN256ToHex)));
        const c = proof.pi_c.slice(0, 2).map($u.BN256ToHex);

        // Determine timing baseline
        const commitTxIdx  = batchSize === 1 ? i : Math.floor(sliceStart / batchSize);
        const batchReadyNs = batchSize === 1
            ? commitMinedNs[i]
            : bigIntMax(
                Array.from({ length: batchSize }, (_, k) =>
                    commitMinedNs[Math.floor((sliceStart + k) / batchSize)]
                )
              );

        let submitTx;
        const wStart = nowNs();

        if (batchSize === 1) {
            const input = [publicSignals[0], publicSignals[1], publicSignals[2]];
            const recipient = ethers.utils.getAddress(
                "0x" + BigInt(publicSignals[2]).toString(16).padStart(40, "0")
            );
            submitTx = await tornado.voteSubmission(a, b, c, input, recipient);
        } else {
            const input = [
                ...publicSignals.slice(0, batchSize),
                ...publicSignals.slice(batchSize, 2 * batchSize),
                ...publicSignals.slice(2 * batchSize, 3 * batchSize),
            ];
            const recipients = publicSignals
                .slice(2 * batchSize, 3 * batchSize)
                .map(v => ethers.utils.getAddress("0x" + BigInt(v).toString(16).padStart(40, "0")));
            submitTx = await tornado.voteSubmission(a, b, c, input, recipients);
        }

        const wSubmitNs     = wStart;
        const submitReceipt = await submitTx.wait();
        const wEnd          = nowNs();
        expect(submitReceipt.status).to.equal(1);

        console.log(`  [${cfg.label}] voteSubmission ${i + 1} gas: ${submitReceipt.gasUsed.toString()}`);

        submitInclMs.push(nsToMs(wEnd - wSubmitNs));
        waitMs.push(nsToMs(wSubmitNs - batchReadyNs));
        endToEndMs.push(nsToMs(wEnd - batchReadyNs));
        submitGasReceipts.push({ gasUsed: submitReceipt.gasUsed, gasPrice: submitTx.gasPrice });
    }

    // ─── Gas totals ────────────────────────────────────────────────
    let totalGas = ethers.BigNumber.from(0);
    for (const g of commitGasReceipts)           totalGas = totalGas.add(g);
    for (const { gasUsed } of submitGasReceipts) totalGas = totalGas.add(gasUsed);

    const avgGasPrice  = submitGasReceipts
        .reduce((s, { gasPrice }) => s.add(gasPrice), ethers.BigNumber.from(0))
        .div(submitGasReceipts.length);
    const totalEthCost = ethers.utils.formatEther(totalGas.mul(avgGasPrice));
    const totalGbpCost = (parseFloat(totalEthCost) * ETH_TO_GBP).toFixed(2);

    console.log(`  [${cfg.label}] Total gas (commitment + submission): ${totalGas.toString()}`);
    console.log(`  [${cfg.label}] Estimated GBP cost: £${totalGbpCost}`);
    console.log(`  [${cfg.label}] Per-voter commitment gas: ${commitGasReceipts.reduce((a,g)=>a.add(g),ethers.BigNumber.from(0)).div(totalVoters).toString()}`);
    console.log(`  [${cfg.label}] Per-voter submission gas: ${submitGasReceipts.reduce((a,{gasUsed})=>a.add(gasUsed),ethers.BigNumber.from(0)).div(totalVoters).toString()}`);

    printStats(`[${cfg.label}] voteCommitment witness`, commitWitnessMs);
    printStats(`[${cfg.label}] Merkle path compute`,    merklePathMs);
    printStats(`[${cfg.label}] voteCommitment inclusion`, commitInclMs);
    printStats(`[${cfg.label}] voteSubmission proof gen`, submitProofMs);
    printStats(`[${cfg.label}] voteSubmission inclusion`, submitInclMs);
    printStats(`[${cfg.label}] Wait (commit mined → submit)`, waitMs);
    printStats(`[${cfg.label}] End-to-end`,               endToEndMs);

    return { commitGasReceipts, submitGasReceipts };
}

// ============================================================
// runRecoveryToken — handles 1× (scalar) and batch (array) APIs
// ============================================================
async function runRecoveryToken(cfg, tornado, owner, eaWallet) {
    const { batchSize, totalVoters } = cfg;
    const numBatches = totalVoters / batchSize;

    const recoveryGasReceipts = [];
    const recoveryInclMs      = [];

    const nowNs = () => process.hrtime.bigint();

    for (let batch = 0; batch < numBatches; batch++) {
        const uniqueIds    = Array.from({ length: batchSize }, () =>
            ethers.utils.hexZeroPad(ethers.utils.randomBytes(32), 32)
        );
        const recTokens    = Array.from({ length: batchSize }, () =>
            ethers.utils.hexZeroPad(ethers.utils.randomBytes(32), 32)
        );
        const voterPubKeys = Array.from({ length: batchSize }, () =>
            ethers.utils.hexZeroPad(ethers.utils.randomBytes(32), 32)
        );

        const sigBuffer = await buildSigBuffer(eaWallet, uniqueIds, voterPubKeys);

        const dStart = nowNs();
        let tx;

        if (batchSize === 1) {
            // Single API: scalar bytes32 args
            tx = await tornado.connect(owner).recoveryToken(
                uniqueIds[0],
                recTokens[0],
                voterPubKeys[0],
                sigBuffer          // 65 bytes
            );
        } else {
            // Batch API: fixed-size arrays
            tx = await tornado.connect(owner).recoveryToken(
                uniqueIds,
                recTokens,
                voterPubKeys,
                sigBuffer          // 65 * batchSize bytes
            );
        }

        const receipt = await tx.wait();
        const dEnd    = nowNs();
        expect(receipt.status).to.equal(1);

        const voterStart = batch * batchSize + 1;
        const voterEnd   = voterStart + batchSize - 1;
        console.log(
            `  [${cfg.label}] recoveryToken batch ${batch + 1}` +
            ` (voters ${voterStart}–${voterEnd}) gas: ${receipt.gasUsed.toString()}`
        );

        recoveryGasReceipts.push(receipt.gasUsed);
        recoveryInclMs.push(nsToMs(dEnd - dStart));
    }

    const totalGas = recoveryGasReceipts.reduce(
        (acc, g) => acc.add(g), ethers.BigNumber.from(0)
    );
    console.log(`  [${cfg.label}] Total recovery gas: ${totalGas.toString()}`);
    console.log(`  [${cfg.label}] Avg gas per call:   ${totalGas.div(numBatches).toString()}`);
    console.log(`  [${cfg.label}] Avg gas per token:  ${totalGas.div(totalVoters).toString()}`);
    printStats(`[${cfg.label}] recoveryToken inclusion`, recoveryInclMs);

    return recoveryGasReceipts;
}

// ============================================================
// Top-level describe
// ============================================================
describe("Unified Gas Benchmark: 1×, 4×, 8×, 16× batch sizes", function () {
    // Increase mocha timeout — proof generation for 16× takes ~5–6 s per batch
    this.timeout(600_000);

    let eaWallet;
    let owner;

    // Deployed instances, keyed by label
    const instances = {};

    // ============================================================
    // before — deploy all 4 variants once
    // ============================================================
    before(async () => {
        [owner] = await ethers.getSigners();

        // Single shared EA wallet across all variants
        eaWallet = ethers.Wallet.createRandom().connect(ethers.provider);
        console.log("\n🔑 Election Authority:", eaWallet.address);

        console.log("\n━━━ Deployment ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        for (const cfg of BATCH_CONFIGS) {
            console.log(`\n  Deploying ${cfg.label} variant...`);
            const { hasher, verifier, tornado, totalCandidateGas } =
                await deployForBatch(cfg, owner, eaWallet);
            instances[cfg.label] = { hasher, verifier, tornado };
        }
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    });

    // ============================================================
    // ── 1× ───────────────────────────────────────────────────────
    // ============================================================
    describe("Batch size 1× (single note per transaction)", function () {
        let cfg, tornado, witnessCalc;

        before(async () => {
            cfg      = BATCH_CONFIGS[0];
            tornado  = instances[cfg.label].tornado;
            const buf = fs.readFileSync(path.join(__dirname, cfg.depositWasm));
            witnessCalc = await wc(buf);
        });

        it("voteCommitment + voteSubmission — 40 voters (1 per tx)", async () => {
            const [user] = await ethers.getSigners();
            await runVoteCommitmentAndSubmission(cfg, tornado, witnessCalc, user);
        });

        it("recoveryToken — 40 voters (1 per tx)", async () => {
            await runRecoveryToken(cfg, tornado, owner, eaWallet);
        });

        it("addCandidate — 10 extra candidates", async () => {
            await runAddCandidate(cfg, tornado, owner);
        });
    });

    // ============================================================
    // ── 4× ───────────────────────────────────────────────────────
    // ============================================================
    describe("Batch size 4× (4 notes per transaction)", function () {
        let cfg, tornado, witnessCalc;

        before(async () => {
            cfg      = BATCH_CONFIGS[1];
            tornado  = instances[cfg.label].tornado;
            const buf = fs.readFileSync(path.join(__dirname, cfg.depositWasm));
            witnessCalc = await wc(buf);
        });

        it("voteCommitment + voteSubmission — 40 voters (10 txs of 4)", async () => {
            const [user] = await ethers.getSigners();
            await runVoteCommitmentAndSubmission(cfg, tornado, witnessCalc, user);
        });

        it("recoveryToken — 40 voters (10 txs of 4)", async () => {
            await runRecoveryToken(cfg, tornado, owner, eaWallet);
        });

        it("addCandidate — 10 extra candidates", async () => {
            await runAddCandidate(cfg, tornado, owner);
        });
    });

    // ============================================================
    // ── 8× ───────────────────────────────────────────────────────
    // ============================================================
    describe("Batch size 8× (8 notes per transaction)", function () {
        let cfg, tornado, witnessCalc;

        before(async () => {
            cfg      = BATCH_CONFIGS[2];
            tornado  = instances[cfg.label].tornado;
            const buf = fs.readFileSync(path.join(__dirname, cfg.depositWasm));
            witnessCalc = await wc(buf);
        });

        it("voteCommitment + voteSubmission — 40 voters (5 txs of 8)", async () => {
            const [user] = await ethers.getSigners();
            await runVoteCommitmentAndSubmission(cfg, tornado, witnessCalc, user);
        });

        it("recoveryToken — 40 voters (5 txs of 8)", async () => {
            await runRecoveryToken(cfg, tornado, owner, eaWallet);
        });

        it("addCandidate — 10 extra candidates", async () => {
            await runAddCandidate(cfg, tornado, owner);
        });
    });

    // ============================================================
    // ── 16× ──────────────────────────────────────────────────────
    // ============================================================
    describe("Batch size 16× (16 notes per transaction)", function () {
        let cfg, tornado, witnessCalc;

        before(async () => {
            cfg      = BATCH_CONFIGS[3];
            tornado  = instances[cfg.label].tornado;
            const buf = fs.readFileSync(path.join(__dirname, cfg.depositWasm));
            witnessCalc = await wc(buf);
        });

        it("voteCommitment + voteSubmission — 32 voters (2 txs of 16)", async () => {
            const [user] = await ethers.getSigners();
            await runVoteCommitmentAndSubmission(cfg, tornado, witnessCalc, user);
        });

        it("recoveryToken — 32 voters (2 txs of 16)", async () => {
            await runRecoveryToken(cfg, tornado, owner, eaWallet);
        });

        it("addCandidate — 10 extra candidates", async () => {
            await runAddCandidate(cfg, tornado, owner);
        });
    });
});

// ============================================================
// runAddCandidate — shared helper for addCandidate gas test
// ============================================================
async function runAddCandidate(cfg, tornado, owner) {
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
        console.log(`  [${cfg.label}] addCandidate(${name}) gas: ${gasUsed.toString()}`);
    }

    const totalGas     = gasUsedPerTx.reduce((a, g) => a.add(g), ethers.BigNumber.from(0));
    const totalCostWei = txCostsWei.reduce((a, c) => a.add(c),   ethers.BigNumber.from(0));

    console.log(`  [${cfg.label}] Total addCandidate gas: ${totalGas.toString()}`);
    console.log(`  [${cfg.label}] Avg gas per addCandidate: ${totalGas.div(N).toString()}`);
    console.log(`  [${cfg.label}] Total cost (ETH): ${ethers.utils.formatEther(totalCostWei)}`);
}