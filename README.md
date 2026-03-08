# zkSNARK Blockchain Voting — Gas Benchmark

A privacy-preserving e-voting system built on Ethereum using Groth16 zkSNARKs and MiMC5 Merkle trees. Four batch sizes (1×, 4×, 8×, 16×) are benchmarked in a single unified test run, measuring on-chain gas costs for voter commitment, vote submission, recovery token storage, and candidate registration.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [What You Need to Install](#2-what-you-need-to-install)
3. [Step-by-Step Setup](#3-step-by-step-setup)
4. [Required Files Checklist](#4-required-files-checklist)
5. [Running the Tests](#5-running-the-tests)
6. [Understanding the Output](#6-understanding-the-output)
7. [How the Test Works](#7-how-the-test-works)
8. [Gas Results Summary](#8-gas-results-summary)
9. [Troubleshooting](#9-troubleshooting)
10. [Git LFS for Large Files](#10-git-lfs-for-large-files)

---

## 1. Project Structure

```
Backend_for_all_batches/
│
├── circuit/
│   └── witness_calculator.js          # WASM witness calculator helper (from snarkjs)
│
├── contracts/
│   ├── MiMCSponge.sol                 # MiMC5 hash function (Solidity)
│   ├── ReentrancyGuard.sol            # Reentrancy protection
│   ├── Hasher.sol                     # On-chain MiMC5 hasher wrapper
│   ├── Tornado_1.sol                  # Main voting contract — 1 note per tx
│   ├── Tornado_4.sol                  # Main voting contract — 4 notes per tx
│   ├── Tornado_8.sol                  # Main voting contract — 8 notes per tx
│   ├── Tornado_16.sol                 # Main voting contract — 16 notes per tx
│   ├── Groth16Verifier_1_batches.sol  # On-chain Groth16 verifier (1×)
│   ├── Groth16Verifier_4_batches.sol  # On-chain Groth16 verifier (4×)
│   ├── Groth16Verifier_8_batches.sol  # On-chain Groth16 verifier (8×)
│   └── Groth16Verifier_16_batches.sol # On-chain Groth16 verifier (16×)
│
├── utils/
│   ├── $u.js                          # BigNumber / hex utility helpers
│   ├── mimc5.js                       # Off-chain MiMC5 sponge implementation
│   ├── batch_deposit_1.wasm           # Compiled deposit circuit — 1 note
│   ├── batch_deposit_4.wasm           # Compiled deposit circuit — 4 notes
│   ├── batch_deposit_8.wasm           # Compiled deposit circuit — 8 notes
│   ├── batch_deposit_16.wasm          # Compiled deposit circuit — 16 notes
│   ├── BatchWithdraw_1.wasm           # Compiled withdraw circuit — 1 note
│   ├── BatchWithdraw_4.wasm           # Compiled withdraw circuit — 4 notes
│   ├── BatchWithdraw_8.wasm           # Compiled withdraw circuit — 8 notes
│   ├── BatchWithdraw_16.wasm          # Compiled withdraw circuit — 16 notes
│   ├── setup_1_final.zkey             # Groth16 proving key — 1 note  (~4.7 MB)
│   ├── setup_4_final.zkey             # Groth16 proving key — 4 notes (~37.8 MB)
│   ├── setup_8_final.zkey             # Groth16 proving key — 8 notes (~37.8 MB)
│   └── setup16_final.zkey             # Groth16 proving key — 16 notes (~302 MB)
│
├── test/
│   └── sample-test.js                 # Unified benchmark — all 4 batch sizes
│
├── hardhat.config.js                  # Hardhat configuration
└── package.json                       # Node.js dependencies
```

---

## 2. What You Need to Install

### System Requirements

| Tool | Minimum Version | How to Check | Where to Get It |
|------|----------------|--------------|-----------------|
| **Node.js** | 18.x or higher | `node --version` | https://nodejs.org |
| **npm** | 9.x or higher | `npm --version` | Comes with Node.js |
| **Git** | Any recent version | `git --version` | https://git-scm.com |
| **Git LFS** | Any recent version | `git lfs version` | https://git-lfs.github.com |

> **Why Node 18+?** The test file uses modern async/await patterns and Buffer APIs that require Node 18 or later. Earlier versions may produce unexpected errors.

> **Git LFS** is only required if the `.wasm` and `.zkey` files are stored in Git LFS. If you received the project as a folder with all files already present, you can skip Git LFS setup.

### Node.js Package Dependencies

All Node.js packages are listed in `package.json` and installed automatically by `npm install`. You do **not** need to install any of these globally:

| Package | Purpose |
|---------|---------|
| `hardhat` | Ethereum development and test framework |
| `@nomiclabs/hardhat-ethers` | Hardhat + ethers.js integration plugin |
| `ethers` | Ethereum interaction library (v5) |
| `snarkjs` | Off-chain Groth16 proof generation and verification — **must be installed separately** (see Step 5b) |
| `chai` | Assertion library used inside tests |
| `hardhat-gas-reporter` | Prints per-method gas usage table after tests |

---

## 3. Step-by-Step Setup

### Step 1 — Install Node.js

Go to https://nodejs.org and download the **LTS** version (18.x or 20.x recommended). Run the installer for your operating system.

Verify the installation opened a new terminal:

```bash
node --version
# expected output: v18.x.x  or  v20.x.x

npm --version
# expected output: 9.x.x  or  10.x.x
```

If `node` is not found after installation on Linux, see the [Troubleshooting](#9-troubleshooting) section.

---

### Step 2 — Install Git

**macOS:**
```bash
brew install git
```

**Ubuntu / Debian / Kali Linux:**
```bash
sudo apt update && sudo apt install git -y
```

**Windows:** Download the installer from https://git-scm.com

Verify:
```bash
git --version
# expected output: git version 2.x.x
```

---

### Step 3 — Install Git LFS

Git LFS is needed to download the large `.zkey` files (especially `setup16_final.zkey` at 302 MB, which exceeds GitHub's standard file size limit).

**macOS:**
```bash
brew install git-lfs
```

**Ubuntu / Debian / Kali Linux:**
```bash
sudo apt install git-lfs -y
```

**Windows:** Download from https://git-lfs.github.com

After installing, enable it once for your user account:

```bash
git lfs install
# expected output: Git LFS initialized.
```

---

### Step 4 — Clone the Repository

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>/Backend_for_all_batches
```

If the repository uses Git LFS for the `.wasm` and `.zkey` circuit files, download them now:

```bash
git lfs pull
```

This may take several minutes depending on your internet speed — the 16× proving key alone is 302 MB.

---

### Step 5 — Install Node.js Dependencies

Inside the `Backend_for_all_batches/` folder, run:

```bash
npm install
```

This reads `package.json` and installs all packages into a local `node_modules/` folder. It does **not** require administrator/root privileges and installs nothing globally.

Expected output (last few lines):

```
added 312 packages, and audited 313 packages in 45s
found 0 vulnerabilities
```

> If you see `ERESOLVE` peer dependency errors, try:
> ```bash
> npm install --legacy-peer-deps
> ```

---

### Step 5b — Install snarkjs separately (required)

> **Important:** `snarkjs` is not always included in `package.json` and may not be installed by `npm install` above. It must be installed explicitly or the tests will fail immediately with `Cannot find module 'snarkjs'`.

```bash
npm install snarkjs
```

This installs snarkjs locally into `node_modules/` alongside the other packages. You should see output like:

```
added 1 package, and audited 314 packages in 12s
found 0 vulnerabilities
```

To confirm it installed correctly:

```bash
npx snarkjs --version
# expected output: 0.7.x  (or similar)
```

If you want to also save it to `package.json` so future `npm install` runs include it automatically:

```bash
npm install snarkjs --save
```

---

### Step 6 — Verify All Circuit Files Are Present

Before running the tests, confirm every `.wasm` and `.zkey` file exists:

```bash
ls utils/
```

You should see all 8 `.wasm` files and 4 `.zkey` files. Cross-check against the [Required Files Checklist](#4-required-files-checklist) below. If any are missing, the tests will fail immediately with a file-not-found error.

---

### Step 7 — Run the Tests

```bash
npx hardhat test
```

All four batch sizes run automatically. Expected total time: 40–60 seconds on a modern laptop.

---

## 4. Required Files Checklist

The tests will not run without all of the following. Verify each file exists before running:

```
circuit/
  ✓ witness_calculator.js

utils/
  ✓ $u.js
  ✓ mimc5.js
  ✓ batch_deposit_1.wasm
  ✓ batch_deposit_4.wasm
  ✓ batch_deposit_8.wasm
  ✓ batch_deposit_16.wasm
  ✓ BatchWithdraw_1.wasm
  ✓ BatchWithdraw_4.wasm
  ✓ BatchWithdraw_8.wasm
  ✓ BatchWithdraw_16.wasm
  ✓ setup_1_final.zkey       (~4.7 MB)
  ✓ setup_4_final.zkey       (~37.8 MB)
  ✓ setup_8_final.zkey       (~37.8 MB)
  ✓ setup16_final.zkey       (~302 MB)  ← requires Git LFS
```

> The `setup16_final.zkey` file at 302 MB **must** be stored and retrieved via Git LFS. It cannot be pushed to or pulled from GitHub without LFS.

---

## 5. Running the Tests

### Run all tests (standard)

```bash
npx hardhat test
```

### Run with verbose Hardhat output

```bash
npx hardhat test --verbose
```

### Filter by batch size

```bash
# Run only the 1× tests
npx hardhat test --grep "1×"

# Run only the 16× tests
npx hardhat test --grep "16×"
```

### Filter by operation

```bash
# Run only recovery token tests across all batch sizes
npx hardhat test --grep "recoveryToken"

# Run only the commitment + submission tests
npx hardhat test --grep "voteCommitment"
```

### Disable gas reporting

Gas reporting is enabled by default. To turn it off:

```bash
REPORT_GAS=false npx hardhat test
```

### Expected total runtime

| Hardware | Approximate time |
|----------|-----------------|
| Modern laptop (Apple M1/M2, Intel i7+) | ~40–60 s |
| Older laptop or virtual machine | ~2–5 min |

The 16× batch withdrawal proof generation takes ~3.38 s per proof call, which is the dominant cost.

---

## 6. Understanding the Output

### Deployment section

```
Deploying 1× variant...
  [1×] Hasher deployed:   0x5FbDB2...  gas: 772,734 (constant)
  [1×] Verifier deployed: 0xe7f172...
  [1×] Tornado deployed:  0x9fE467...
  [1×] 10 candidates added, total gas: 1,001,952
```

Four independent sets of contracts are deployed before any tests run — one complete deployment per batch size. The Hasher deployment is always 772,734 gas regardless of batch size.

### Per-transaction gas logs

```
[4×] voteCommitment 1 (voters 1–4) gas: 313,185
[4×] voteCommitment 2 (voters 5–8) gas: 296,133
...
[4×] Total gas (commitment + submission): 7,701,022
[4×] Per-voter commitment gas: 74,465
[4×] Per-voter submission gas: 118,060
```

Each batch transaction is logged individually. The per-voter summary line divides total gas by batch size (e.g. 297,862 ÷ 4 = 74,465).

### Timing logs

```
⏱ [8×] voteSubmission proof gen: n=5  mean=1802.77ms  p50=1792.40ms  p90=1921.00ms
```

Off-chain computation timings are printed after each test section. `n` is the number of batch transactions, `p50`/`p90` are median and 90th-percentile latencies.

### Test result summary

```
12 passing (41s)
```

All 12 tests should pass. If any fail, see [Troubleshooting](#9-troubleshooting).

### Gas reporter table

Printed automatically after all tests:

```
·──────────────────────────┬──────────┬──────────┬──────────┬──────────·
│  Tornado_4               │          │          │          │          │
·──────────────────────────┼──────────┼──────────┼──────────┼──────────·
│  voteCommitment          │  296,121 │  313,185 │  297,862 │  20 calls│
│  voteSubmission          │  470,476 │  487,648 │  472,240 │  20 calls│
│  recoveryToken           │  245,543 │  245,603 │  245,572 │  20 calls│
│  addCandidate            │  100,182 │  100,266 │  100,224 │  40 calls│
```

Columns are: min gas, max gas, average gas, number of calls. One block is shown per contract (`Tornado_1`, `Tornado_4`, `Tornado_8`, `Tornado_16`).

---

## 7. How the Test Works

The test file `test/sample-test.js` runs all four batch sizes in sequence inside one Mocha/Hardhat test suite.

### Before all tests — shared deployment hook

A single `before()` hook deploys all contracts for all four variants before any test runs. This happens once at the start of the suite.

### Test 1 — `voteCommitment + voteSubmission`

For each batch size, the test executes the full voting cycle:

1. Generates random secrets and nullifiers for each voter off-chain using `crypto.randomBytes`
2. Runs the deposit WASM circuit (`batch_deposit_N.wasm`) via `snarkjs` to compute commitments and updated Merkle roots
3. Computes MiMC5 Merkle inclusion paths off-chain for each batch
4. Calls `voteCommitment` on-chain for each batch, logging gas used
5. Generates a Groth16 withdrawal proof off-chain using `snarkjs.groth16.fullProve` with `BatchWithdraw_N.wasm` and `setup_N_final.zkey`
6. Calls `voteSubmission` on-chain with the proof and public signals, logging gas used

### Test 2 — `recoveryToken`

The Election Authority (EA) signs each voter's `(uniqueId, voterPublicKey)` pair off-chain using ECDSA (`ethers.js` wallet `signMessage`). The test then calls `recoveryToken` on-chain, which:
- Verifies the ECDSA signature using `ecrecover`
- Stores `keccak256(recToken || voterPubKey)` — a single 32-byte slot per voter

### Test 3 — `addCandidate`

Calls `addCandidate` 10 times to benchmark admin gas. The cost is consistent at ~100,225 gas regardless of batch size, as it only involves a simple string storage write.

### 1× vs batch API handling

The 1× contract takes scalar parameters (single `uint256` commitment, single address recipient). The 4×/8×/16× contracts take array parameters. The test handles both via a `batchSize === 1` branch inside `runVoteCommitmentAndSubmission()` and `buildSigBuffer()`.

---

## 8. Gas Results Summary

Results from a complete test run (Hardhat local network, Solidity 0.8.27, optimiser off, block limit 30,000,000 gas):

### Per-function gas — single batch transaction average

| Function | 1× | 4× | 8× | 16× |
|----------|---:|---:|---:|----:|
| Deploy Groth16Verifier | 425,374 | 607,697 | 854,075 | 1,345,816 |
| Deploy Hasher | 772,734 | 772,734 | 772,734 | 772,734 |
| Deploy Main contract | 3,234,890 | 3,470,731 | 3,472,922 | 3,472,898 |
| `addCandidate` | 100,225 | 100,224 | 100,225 | 100,225 |
| `voteCommitment` (avg per tx) | 98,602 | 297,862 | 552,439 | 1,063,652 |
| `recoveryToken` (avg per tx) | 81,255 | 245,572 | 464,130 | 901,182 |
| `voteSubmission` (avg per tx) | 294,071 | 472,240 | 708,426 | 1,182,640 |

### Per-voter gas (total ÷ batch size) and savings vs 1×

| Operation | 1× | 4× | 8× | 16× | Saving at 16× |
|-----------|---:|---:|---:|----:|:-------------:|
| Vote submission | 294,071 | 118,060 | 88,553 | 73,915 | **74.9%** |
| Voter commitment | 98,601 | 74,465 | 69,054 | 66,478 | **32.6%** |
| Recovery token | 81,255 | 61,392 | 58,016 | 56,323 | **30.7%** |
| **Total per voter** | **473,927** | **253,917** | **215,623** | **196,716** | **58.5%** |

### Off-chain timings — average per batch

| Operation | 1× | 4× | 8× | 16× |
|-----------|---:|---:|---:|----:|
| Deposit witness (ms) | 6.21 | 25.39 | 50.93 | 105.32 |
| Merkle path (ms) | 2.58 | 9.58 | 20.51 | 36.89 |
| Withdrawal proof gen (ms) | 264.08 | 941.49 | 1,802.77 | 3,379.07 |

---

## 9. Troubleshooting

### `Cannot find module 'snarkjs'`

`snarkjs` is not included in `package.json` and must be installed separately. Run this from inside `Backend_for_all_batches/`:

```bash
npm install snarkjs
```

To permanently add it to `package.json` so it is always installed with `npm install`:

```bash
npm install snarkjs --save
```

---

### `Cannot find module 'hardhat'` or other missing modules

Dependencies are not installed. Run:

```bash
rm -rf node_modules
npm install
npm install snarkjs
```

---

### `ENOENT: no such file or directory, open '...BatchWithdraw_N.wasm'`

A circuit file is missing from `utils/`. Possible causes:

- **Not downloaded via Git LFS:** Run `git lfs pull`
- **`setup16_final.zkey` missing:** This file is 302 MB and cannot be on GitHub without LFS — see [Section 10](#10-git-lfs-for-large-files)
- **Wrong working directory:** You must run `npx hardhat test` from inside `Backend_for_all_batches/`, not the repo root

---

### `Error HH700: Artifact for contract "Tornado_1" not found`

Contracts have not compiled successfully. Run manually:

```bash
npx hardhat compile
```

Read the error output and fix any Solidity compilation issues before retrying.

---

### `Error: invalid BigNumber value` or `TypeError: Cannot read properties of undefined`

Usually means a `.wasm` or `.zkey` file is corrupted (e.g. a partial Git LFS download). Re-pull the specific file:

```bash
git lfs pull --include="utils/setup16_final.zkey"
git lfs pull --include="utils/BatchWithdraw_16.wasm"
```

---

### Gas reporter table does not appear after tests

Check `hardhat.config.js` includes:

```js
gasReporter: {
  enabled: true,
}
```

Or run with the environment variable set:

```bash
REPORT_GAS=true npx hardhat test
```

---

### `Error: timeout of 600000ms exceeded`

Proof generation for 16× can be slow on older hardware. Increase the timeout in `sample-test.js`:

```js
this.timeout(1_800_000); // 30 minutes
```

---

### `npm install` fails with `ERESOLVE` peer dependency error

```bash
npm install --legacy-peer-deps
```

---

### `node: command not found` on Linux after installing Node.js

On some Debian-based systems (including Kali), Node.js installs as `nodejs` not `node`. Fix with a symlink:

```bash
sudo ln -s /usr/bin/nodejs /usr/bin/node
```

Or install via `nvm` (Node Version Manager), which handles this automatically:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

---

## 10. Git LFS for Large Files

The circuit proving keys are too large for a standard Git repository:

| File | Size | Needs LFS? |
|------|-----:|:---------:|
| `setup_1_final.zkey` | ~4.7 MB | No |
| `setup_4_final.zkey` | ~37.8 MB | Recommended |
| `setup_8_final.zkey` | ~37.8 MB | Recommended |
| `setup16_final.zkey` | ~302 MB | **Yes — required** |
| `*.wasm` (all 8 files) | 406–610 KB each | No |

### Setting up Git LFS on the repository (first time)

```bash
# 1. Enable Git LFS on your machine (once per machine)
git lfs install

# 2. Tell Git LFS which files to track
git lfs track "*.zkey"
git lfs track "*.wasm"

# 3. Commit the .gitattributes file that Git LFS created
git add .gitattributes
git commit -m "Track circuit files with Git LFS"

# 4. Add the circuit files and push
git add utils/
git commit -m "Add circuit WASM and zkey files"
git push
```

### Cloning a repository that already uses Git LFS

```bash
# Step 1 — Enable Git LFS on your machine
git lfs install

# Step 2 — Clone normally; LFS files download automatically if server supports it
git clone https://github.com/<your-username>/<your-repo>.git

# Step 3 — If LFS files were not downloaded automatically
cd <your-repo>
git lfs pull
```

---

## Key Dependencies

```json
{
  "hardhat":                   "^2.x",
  "@nomiclabs/hardhat-ethers": "^2.x",
  "ethers":                    "^5.x",
  "snarkjs":                   "^0.7.x",   // install separately: npm install snarkjs
  "chai":                      "^4.x",
  "hardhat-gas-reporter":      "^1.x"
}
```

---

## License

See individual contract headers for licensing information.
