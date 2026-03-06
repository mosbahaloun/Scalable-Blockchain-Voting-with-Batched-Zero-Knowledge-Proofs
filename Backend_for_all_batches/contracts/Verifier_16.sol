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

contract Groth16Verifier_16_batches {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 2683237025873275903047340416757806801613611492750259643603735705208671350790;
    uint256 constant alphay  = 13079663624151408364984852024224996358628217060124109141055730031313701427174;
    uint256 constant betax1  = 11490223801553113231389729448470033490605511808155043011833766858757025022659;
    uint256 constant betax2  = 8827428079359021247169151132995637706662031527191382372506466140663935332005;
    uint256 constant betay1  = 13494635497847203233673462378237206792798741705200351994939459120263164116031;
    uint256 constant betay2  = 8946552358032381435890448307874794034521491122338764206302725091668833467045;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 21697166994339760322329699200008819142592621098266737925513545069321681108865;
    uint256 constant deltax2 = 1720917302542083098775750014708609128323716000775318972168011387668731133185;
    uint256 constant deltay1 = 11408069276292544562905399210049238698885805182425045954737673418072742534733;
    uint256 constant deltay2 = 19523349891430005489449028606728661768142358399561626529864541707247517297077;

    
    uint256 constant IC0x = 8198253103336407170170205753983025637492473485008635300609406441110876651197;
    uint256 constant IC0y = 4862245891648671058443990731254276606405553728665297801573813392510260255907;
    
    uint256 constant IC1x = 16382779691165838161019984434329030578653640265351572188201205338296878463146;
    uint256 constant IC1y = 5900035757890256973939937428198242068572984189127447391495064736189727257637;
    
    uint256 constant IC2x = 13054042236189790622370824720671729912313663392450031835556064531996867925012;
    uint256 constant IC2y = 10847222151038808986676396725768042876130956299318841789339895604813647945333;
    
    uint256 constant IC3x = 21022573769726560772981415298521536969684084315281463630869164779516634169462;
    uint256 constant IC3y = 17081293869837051850152971530217880806601236874029035598068989834105709169960;
    
    uint256 constant IC4x = 4910769725149971674250427607046572808135435059267555786170269925990138559379;
    uint256 constant IC4y = 19953150552091466329085168821512995518479192202115901951475863468447816511226;
    
    uint256 constant IC5x = 16925623782045714674731116966881291780115259908420227013654633288652125291699;
    uint256 constant IC5y = 18087223090640885572590943690758279577059226898611402306255197087607414230416;
    
    uint256 constant IC6x = 17664658986010052702062185501325321609998710845506112575011575665816187776734;
    uint256 constant IC6y = 3463708308952795364137010351213321494120826190307767622641138856522073561231;
    
    uint256 constant IC7x = 18840425876959206694495549963619660863692277791947132255606092518185125886072;
    uint256 constant IC7y = 178965425818203208493595363726433203910731980395874537113043465890536451395;
    
    uint256 constant IC8x = 17627315533525557398832433621105551565188441593143981500142241420550691833422;
    uint256 constant IC8y = 16653152835118405434497256427100254396035062814998949163473709476811179915883;
    
    uint256 constant IC9x = 8511814442332252465566956513837066902426925429373321077380705811792177354543;
    uint256 constant IC9y = 14406654244382454708185136546213275290424100393645713994583130656894006727735;
    
    uint256 constant IC10x = 6340764487867094718118568009040345288319570467841876806977757864584937933029;
    uint256 constant IC10y = 6338668239439402541322280041893857827438342358799001553191392289992955727404;
    
    uint256 constant IC11x = 4707456905130484661247410387534929800654115145079292312608302040470623263972;
    uint256 constant IC11y = 8965196992959765308991434785003120730887496154757852951964996602989834424647;
    
    uint256 constant IC12x = 19616208383932367228361629240491551425251895103612662581866997943090379737047;
    uint256 constant IC12y = 3924592199907850808346865659416985082816880496936116640824832329648632896807;
    
    uint256 constant IC13x = 7507508515265923793246907407738593718689619701140860846062571408565624840807;
    uint256 constant IC13y = 16154830180597184601712165738663943222136007939055993253321662386730553268950;
    
    uint256 constant IC14x = 12624238490914948457099240378126677830875858930188007200545364495064410434001;
    uint256 constant IC14y = 10847396058417139969210956452958035501083279100305350749599708074575510582644;
    
    uint256 constant IC15x = 6228355160775271999031976766852330982134985554506017218776040888400385522063;
    uint256 constant IC15y = 10300360164309222263523737080288529172255849765168661512010699182944638045990;
    
    uint256 constant IC16x = 14620276355205757334852730847054499447530082811685023480716345643537976281514;
    uint256 constant IC16y = 17746797950710097440000132859456999401873798934726166633413082154033230032377;
    
    uint256 constant IC17x = 19520753393631067831551073714288712550983681525843666622292573220889147554455;
    uint256 constant IC17y = 9309835603604933536426311271275713181477980829254681770832863643002136910701;
    
    uint256 constant IC18x = 13035010293805423142209687466415330837220852135479234104965238236220788553484;
    uint256 constant IC18y = 5685918662322165676911745260829664447013562518394248475499127483301342698986;
    
    uint256 constant IC19x = 6353934167468580837689859301283199439524476575017266188882033816397863934217;
    uint256 constant IC19y = 20409064261446107687995513376101173687882209822610939059143583602150504730407;
    
    uint256 constant IC20x = 13755707615426251231127724281520691767857376213376197994673910744452749000263;
    uint256 constant IC20y = 18714095242980916671440919359105810054604131394704738932281088375620516986675;
    
    uint256 constant IC21x = 12885517325541181681171070644735586998306140477842227717712144557403940577956;
    uint256 constant IC21y = 21105117835103341969651028542968571248848582917061827334061398190683240721374;
    
    uint256 constant IC22x = 1504203917819837969782795348035068812760034723593033595428880902617149330817;
    uint256 constant IC22y = 18204156871390665167198034256350045362289215425622141145884579999768899023769;
    
    uint256 constant IC23x = 14490889512996741422988998831695867642402333580977646875886278890628946666347;
    uint256 constant IC23y = 10076590657677006940235721944046888553580234924058198989748899254867577441067;
    
    uint256 constant IC24x = 9185550498528055186340731753864957443572694267956913206241903330117670768283;
    uint256 constant IC24y = 10885197133278967383231215543671948486074794136056787711557101250431869450374;
    
    uint256 constant IC25x = 3289372502388135292777961352345002859333189231627317985581631656670065938576;
    uint256 constant IC25y = 11017473994939680459176589304062772224171636793357515425840013791998002016759;
    
    uint256 constant IC26x = 16295468744046829134729750449161184638225999737258388719690759207015037982658;
    uint256 constant IC26y = 10595044444672224718180726825679164953694914184623823414747284894526907006160;
    
    uint256 constant IC27x = 5144675626874147651529884319293240769757957961016234557618022145302528930180;
    uint256 constant IC27y = 8008564211777721758617909787415804566888807422924962426220041044143890215687;
    
    uint256 constant IC28x = 9223320262336650085802150961467379499975888403398878776268337987577294931862;
    uint256 constant IC28y = 3291331699745961129043155248446484083330069295279877603720700095085428348979;
    
    uint256 constant IC29x = 10129112610866176415777689781302542496363574155824852194664872753112112672602;
    uint256 constant IC29y = 21275722670570673367931214954069128742565656268857068548787088116615638372159;
    
    uint256 constant IC30x = 4502972923897054504718354736443317997455799021623463635277849784677935792445;
    uint256 constant IC30y = 19717446637306696555191465343418206734876322554336130763095261037424184294790;
    
    uint256 constant IC31x = 17437244373857982596534476917323023484746723060149576887136051983838665733066;
    uint256 constant IC31y = 13675515397660292837339888283078145620900479612239568844210786218467014335409;
    
    uint256 constant IC32x = 2050805756793195256495641274608635935936576742683859586355741606184242620746;
    uint256 constant IC32y = 2100610578030750288991719930314917082963070867822502924619173969420307034573;
    
    uint256 constant IC33x = 8355864184103550101027595900205624264282243187353550282706891797518854218260;
    uint256 constant IC33y = 2565289616259808709873191923386990831371777936641374312193665810784563301047;
    
    uint256 constant IC34x = 15846607304619419181221932446449212337340987794108364622175658175568394950513;
    uint256 constant IC34y = 5128490831032399883351256268860880532775141933459195121656257002219216717752;
    
    uint256 constant IC35x = 17194690661329834877192613929074671076474869827525209794305147907222860819763;
    uint256 constant IC35y = 19108354804040598327564151773039695228051895934214280486012202849140664654867;
    
    uint256 constant IC36x = 246239676396186814230040986102804866931949207954842249841410615585668646572;
    uint256 constant IC36y = 14863357471544360629350832560427806520144406542327853733038595587771322511346;
    
    uint256 constant IC37x = 5782657261499854176296382953944312811582958302542547291458765020440455753634;
    uint256 constant IC37y = 1357133840135345184815224507636271745321898075250520577043840924249809741818;
    
    uint256 constant IC38x = 19037755250952421963677191147824023837130250279050295017624118280240686983561;
    uint256 constant IC38y = 4040715830569163475395118421889665685264556418325826334333141593925574582615;
    
    uint256 constant IC39x = 7523023445785591623597988038402775936570979086740271532970993349212115249567;
    uint256 constant IC39y = 622717283433206726381818132187506687072032703979033197189231951239563219989;
    
    uint256 constant IC40x = 20534317689623181060489446376484894999439754240006022822561915456545275404393;
    uint256 constant IC40y = 19473321509582831705039413208145614948002589556115377794551507289765088624047;
    
    uint256 constant IC41x = 2201812739582348618659918992067819830281714648542565620467667996069081837626;
    uint256 constant IC41y = 17168404006055427370675333681929198104577012363752356927531561610215381091081;
    
    uint256 constant IC42x = 10481006657846782510566079385926295846060617469437131183123776135325458264497;
    uint256 constant IC42y = 11334319153764525418546790800935624369396163369506131475628823537408488059779;
    
    uint256 constant IC43x = 7468839172227602927328652923613321454617714278604998098921248269920104272765;
    uint256 constant IC43y = 18844448646613565556508239271691901814941845486504111737980653394661297289848;
    
    uint256 constant IC44x = 1243823641303656117074667097567981155756006249809735196531810359211803336635;
    uint256 constant IC44y = 18866708602107536482963966715988078790686843323022789111135148115192778134646;
    
    uint256 constant IC45x = 16192225665623982612141666496343102557365237839828277325451704151076087070588;
    uint256 constant IC45y = 6341054854364518017921937292870355428448931809693012449089915289705256938956;
    
    uint256 constant IC46x = 7063516879537625188046700468796717081677612251185411181438451743464845627720;
    uint256 constant IC46y = 16172114224318195699995302890488323601413371275550244297404696439883368515452;
    
    uint256 constant IC47x = 4221120772648673649784551561236402080121240667386756497591477396946078900526;
    uint256 constant IC47y = 1138955468584451616631087848043029541961062370330653663062322546446266909799;
    
    uint256 constant IC48x = 9171956761390818909061472616863930580315382535031114106505224535806925815200;
    uint256 constant IC48y = 218636033473963733882772572027114751241002501073350096698557860012017079345;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[48] calldata _pubSignals) public view returns (bool) {
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
                
                g1_mulAccC(_pVk, IC13x, IC13y, calldataload(add(pubSignals, 384)))
                
                g1_mulAccC(_pVk, IC14x, IC14y, calldataload(add(pubSignals, 416)))
                
                g1_mulAccC(_pVk, IC15x, IC15y, calldataload(add(pubSignals, 448)))
                
                g1_mulAccC(_pVk, IC16x, IC16y, calldataload(add(pubSignals, 480)))
                
                g1_mulAccC(_pVk, IC17x, IC17y, calldataload(add(pubSignals, 512)))
                
                g1_mulAccC(_pVk, IC18x, IC18y, calldataload(add(pubSignals, 544)))
                
                g1_mulAccC(_pVk, IC19x, IC19y, calldataload(add(pubSignals, 576)))
                
                g1_mulAccC(_pVk, IC20x, IC20y, calldataload(add(pubSignals, 608)))
                
                g1_mulAccC(_pVk, IC21x, IC21y, calldataload(add(pubSignals, 640)))
                
                g1_mulAccC(_pVk, IC22x, IC22y, calldataload(add(pubSignals, 672)))
                
                g1_mulAccC(_pVk, IC23x, IC23y, calldataload(add(pubSignals, 704)))
                
                g1_mulAccC(_pVk, IC24x, IC24y, calldataload(add(pubSignals, 736)))
                
                g1_mulAccC(_pVk, IC25x, IC25y, calldataload(add(pubSignals, 768)))
                
                g1_mulAccC(_pVk, IC26x, IC26y, calldataload(add(pubSignals, 800)))
                
                g1_mulAccC(_pVk, IC27x, IC27y, calldataload(add(pubSignals, 832)))
                
                g1_mulAccC(_pVk, IC28x, IC28y, calldataload(add(pubSignals, 864)))
                
                g1_mulAccC(_pVk, IC29x, IC29y, calldataload(add(pubSignals, 896)))
                
                g1_mulAccC(_pVk, IC30x, IC30y, calldataload(add(pubSignals, 928)))
                
                g1_mulAccC(_pVk, IC31x, IC31y, calldataload(add(pubSignals, 960)))
                
                g1_mulAccC(_pVk, IC32x, IC32y, calldataload(add(pubSignals, 992)))
                
                g1_mulAccC(_pVk, IC33x, IC33y, calldataload(add(pubSignals, 1024)))
                
                g1_mulAccC(_pVk, IC34x, IC34y, calldataload(add(pubSignals, 1056)))
                
                g1_mulAccC(_pVk, IC35x, IC35y, calldataload(add(pubSignals, 1088)))
                
                g1_mulAccC(_pVk, IC36x, IC36y, calldataload(add(pubSignals, 1120)))
                
                g1_mulAccC(_pVk, IC37x, IC37y, calldataload(add(pubSignals, 1152)))
                
                g1_mulAccC(_pVk, IC38x, IC38y, calldataload(add(pubSignals, 1184)))
                
                g1_mulAccC(_pVk, IC39x, IC39y, calldataload(add(pubSignals, 1216)))
                
                g1_mulAccC(_pVk, IC40x, IC40y, calldataload(add(pubSignals, 1248)))
                
                g1_mulAccC(_pVk, IC41x, IC41y, calldataload(add(pubSignals, 1280)))
                
                g1_mulAccC(_pVk, IC42x, IC42y, calldataload(add(pubSignals, 1312)))
                
                g1_mulAccC(_pVk, IC43x, IC43y, calldataload(add(pubSignals, 1344)))
                
                g1_mulAccC(_pVk, IC44x, IC44y, calldataload(add(pubSignals, 1376)))
                
                g1_mulAccC(_pVk, IC45x, IC45y, calldataload(add(pubSignals, 1408)))
                
                g1_mulAccC(_pVk, IC46x, IC46y, calldataload(add(pubSignals, 1440)))
                
                g1_mulAccC(_pVk, IC47x, IC47y, calldataload(add(pubSignals, 1472)))
                
                g1_mulAccC(_pVk, IC48x, IC48y, calldataload(add(pubSignals, 1504)))
                

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
            
            checkField(calldataload(add(_pubSignals, 768)))
            
            checkField(calldataload(add(_pubSignals, 800)))
            
            checkField(calldataload(add(_pubSignals, 832)))
            
            checkField(calldataload(add(_pubSignals, 864)))
            
            checkField(calldataload(add(_pubSignals, 896)))
            
            checkField(calldataload(add(_pubSignals, 928)))
            
            checkField(calldataload(add(_pubSignals, 960)))
            
            checkField(calldataload(add(_pubSignals, 992)))
            
            checkField(calldataload(add(_pubSignals, 1024)))
            
            checkField(calldataload(add(_pubSignals, 1056)))
            
            checkField(calldataload(add(_pubSignals, 1088)))
            
            checkField(calldataload(add(_pubSignals, 1120)))
            
            checkField(calldataload(add(_pubSignals, 1152)))
            
            checkField(calldataload(add(_pubSignals, 1184)))
            
            checkField(calldataload(add(_pubSignals, 1216)))
            
            checkField(calldataload(add(_pubSignals, 1248)))
            
            checkField(calldataload(add(_pubSignals, 1280)))
            
            checkField(calldataload(add(_pubSignals, 1312)))
            
            checkField(calldataload(add(_pubSignals, 1344)))
            
            checkField(calldataload(add(_pubSignals, 1376)))
            
            checkField(calldataload(add(_pubSignals, 1408)))
            
            checkField(calldataload(add(_pubSignals, 1440)))
            
            checkField(calldataload(add(_pubSignals, 1472)))
            
            checkField(calldataload(add(_pubSignals, 1504)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
