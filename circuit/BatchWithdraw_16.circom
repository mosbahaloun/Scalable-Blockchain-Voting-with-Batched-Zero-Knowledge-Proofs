pragma circom 2.0.0;

include "./utils/mimc5sponge.circom";
include "./commitment_hasher.circom";

template Withdraw() {
    // Private input signals
    signal input root[16];
    signal input nullifierHash[16];
    signal input recipient[16];

    signal input secret[16][256];
    signal input nullifier[16][256];
    signal input hashPairings[16][10];
    signal input hashDirections[16][10];

    // Public outputs
    signal output pub_root[16];
    signal output pub_nullifierHash[16];
    signal output pub_recipient[16];

    component cHasher[16];
    component leafHashers[16][10];

    signal currentHash[16][11];
    signal left[16][10];
    signal right[16][10];
    signal recipientSquare[16];

    for (var t = 0; t < 16; t++) {
        cHasher[t] = CommitmentHasher();
        cHasher[t].secret <== secret[t];
        cHasher[t].nullifier <== nullifier[t];
        cHasher[t].nullifierHash === nullifierHash[t];

        currentHash[t][0] <== cHasher[t].commitment;

        for (var i = 0; i < 10; i++) {
            var d = hashDirections[t][i];

            leafHashers[t][i] = MiMC5Sponge(2);

            left[t][i]  <== (1 - d) * currentHash[t][i];
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
