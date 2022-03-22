const { createModules } = require('./initialise');
const { Network } = require('./network');
const {toHexString} = require("@chainsafe/ssz");

body = {
    startSlot: 3424959,
    count: 5, 
    step: 1
}

async function launch(){
    const { status, options, beaconConfig, libp2p, logger, signal } = await createModules();
    const network = await new Network(options.network, {
        status,
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
    const nodeState = ["Connected to peers", `peers: ${network.getConnectedPeers().length}`];
    logger.info(nodeState.join(" - "));

    const connectedPeers = await network.getConnectedPeers();
    if(connectedPeers.length > 0){
        const response = await network.reqResp.beaconBlocksByRange(connectedPeers[0], body);
        if(response != null || response != undefined){
            console.log();
            console.log("Peer returned " + response.length + " blocks.");
            for(let i = 0; i < response.length; i++){
                console.log();
                console.log("Slot: " + response[i].message.slot);
                console.log("Proposer index: " + response[i].message.proposerIndex);
                console.log("Parent root: " + toHexString(response[i].message.parentRoot));
                console.log("State root: " + toHexString(response[i].message.stateRoot));            
            }                
        }
    }
    
    setTimeout(print, 12000, network, logger);
}







