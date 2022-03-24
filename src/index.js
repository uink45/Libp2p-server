const { createModules } = require('./initialise');
const { Network } = require('./network');
const {toHexString} = require("@chainsafe/ssz");
const {ssz} = require("@chainsafe/lodestar-types");
const { getApi } = require("./network/api/impl/api");
const { RestApi } = require("./network/api/rest");

async function launch(){
    const { options, beaconConfig, libp2p, logger, signal } = await createModules();
    const network = await new Network(options.network, {
        config: beaconConfig,
        libp2p,
        logger: logger.child(options.logger.network),
        metrics: null,
        signal,
    })
    /*
    const api = getApi(options.api, {
        config: beaconConfig,
        currentState: state,
        network,
    });
    const restApi = new RestApi(options.api.rest, {
        config: beaconConfig,
        logger: logger.child(options.logger.api),
        api,
    });
    await restApi.listen();
    */
    await network.start();  
    print(network, logger);
}

launch();


async function print(network, logger){
    const connectedPeers = await network.getConnectedPeers();
    if(connectedPeers.length < 3){
        logger.info("Searching peers - " + `Peer count ${network.getConnectedPeers().length}`);
        network.peerManager.discovery.discoverPeers(30);
    }
    else{
        const nodeState = ["Connected to peers", `${network.getConnectedPeers().length}`];
        logger.info(nodeState.join(" - "));        
        const finalizedBlockRequest = {
            startSlot: ((Math.floor(network.clock.currentSlot / 32) - 2) * 32),
            count: 1,
            step: 1,
        }
        const currentBlockRequest = {
            startSlot: network.clock.currentSlot,
            count: 1, 
            step: 1
        }
        const finalizedBlock = await requestBlocks(network, connectedPeers, finalizedBlockRequest, logger); 
        const currentBlock = await requestBlocks(network,connectedPeers, currentBlockRequest, logger); 
        storeBlocks(network, finalizedBlock, currentBlock);
    }
    setTimeout(print, 12000, network, logger);
}

async function requestBlocks(network, connectedPeers, body, logger){
    var response;
    var isValid = false;

    while(!isValid){
        try{
            response = await network.reqResp.beaconBlocksByRange(connectedPeers[random(0, connectedPeers.length - 1)], body);  
        }
        catch(error){
            requestBlocks(network, connectedPeers, body, logger);
        }        
        if(response != undefined && response[0] != undefined){
            isValid = true;
        }  
    }
    if(isValid){
        return response;
    }
    else {
        return null;
    }               
}

function storeBlocks(network, finalizedBlock, currentBlock){
    if(finalizedBlock != null & currentBlock != null){
        network.peerManager.blocks.updateStatusBlock(finalizedBlock[0], currentBlock[0]);
        printResponse(currentBlock);    
    } 
}

function random(min, max) {
    return Math.floor(min + Math.random() * (max - min));
}

function printResponse(response){  
    for(let i = 0; i < 1; i++){
        console.log();
        console.log("Latest block");
        console.log("============");
        console.log("Slot: " + response[i].message.slot);
        console.log("Proposer index: " + response[i].message.proposerIndex);
        console.log("Block root: " + toHexString(ssz.phase0.BeaconBlockHeader.createTreeBackedFromStruct(response[i].message).hashTreeRoot()));
        console.log("Parent root: " + toHexString(response[i].message.parentRoot));
        console.log("State root: " + toHexString(response[i].message.stateRoot));         
        console.log("Sync aggregate: ");
        console.log("  |  ");
        console.log("  | Sync committee bits: " + toHexString(ssz.altair.SyncCommitteeBits.createTreeBackedFromStruct((response[i].message.body.syncAggregate.syncCommitteeBits)).serialize()));
        console.log("  | Sync committee signature: " + toHexString(response[i].message.body.syncAggregate.syncCommitteeSignature));    
        console.log();    
    }    
}
  









