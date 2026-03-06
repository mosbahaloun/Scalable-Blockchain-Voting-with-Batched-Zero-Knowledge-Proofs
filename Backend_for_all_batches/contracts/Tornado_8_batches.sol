// SPDX-License-Identifier: NONE
pragma solidity ^0.8.27;

import "./MiMCSponge.sol";
import "./ReentrancyGuard.sol";

interface IVerifier {
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[24] memory input  // 8-batch withdraw: 8*3 = 24 public signals
    ) external view returns (bool);
}

contract Tornado_8 is ReentrancyGuard {
    address verifier;
    Hasher hasher;

    struct Candidate {
        string name;
        uint256 voteCount;
        address Candidate_Address;
    }

    struct ElGamalCiphertext {
        uint256 c1;
        uint256 c2;
    }
    ElGamalCiphertext private _finalAggCipher;
    uint256 public aggCipherLastUpdated;
    event AggregatedCiphertextUpdated(
        uint256 c1,
        uint256 c2,
        uint256 timestamp
    );

    address owner;

    // ---------------------------------------------------------------
    // Election Authority public key — used to verify EA signatures
    // on recovery tokens before storing them on-chain.
    // Set once by the owner after deployment via setElectionAuthority().
    // ---------------------------------------------------------------
    address public electionAuthority;

    Candidate[] public candidates;
    mapping(address => bool) public Candidate_check;

    uint8 public treeLevel = 10;
    uint256 public denomination = 0.01 ether;

    // BATCH_SIZE = 8, matching the BatchDeposit8 circuit
    uint256 public constant BATCH_SIZE = 8;

    uint256 public nextLeafIdx = 0;
    mapping(uint256 => bool) public roots;
    mapping(uint8 => uint256) lastLevelHash;
    mapping(uint256 => bool) public nullifierHashes;
    mapping(uint256 => bool) public commitments;

    // ---------------------------------------------------------------
    // Recovery token storage
    //
    // H_i = keccak256(abi.encodePacked(RecToken_i, voterPubKey_i))
    // One 32-byte slot per voter — hash-based storage gives recovery
    // tokens superior gas scaling vs. voter commitments.
    //
    // uniqueId (bytes32) → H_i (bytes32)
    // uniqueIdUsed guards against replay / duplicate registration.
    // ---------------------------------------------------------------
    mapping(bytes32 => bytes32) public recoveryHashes;
    mapping(bytes32 => bool)    public uniqueIdUsed;

    uint256[10] levelDefaults = [
        23183772226880328093887215408966704399401918833188238128725944610428185466379,
        24000819369602093814416139508614852491908395579435466932859056804037806454973,
        90767735163385213280029221395007952082767922246267858237072012090673396196740,
        36838446922933702266161394000006956756061899673576454513992013853093276527813,
        68942419351509126448570740374747181965696714458775214939345221885282113404505,
        50082386515045053504076326033442809551011315580267173564563197889162423619623,
        73182421758286469310850848737411980736456210038565066977682644585724928397862,
        60176431197461170637692882955627917456800648458772472331451918908568455016445,
        105740430515862457360623134126179561153993738774115400861400649215360807197726,
        76840483767501885884368002925517179365815019383466879774586151314479309584255
    ];

    // Emitted once per voteCommitment call (8 notes)
    event VoteCommitment(
        uint256[8] roots,
        uint256[8][10] hashPairings,
        uint8[8][10] pairDirections
    );
    event VoteSubmission(address to, uint256 nullifierHash);
    // Emitted once per token inside recoveryToken
    event RecoveryTokenStored(bytes32 indexed uniqueId, bytes32 recoveryHash);

    constructor(
        address _hasher,
        address _verifier,
        string[] memory _candidateNames,
        address[] memory _candidateAddress
    ) {
        require(
            _candidateNames.length == _candidateAddress.length,
            "len-mismatch"
        );
        owner = msg.sender;
        hasher = Hasher(_hasher);
        verifier = _verifier;
        for (uint256 i = 0; i < _candidateNames.length; i++) {
            candidates.push(
                Candidate({
                    name: _candidateNames[i],
                    voteCount: 0,
                    Candidate_Address: _candidateAddress[i]
                })
            );
        }
    }

    // ---------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------

    modifier onlyOwner() {
        require(msg.sender == owner, "not-owner");
        _;
    }

    /**
     * @notice Register the Election Authority address whose ECDSA
     *         signatures are required by recoveryToken.
     *         Must be called once by the owner after deployment.
     */
    function setElectionAuthority(address _ea) external onlyOwner {
        require(_ea != address(0), "zero-address");
        electionAuthority = _ea;
    }

    function addCandidate(
        string memory _name,
        address payable cand
    ) public onlyOwner {
        require(!Candidate_check[cand], "candidate-exists");
        candidates.push(
            Candidate({name: _name, voteCount: 0, Candidate_Address: cand})
        );
        Candidate_check[cand] = true;
    }

    // ---------------------------------------------------------------
    // Voter commitment — 8 notes per tx (matches BatchDeposit8 circuit)
    // ---------------------------------------------------------------

    /**
     * @notice Register 8 voter commitments in one transaction.
     * @param _commitments   commitment[0..7] from the BatchDeposit8 circuit
     * @param _newRoots      one updated Merkle root per inserted leaf
     * @param hashPairings   level-major [10][8] sibling hashes
     * @param hashDirections level-major [10][8] direction bits (0=left, 1=right)
     */
    function voteCommitment(
        uint256[8] calldata _commitments,
        uint256[8] calldata _newRoots,
        uint256[8][10] calldata hashPairings,
        uint8[8][10] calldata hashDirections
    ) external payable nonReentrant {
        // Must send exactly denomination × 8 (0.08 ETH)
        require(msg.value == denomination * BATCH_SIZE, "incorrect-amount");
        require(nextLeafIdx + BATCH_SIZE <= 2 ** treeLevel, "tree-full");

        for (uint256 i = 0; i < BATCH_SIZE; i++) {
            require(!commitments[_commitments[i]], "existing-commitment");
            require(!roots[_newRoots[i]], "existing-root");
            commitments[_commitments[i]] = true;
            roots[_newRoots[i]] = true;
            nextLeafIdx += 1;
        }

        emit VoteCommitment(_newRoots, hashPairings, hashDirections);
    }

    // ---------------------------------------------------------------
    // Privacy-preserving recovery token storage (8 tokens per tx)
    //
    // Protocol (per token i):
    //   1. EA produces:  sigma_i = Sig_EA(uniqueId_i, voterPubKey_i)
    //   2. Relayer calls recoveryToken with the batch.
    //   3. Contract verifies sigma_i via ecrecover.
    //   4. Contract stores: H_i = keccak256(recToken_i || voterPubKey_i)
    //      — one 32-byte slot, revealing nothing about the voter's
    //        real-world identity to on-chain observers.
    // ---------------------------------------------------------------

    /**
     * @notice Store 8 recovery token hashes on-chain in one transaction.
     *
     * @param uniqueIds    8 unique voter identifiers (256-bit random values)
     * @param recTokens    8 recovery tokens
     * @param voterPubKeys 8 voter ElGamal public keys (y_voterpubkey)
     * @param sigs         Packed EA signatures: [v(1)|r(32)|s(32)] × 8 = 520 bytes
     *                     where each sig covers keccak256(uniqueId_i || voterPubKey_i)
     */
    function recoveryToken(
        bytes32[8] calldata uniqueIds,
        bytes32[8] calldata recTokens,
        bytes32[8] calldata voterPubKeys,
        bytes calldata sigs        // 65 × 8 = 520 bytes
    ) external nonReentrant {
        require(electionAuthority != address(0), "ea-not-set");
        require(sigs.length == 65 * 8, "bad-sigs-length");

        for (uint256 i = 0; i < 8; i++) {
            bytes32 uid = uniqueIds[i];
            require(!uniqueIdUsed[uid], "uid-already-used");

            // --- verify EA signature over (uniqueId, voterPubKey) ---
            bytes32 msgHash = keccak256(
                abi.encodePacked(uid, voterPubKeys[i])
            );
            bytes32 ethHash = keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", msgHash)
            );

            uint256 offset = i * 65;
            uint8   v;
            bytes32 r;
            bytes32 s;
            assembly {
                let base := add(sigs.offset, offset)
                v := byte(0, calldataload(base))
                r := calldataload(add(base, 1))
                s := calldataload(add(base, 33))
            }
            require(
                ecrecover(ethHash, v, r, s) == electionAuthority,
                "invalid-ea-sig"
            );

            // --- compute and store H_i (single 32-byte slot) ---
            bytes32 hi = keccak256(
                abi.encodePacked(recTokens[i], voterPubKeys[i])
            );

            uniqueIdUsed[uid]   = true;
            recoveryHashes[uid] = hi;

            emit RecoveryTokenStored(uid, hi);
        }
    }

    // ---------------------------------------------------------------
    // 8-note vote submission
    // ---------------------------------------------------------------
    function voteSubmission(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[24] memory input,          // 8 roots | 8 nullifierHashes | 8 recipients
        address payable[8] memory recipients
    ) external payable nonReentrant {
        require(
            IVerifier(verifier).verifyProof(a, b, c, input),
            "invalid-proof"
        );

        for (uint i = 0; i < 8; i++) {
            uint256 root          = input[i];
            uint256 nullifierHash = input[8 + i];

            require(!nullifierHashes[nullifierHash], "already-spent");
            require(roots[root], "not-root");

            nullifierHashes[nullifierHash] = true;

            address payable recipient = recipients[i];

            for (uint j = 0; j < candidates.length; j++) {
                if (candidates[j].Candidate_Address == recipient) {
                    candidates[j].voteCount++;
                    break;
                }
            }

            (bool sent, ) = recipient.call{value: denomination}("");
            require(sent, "payment-failed");

            emit VoteSubmission(recipient, nullifierHash);
        }
    }

    // ---------------------------------------------------------------
    // Aggregated ElGamal ciphertext
    // ---------------------------------------------------------------
    function updateAggregatedCiphertext(
        uint256 c1,
        uint256 c2
    ) external onlyOwner {
        _finalAggCipher = ElGamalCiphertext({c1: c1, c2: c2});
        aggCipherLastUpdated = block.timestamp;
        emit AggregatedCiphertextUpdated(c1, c2, aggCipherLastUpdated);
    }

    function getAggregatedCiphertext()
        external
        view
        returns (uint256 c1, uint256 c2, uint256 lastUpdated)
    {
        ElGamalCiphertext memory ct = _finalAggCipher;
        return (ct.c1, ct.c2, aggCipherLastUpdated);
    }
}
