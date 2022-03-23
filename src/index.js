const { createModules } = require('./initialise');
const { Network } = require('./network');
const {toHexString} = require("@chainsafe/ssz");
const {ssz} = require("@chainsafe/lodestar-types");

async function launch(){
    const { state, options, beaconConfig, libp2p, logger, signal } = await createModules();
    const network = await new Network(options.network, {
        state,
        config: beaconConfig,
        libp2p,
        logger: logger.child(options.logger.network),
        metrics: null,
        signal,
    })
    
    await network.start();
    print(network, logger);
}

launch();

async function print(network, logger){
    const connectedPeers = await network.getConnectedPeers();
    if(connectedPeers.length < 3){
        logger.info("Searching peers - " + `Peer count ${network.getConnectedPeers().length}`);
        network.peerManager.discovery.discoverPeers(20);
    }
    else{
        const nodeState = ["Connected to peers", `${network.getConnectedPeers().length}`];
        logger.info(nodeState.join(" - "));        
        const body = {
            startSlot: network.clock.currentSlot,
            count: 1, 
            step: 1
        }
        const response = await network.reqResp.beaconBlocksByRange(connectedPeers[Math.floor(Math.random())], body);            
        if(response != null || response != undefined){
            if(response.message != null || response.message != undefined){
                network.peerManager.blocks.createStatusBlock(response[response.length - 1]);
            }         
            printResponse(response);
        }        
   
    }
    setTimeout(print, 12000, network, logger);
}


function printResponse(response){  
    for(let i = 0; i < response.length; i++){
        console.log();
        console.log("Slot: " + response[i].message.slot);
        console.log("Proposer index: " + response[i].message.proposerIndex);
        console.log("Block root: " + toHexString(ssz.phase0.BeaconBlockHeader.createTreeBackedFromStruct(response[i].message).hashTreeRoot()));
        console.log("Parent root: " + toHexString(response[i].message.parentRoot));
        console.log("State root: " + toHexString(response[i].message.stateRoot));         
        
    }    
}
  









