// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract Groth16Verifier {
    // Scalar field size
    uint256 constant r =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q =
        21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax =
        10866995740938740631598067018007258388873051000014692985949436209427006215367;
    uint256 constant alphay =
        17472983614755548466449080038901889476906787059063089020747501067986783279913;
    uint256 constant betax1 =
        20772395683947416971414877329105665394795862710739054863059570280783071388493;
    uint256 constant betax2 =
        3980858818832394609067674591401222869355335234665782667000588038033697838715;
    uint256 constant betay1 =
        18511929583520129523581953590677420478213294556956346424420741726109599812553;
    uint256 constant betay2 =
        21105969585022336303146425144235474285526729493376231900365453702946857707188;
    uint256 constant gammax1 =
        11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 =
        10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 =
        4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 =
        8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 =
        3691812821006655877595443033368444086271669314094745275180148141057978396562;
    uint256 constant deltax2 =
        10913389607273158044259058652367280632624062275214687285627395815862760927327;
    uint256 constant deltay1 =
        6281874875523703240606413723999013119735370619129184117020758791631410279880;
    uint256 constant deltay2 =
        14815001445040448912883799565186282974120066929608728322376854971446005281809;

    uint256 constant IC0x =
        15433380018187790156359561173171914165014938601634107950797901758721913619333;
    uint256 constant IC0y =
        14741333826491712780700286181807700663509532672453986586291907471161955593922;

    uint256 constant IC1x =
        15023399465048296531248638619246055205793961187608171895458176684549503610172;
    uint256 constant IC1y =
        20176255672961955570391198461562461695381747015921177613460844615075990820088;

    uint256 constant IC2x =
        14245882160628668298853285380493408241486426002095986059168376594197295052882;
    uint256 constant IC2y =
        1151810204140694621468190008092025502152184976146629688725676149754424520988;

    uint256 constant IC3x =
        7101141059157932110349466560442368310266897507280380204433771111200803296773;
    uint256 constant IC3y =
        6702520631036653764687023890792640460437766323676905127416956674663626344884;

    uint256 constant IC4x =
        1867989031141324836616366849208633350149722340142963975177105840593854371224;
    uint256 constant IC4y =
        2712536872334103831969844060226223608493789635379621705836467949618144806226;

    uint256 constant IC5x =
        19739894288482283305119955477791682444269014186822132380580337945243074477561;
    uint256 constant IC5y =
        9406046887415723630752173188579058814074987676001457094506905116361450812791;

    uint256 constant IC6x =
        3194825891613580140508838665951260397845785110480212810257178507874043293509;
    uint256 constant IC6y =
        21254147638691909652402765461543021503061849680339120466481420908823971779423;

    uint256 constant IC7x =
        6607758878360304261146130322286308229327807663017551148630191652746422430387;
    uint256 constant IC7y =
        4231269415428098889291647578609325108792237064118432192575354120326519648732;

    uint256 constant IC8x =
        18065414457856741848485221476886212382029890705381238591210924998889616054431;
    uint256 constant IC8y =
        617599599414816289273355210959878873297082411253469012740590381224997898126;

    uint256 constant IC9x =
        14865136185912125816359666131402991733549172622351896977166258778251418401144;
    uint256 constant IC9y =
        9896877475008876856237535141534542086231084235052461517984117183917357779338;

    uint256 constant IC10x =
        18034777194161238876508320310614457245632995275631781702928660480462793759867;
    uint256 constant IC10y =
        20843493020903291217886449412019134973334058196658529891195778143827727523912;

    uint256 constant IC11x =
        11062864570535218177026081235096828914835529771782310551430441701342384461756;
    uint256 constant IC11y =
        7483340388955313699402111629988450307270953812768864930961758938210272323828;

    uint256 constant IC12x =
        11211080787309614922560452079067734941951192186517007577479643540636160982672;
    uint256 constant IC12y =
        18470010624193195072785211491470571552855456011943883534027958967888758878998;

    uint256 constant IC13x =
        17878168003735086996418758838003887319401738337371783946809352120189899751060;
    uint256 constant IC13y =
        15219026436548017579386544380530592362306499639662840460076535911757745822598;

    uint256 constant IC14x =
        13461933605206079232151970601318824333127604270789966805897745674391572302728;
    uint256 constant IC14y =
        8949860363563195583029599016229537745421672326587252752391914739737699098655;

    uint256 constant IC15x =
        15294344858396137779106130109945231696483529729058474840070301508475136170722;
    uint256 constant IC15y =
        13048041235289487702047667698751947606457269819648633072814029944197658815468;

    uint256 constant IC16x =
        13543566022482502954576592558520346785400016128816351776431305887608420622465;
    uint256 constant IC16y =
        6302201589406174162657155331649459447271811377558659490307993520640058496958;

    uint256 constant IC17x =
        919137136666051613734135815848240176183950822209399089444099448928761517759;
    uint256 constant IC17y =
        6283310346513345121023870863881459399044174951097789414907720550142517012803;

    uint256 constant IC18x =
        9040780079408036663400238319518889082182208580540995468192352284016077784466;
    uint256 constant IC18y =
        6007637021274813205356962518521049585910587355904848514812481075025002882835;

    uint256 constant IC19x =
        10520655254052700249662903297599717844564456135480260720333138141994896966911;
    uint256 constant IC19y =
        3688926748859006238231258960421933562313361617409557108990595227178802014395;

    uint256 constant IC20x =
        11582500161600655299528649987418728475682894238594786967053703919496850843179;
    uint256 constant IC20y =
        16785141656589098918457059681769579471341298167327311627246413743623001418279;

    uint256 constant IC21x =
        10024401556303518802887154048289955011698668691741024405007582767591203312339;
    uint256 constant IC21y =
        9447907323876829633118369389324419639833253308184719740466165219072131453410;

    uint256 constant IC22x =
        18460432462511776524372423527693447789304940914792452445434864391082589006443;
    uint256 constant IC22y =
        19083135031026229758125415318474712262295878790947607371600738493802197838819;

    uint256 constant IC23x =
        20906075987490001671085389480775184595309989344960660715453400142879962518237;
    uint256 constant IC23y =
        1817627343826450936172718525117803934650241676734712173140679491038966560631;

    uint256 constant IC24x =
        11150500470890120306680890694175136118053518903863809728443467071117705154959;
    uint256 constant IC24y =
        9500010734963763070670879924383506532515690094459886841688793924618433089038;

    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[24] calldata _pubSignals
    ) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x

                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))

                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))

                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))

                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))

                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))

                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))

                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))

                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))

                g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))

                g1_mulAccC(
                    _pVk,
                    IC10x,
                    IC10y,
                    calldataload(add(pubSignals, 288))
                )

                g1_mulAccC(
                    _pVk,
                    IC11x,
                    IC11y,
                    calldataload(add(pubSignals, 320))
                )

                g1_mulAccC(
                    _pVk,
                    IC12x,
                    IC12y,
                    calldataload(add(pubSignals, 352))
                )

                g1_mulAccC(
                    _pVk,
                    IC13x,
                    IC13y,
                    calldataload(add(pubSignals, 384))
                )

                g1_mulAccC(
                    _pVk,
                    IC14x,
                    IC14y,
                    calldataload(add(pubSignals, 416))
                )

                g1_mulAccC(
                    _pVk,
                    IC15x,
                    IC15y,
                    calldataload(add(pubSignals, 448))
                )

                g1_mulAccC(
                    _pVk,
                    IC16x,
                    IC16y,
                    calldataload(add(pubSignals, 480))
                )

                g1_mulAccC(
                    _pVk,
                    IC17x,
                    IC17y,
                    calldataload(add(pubSignals, 512))
                )

                g1_mulAccC(
                    _pVk,
                    IC18x,
                    IC18y,
                    calldataload(add(pubSignals, 544))
                )

                g1_mulAccC(
                    _pVk,
                    IC19x,
                    IC19y,
                    calldataload(add(pubSignals, 576))
                )

                g1_mulAccC(
                    _pVk,
                    IC20x,
                    IC20y,
                    calldataload(add(pubSignals, 608))
                )

                g1_mulAccC(
                    _pVk,
                    IC21x,
                    IC21y,
                    calldataload(add(pubSignals, 640))
                )

                g1_mulAccC(
                    _pVk,
                    IC22x,
                    IC22y,
                    calldataload(add(pubSignals, 672))
                )

                g1_mulAccC(
                    _pVk,
                    IC23x,
                    IC23y,
                    calldataload(add(pubSignals, 704))
                )

                g1_mulAccC(
                    _pVk,
                    IC24x,
                    IC24y,
                    calldataload(add(pubSignals, 736))
                )

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(
                    add(_pPairing, 32),
                    mod(sub(q, calldataload(add(pA, 32))), q)
                )

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))

                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)

                let success := staticcall(
                    sub(gas(), 2000),
                    8,
                    _pPairing,
                    768,
                    _pPairing,
                    0x20
                )

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F

            checkField(calldataload(add(_pubSignals, 0)))

            checkField(calldataload(add(_pubSignals, 32)))

            checkField(calldataload(add(_pubSignals, 64)))

            checkField(calldataload(add(_pubSignals, 96)))

            checkField(calldataload(add(_pubSignals, 128)))

            checkField(calldataload(add(_pubSignals, 160)))

            checkField(calldataload(add(_pubSignals, 192)))

            checkField(calldataload(add(_pubSignals, 224)))

            checkField(calldataload(add(_pubSignals, 256)))

            checkField(calldataload(add(_pubSignals, 288)))

            checkField(calldataload(add(_pubSignals, 320)))

            checkField(calldataload(add(_pubSignals, 352)))

            checkField(calldataload(add(_pubSignals, 384)))

            checkField(calldataload(add(_pubSignals, 416)))

            checkField(calldataload(add(_pubSignals, 448)))

            checkField(calldataload(add(_pubSignals, 480)))

            checkField(calldataload(add(_pubSignals, 512)))

            checkField(calldataload(add(_pubSignals, 544)))

            checkField(calldataload(add(_pubSignals, 576)))

            checkField(calldataload(add(_pubSignals, 608)))

            checkField(calldataload(add(_pubSignals, 640)))

            checkField(calldataload(add(_pubSignals, 672)))

            checkField(calldataload(add(_pubSignals, 704)))

            checkField(calldataload(add(_pubSignals, 736)))

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
            return(0, 0x20)
        }
    }
}
