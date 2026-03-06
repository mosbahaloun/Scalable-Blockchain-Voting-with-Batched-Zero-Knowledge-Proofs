// SPDX-License-Identifier: NONE
pragma solidity ^0.8.27;

import "./MiMCSponge.sol";
import "./ReentrancyGuard.sol";

interface IVerifier {
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[48] memory input  // 16-batch withdraw: 16*3 = 48 public signals
    ) external view returns (bool);
}

contract Tornado is ReentrancyGuard {
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
    Candidate[] public candidates;

    mapping(string => bool) public voters;
    mapping(address => bool) public Candidate_check;

    uint8 public treeLevel = 10;
    uint256 public denomination = 0.01 ether;

    // BATCH_DEPOSIT = 16, matching the BatchDeposit16 circuit
    uint256 public constant BATCH_DEPOSIT = 16;

    uint256 public nextLeafIdx = 0;
    mapping(uint256 => bool) public roots;
    mapping(uint8 => uint256) lastLevelHash;
    mapping(uint256 => bool) public nullifierHashes;
    mapping(uint256 => bool) public commitments;

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

    // Emitted once per batch of 16 deposits
    event BatchDeposit(
        uint256[16] roots,
        uint256[16][10] hashPairings,
        uint8[16][10] pairDirections
    );
    event Withdrawal(address to, uint256 nullifierHash);

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

    /**
     * @notice Batch deposit 16 notes in a single transaction.
     *         Matches the BatchDeposit16 circuit which outputs 16 commitments.
     * @param _commitments   16 commitment hashes (circuit outputs commitment[0..15])
     * @param _newRoots      16 new Merkle roots, one per inserted leaf
     * @param hashPairings   level-major [10][16] sibling hashes for each leaf's Merkle path
     * @param hashDirections level-major [10][16] direction bits (0=left, 1=right) per leaf
     */
    function batchDeposit(
        uint256[16] calldata _commitments,
        uint256[16] calldata _newRoots,
        uint256[16][10] calldata hashPairings,
        uint8[16][10] calldata hashDirections
    ) external payable nonReentrant {
        // Must send exactly denomination × 16 (0.16 ETH)
        require(msg.value == denomination * BATCH_DEPOSIT, "incorrect-amount");
        require(nextLeafIdx + BATCH_DEPOSIT <= 2 ** treeLevel, "tree-full");

        for (uint256 i = 0; i < BATCH_DEPOSIT; i++) {
            require(!commitments[_commitments[i]], "existing-commitment");
            require(!roots[_newRoots[i]], "existing-root");

            commitments[_commitments[i]] = true;
            roots[_newRoots[i]] = true;
            nextLeafIdx += 1;
        }

        emit BatchDeposit(_newRoots, hashPairings, hashDirections);
    }

    function addVoter(string memory _candidateNames) public {
        require(!voters[_candidateNames], "nid-used");
        voters[_candidateNames] = true;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not-owner");
        _;
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

    // 16-note batch withdraw (unchanged)
    function withdraw(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[48] memory input, // 16 roots | 16 nullifierHashes | 16 recipients
        address payable[16] memory recipients
    ) external payable nonReentrant {
        require(
            IVerifier(verifier).verifyProof(a, b, c, input),
            "invalid-proof"
        );

        for (uint i = 0; i < 16; i++) {
            uint256 root          = input[i];
            uint256 nullifierHash = input[16 + i];

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

            emit Withdrawal(recipient, nullifierHash);
        }
    }

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
