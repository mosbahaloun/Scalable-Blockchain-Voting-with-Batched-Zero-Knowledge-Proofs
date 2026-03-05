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
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 14466074856931730639137305725969612937519316199474048593549634382427660158089;
    uint256 constant alphay  = 6504562738825964453011725035775578594351797867833246891507650984665602962151;
    uint256 constant betax1  = 16928101379354578774639228300623455102890221788532141812297974757240047195307;
    uint256 constant betax2  = 1181126457730306038071808093516080411880699159239745690348991813752179390529;
    uint256 constant betay1  = 9066007634831498789740831092607230952920578329171606416973903586412925095962;
    uint256 constant betay2  = 7009967815877960360029575630156075412488760548821785302560097845403286083917;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 3394525056457921975582966423386613538953032985130561001617017827957445731248;
    uint256 constant deltax2 = 12917066648941130316251959909281496278039065851703774360549934113620883680777;
    uint256 constant deltay1 = 7054544274026953718603722672784585509016024449090677846227774088499858432011;
    uint256 constant deltay2 = 14064204591629117346128291822499304904358593789960222253042957057945770603507;

    
    uint256 constant IC0x = 19036700629119325370417831858181797509895913035306694337801098041340343554925;
    uint256 constant IC0y = 4337516322873891238525821453161495614859446139769088395154660328799660320774;
    
    uint256 constant IC1x = 15842878813979780533068938237695090938539042272481813893524891028642402030604;
    uint256 constant IC1y = 21705602963508090152700869311303833887248300713166582647819306608860017479308;
    
    uint256 constant IC2x = 998800752126228649054584102303666332595841568492708362303321137254632945451;
    uint256 constant IC2y = 15755728134295772120230764438899446271386044630778548355565854434264760300996;
    
    uint256 constant IC3x = 3815254581927185404503672488334893079757192855198009131137001656282729487001;
    uint256 constant IC3y = 12283151211179864490713993059721411863423965843366113144521715237960166124653;
    
    uint256 constant IC4x = 21336502616646535386184035083965413448808745925585508549488788485918752390970;
    uint256 constant IC4y = 12814189176884123509035982991043032808817945036910137673476099923636120137188;
    
    uint256 constant IC5x = 18984253919376473273878690327315045664251626555852101411636785030282285952904;
    uint256 constant IC5y = 12311171577016491122020098476245593277188883893349412262523827512231040688491;
    
    uint256 constant IC6x = 18614344768678797365596602847136718427451290446170645337914068057259298475368;
    uint256 constant IC6y = 18401752882003374763814438598498269932248466521029557906533906123365034378662;
    
    uint256 constant IC7x = 14260471320133990755053835182654792391315950624243106011682751492907430494632;
    uint256 constant IC7y = 20123407320338536191136574147488741362302037040814376184430367798485639919018;
    
    uint256 constant IC8x = 12985405755626962876156141256237725519268830061457580691266312466433904947501;
    uint256 constant IC8y = 13376294188576064129049931074558270575714191016296592487025243307081944742792;
    
    uint256 constant IC9x = 5222098218862311535309523622606239365023549982479211401504051254711776305276;
    uint256 constant IC9y = 17033861002502331744120614180200258595185009369491859877645059683967165209217;
    
    uint256 constant IC10x = 5024145602743299814509595002571010086672062616638432079749648286146065811766;
    uint256 constant IC10y = 13685980993329864842246926960319248432718341529494905059762075817146792424063;
    
    uint256 constant IC11x = 1983299444478395066637191191023740787623769925750033628259273025238641348723;
    uint256 constant IC11y = 388114001143075372813036392450284396147244537627205481327964094254607261701;
    
    uint256 constant IC12x = 18820737696873005349930213673541270367128827261564554522385781228092816041227;
    uint256 constant IC12y = 18397363984594639103643042999716644747856112214661009089045094127754976134288;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[12] calldata _pubSignals) public view returns (bool) {
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
                
                g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))
                
                g1_mulAccC(_pVk, IC11x, IC11y, calldataload(add(pubSignals, 320)))
                
                g1_mulAccC(_pVk, IC12x, IC12y, calldataload(add(pubSignals, 352)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

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


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

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
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
