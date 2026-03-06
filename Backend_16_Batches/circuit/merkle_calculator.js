
const circomlibjs = require('circomlibjs');
const { Scalar } = require('ffjavascript');

/**
 * Compute the Merkle Root off-chain using MiMC Sponge hash
 * @param {Array} leaves - Array of leaves (BigInt or hex strings)
 * @param {number} treeLevels - Number of Merkle tree levels
 * @param {Array} zeroHashes - Precomputed zero hashes for each level
 * @returns {Promise<BigInt>} Merkle Root
 */
async function computeMerkleRoot(leaves, treeLevels, zeroHashes) {
    const mimcSponge = await circomlibjs.buildMimcSponge();
    let levelNodes = [...leaves];

    // Pad to full binary tree
    while (levelNodes.length < (1 << treeLevels)) {
        levelNodes.push(zeroHashes[0]);
    }

    for (let level = 0; level < treeLevels; level++) {
        const nextLevel = [];
        for (let i = 0; i < levelNodes.length; i += 2) {
            const left = Scalar.e(levelNodes[i]);
            const right = Scalar.e(levelNodes[i + 1]);
            const hash = mimcSponge.F.toObject(mimcSponge.multiHash([left, right]));
            nextLevel.push(hash);
        }
        levelNodes = nextLevel;
    }

    return levelNodes[0];
}

module.exports = { computeMerkleRoot };
