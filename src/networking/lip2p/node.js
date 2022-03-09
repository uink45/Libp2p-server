const Libp2p = require("libp2p");
const TCP = require("libp2p-tcp");
const Mplex = require("libp2p-mplex")
const { NOISE } = require("@chainsafe/libp2p-noise");
const { Discv5Discovery, ENR } = require("../discv5");

class NodejsNode extends Libp2p {
    constructor(options, peerId, bootstrapEnrs) {
        super({
            peerId: options.peerId,
            addresses: {
                listen: options.addresses.listen,
                announce: options.addresses.announce || [],
            },
            modules: {
                connEncryption: [NOISE],
                transport: [TCP],
                streamMuxer: [Mplex],
                peerDiscovery: [Discv5Discovery],
            },
            dialer: {
                maxParallelDials: 100,
                maxAddrsToDial: 4,
                maxDialsPerPeer: 2,
                dialTimeout: 30000,
            },
            connectionManager: {
                autoDial: false,
                maxConnections: 30,
                minConnections: 25,
            },
            datastore: options.datastore,
            peerStore: {
                persistence: !!options.datastore,
                threshold: 10,
            },
            config: {
                dht: {
                    randomWalk: {
                        enabled: false,
                        queriesPerPeriod: 1,
                        interval: 300000,
                        timeout: 10000
                    }
                },
                relay: {
                    enabled: false,
                    hop: {
                        enabled: false,
                        active: false,
                    },
                    advertise: {
                        enabled: false,
                        ttl: 0,
                        bootDelay: 0,
                    },
                    autoRelay: {
                        enabled: false,
                        maxListeners: 0,
                    },
                },
                discv5: {
                    enr: ENR.createFromPeerId(peerId),
                    bindAddr: "/ip4/0.0.0.0/udp/9000",
                    bootstrapEnrs: bootstrapEnrs,
                    searchInterval: 30000, // wa
                },
            },
        });
    }
}
exports.NodejsNode = NodejsNode;
