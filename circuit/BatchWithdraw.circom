pragma circom 2.0.0;include "util
               ^


include "./utils/mimc5sponge.circom";
include "./commitment_hasher.circom";

template Withdraw() {
    // Private input signals
    signal input root[4];
    signal input nullifierHash[4];
    signal input recipient[4];

    signal input secret[4][256];
    signal input nullifier[4][256];
    signal input hashPairings[4][10];
    signal input hashDirections[4][10];

    // Public outputs
    signal output pub_root[4];
    signal output pub_nullifierHash[4];
    signal output pub_recipient[4];

    component cHasher[4];
    component leafHashers[4][10];

    signal currentHash[4][11];
    signal left[4][10];
    signal right[4][10];
    signal recipientSquare[4];

    for (var t = 0; t < 4; t++) {
        cHasher[t] = CommitmentHasher();
        cHasher[t].secret <== secret[t];
        cHasher[t].nullifier <== nullifier[t];
        cHasher[t].nullifierHash === nullifierHash[t];

        currentHash[t][0] <== cHasher[t].commitment;

        for (var i = 0; i < 10; i++) {
            var d = hashDirections[t][i];

            leafHashers[t][i] = MiMC5Sponge(2);

            left[t][i] <== (1 - d) * currentHash[t][i];
            leafHashers[t][i].ins[0] <== left[t][i] + d * hashPairings[t][i];

            right[t][i] <== d * currentHash[t][i];
            leafHashers[t][i].ins[1] <== right[t][i] + (1 - d) * hashPairings[t][i];

            leafHashers[t][i].k <== 0;
            currentHash[t][i + 1] <== leafHashers[t][i].o;
        }

        root[t] === currentHash[t][10];
        recipientSquare[t] <== recipient[t] * recipient[t];

        // Expose public outputs
        pub_root[t] <== root[t];
        pub_nullifierHash[t] <== nullifierHash[t];
        pub_recipient[t] <== recipient[t];
    }
}

// Final component instance
component main = Withdraw();
