// Use remote peer for the peer-id.
const { ProtocolsSupported, ProtocolPrefix, Method, Version, Encoding } = require("./types");
const { submitRequest } = require("./request");

class ReqResp{
    constructor(libp2p, config){
        this.libp2p = libp2p;
        this.config = config; 
        this.reqCount = 0;
        this.controller = new AbortController();
    }
    async ping(peerId, request){
        return await this.sendRequest(peerId, "ping", [Version.V1], request);
    }

    async status(peerId, request){
        return await this.sendRequest(peerId, "status", [Version.V1], request);
    }

    async metaData(peerId){
        return await this.sendRequest(peerId, "metadata", [Version.V1], null)
    }

    async beaconBlocksByRange(peerId, request){
        return await this.sendRequest(peerId, "beacon_blocks_by_range", [Version.V1], request);
    }

    async sendRequest(peerId, method, versions, body, maxResponses = 1){
        const encoding = Encoding.SSZ_SNAPPY;
        const result = await submitRequest({libp2p: this.libp2p}, peerId, method, encoding, versions, body, maxResponses, this.controller.signal, this.reqCount++);
        return result;
    }
}
exports.ReqResp = ReqResp;