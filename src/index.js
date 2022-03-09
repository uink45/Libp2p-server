const { createNodeJsLibp2p } = require("./networking/lip2p/initialize");
const { args } = require("./args");
const { Network } = require("./networking/network");
const {ssz} = require("@chainsafe/lodestar-types");
const {toHexString} = require("@chainsafe/ssz");
const body = {
    startSlot: 1,
    count: 64,  
    step: 1
}
const block = ssz.phase0.SignedBeaconBlock.defaultValue();
async function launch(){
    let libp2p = await createNodeJsLibp2p(args);
    let network = new Network(libp2p);
    await network.start();
    try{
        connect(network.libp2p.connections, network);
    }
    catch(e){
        console.log("Stream reset error. Creating new stream...")
        connect(network.libp2p.connections,network);
    }
    
}

async function connect(libp2p, network){
    var items = 0;
    for(const connections of libp2p){
        if(connections[1][0].stat.status == "open"){
            //const response = await network.reqResp.metaData(connections[1][0].remotePeer);
            //const response = await network.reqResp.ping(connections[1][0].remotePeer, BigInt(0));
            const response = await network.reqResp.beaconBlocksByRange(connections[1][0].remotePeer, body );
            
            items++;
            if(response != null || response != undefined){
                console.log();
                console.log("Peer " + connections[1][0].id + " returned " + response.length + " blocks.");
                for(let i = 0; i < response.length; i++){
                    console.log("Slot: " + response[i].message.slot);
                    console.log("Proposer index: " + response[i].message.proposerIndex);
                    console.log("Parent root: " + toHexString(response[i].message.parentRoot));
                    console.log("State root: " + toHexString(response[i].message.stateRoot));            
                }                
            }
        }
    }
    console.log("Connected to " + items + " peers.");
    
    setTimeout(connect, 4000, libp2p, network);
}

launch();