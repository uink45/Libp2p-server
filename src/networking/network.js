
const Gossipsub = require("@chainsafe/lodestar/node_modules/libp2p-gossipsub");
const { gossipsubParams } = require("./gossipsub/gossipsub");
const { ReqResp } = require("./reqResp/reqResp");

class Network{
    constructor(libp2p){
        this.libp2p = libp2p;
        this.reqResp = new ReqResp(libp2p);
        this.gossipSub = new Gossipsub(libp2p, gossipsubParams);
    }
    
    async start(){
        // Start services
        await this.libp2p.start();
        await this.gossipSub.start();

        // Stop latency monitor
        this.libp2p.connectionManager._latencyMonitor.stop();
    }
}

exports.Network = Network;
