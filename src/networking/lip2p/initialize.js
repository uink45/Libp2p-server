const { NodejsNode } = require("./node");
const { defaultNetworkOptions, defaultDiscv5Options } = require("./options");
const { ENR } = require("@chainsafe/discv5");
const { LevelDatastore }  = require("datastore-level");
const { isLocalMultiAddr, clearMultiaddrUDP } = require("./utilities");
const { readPeerId, initPeerId, BeaconNodeOptions } = require("@chainsafe/lodestar-cli/lib/config");
const { getBeaconPaths } = require("@chainsafe/lodestar-cli/lib/cmds/beacon/paths");
const { parseBeaconNodeArgs } = require("@chainsafe/lodestar-cli/lib/options");
const { fetchBootnodes } = require("@chainsafe/lodestar-cli/lib/networks");
const fs = require("node:fs");
const peerIdFile = ".\\peerId.json";


async function createNodeJsLibp2p(args, networkOpts = {}, nodeJsLibp2pOpts = {}) {
    const bootstrapEnrs = await fetchBootnodes(args.network);
    const bootEnrs = await convertToENR(bootstrapEnrs);

    // Beacon directories
    const beaconPaths = getBeaconPaths(args);
    // Peer Id
    await initPeerIdFile();
    const peerId = await readPeerId(peerIdFile);
    // Network options
    networkOpts = await initNetworkOptions(args, beaconPaths, bootEnrs);

    // NodeJs Libp2p Options
    nodeJsLibp2pOpts = { peerStoreDir: beaconPaths.peerStoreDir};
    const localMultiaddrs = networkOpts.localMultiaddrs || defaultNetworkOptions.localMultiaddrs;
    const bootMultiaddrs = networkOpts.bootMultiaddrs || defaultNetworkOptions.bootMultiaddrs;
    const enr = networkOpts.disv5?.enr;
    const { peerStoreDir } = nodeJsLibp2pOpts;
    
    if (enr !== undefined && typeof enr !== "string") {
        if (enr instanceof ENR) {
            if (enr.getLocationMultiaddr("udp") && !isLocalMultiAddr(enr.getLocationMultiaddr("udp"))) {
                clearMultiaddrUDP(enr);
            }
        }
        else {
            throw Error("network.discv5.enr must be an instance of ENR");
        }
    }
    let datastore = undefined;
    if (peerStoreDir) {
        datastore = new LevelDatastore(peerStoreDir);
        await datastore.open();
    }
    // Append discv5.bootEnrs to bootMultiaddrs if requested
    if (networkOpts.connectToDiscv5Bootnodes) {
        if (!networkOpts.bootMultiaddrs)
            networkOpts.bootMultiaddrs = [];
        if (!networkOpts.discv5)
            networkOpts.discv5 = defaultDiscv5Options;
        for (const enrOrStr of networkOpts.discv5.bootEnrs) {
            const enr = typeof enrOrStr === "string" ? ENR.decodeTxt(enrOrStr) : enrOrStr;
            const multiaddrTCP = enr.getLocationMultiaddr("tcp");
            const peerId = await enr.peerId();
            const multiaddrWithPeerId = `${multiaddrTCP}/p2p/${peerId.toB58String()}`;
            networkOpts.bootMultiaddrs.push(multiaddrWithPeerId);
        }
    }
    return new NodejsNode({
        peerId,
        addresses: { listen: localMultiaddrs },
        datastore,
        bootMultiaddrs: bootMultiaddrs,
    }, peerId, bootEnrs);
}
exports.createNodeJsLibp2p = createNodeJsLibp2p;

async function initNetworkOptions(args, beaconPaths, bootEnrs){
    const beaconNodeOptions = new BeaconNodeOptions({
        network: "mainnet",
        configFile: beaconPaths.configFile,
        beaconNodeOptionsCli: parseBeaconNodeArgs(args),
    });
    
    beaconNodeOptions.set({ network: { discv5: { bootEnrs } } });
    return beaconNodeOptions.getWithDefaults();
}

async function initPeerIdFile(){
    // Initialize peerId if does not exist
    if (!fs.existsSync(peerIdFile)) {
        await initPeerId(peerIdFile);
    }
}

async function convertToENR(bootstrapEnrs){
    var ENRS = [];
    for(let i = 0; i < bootstrapEnrs.length; i++){
        ENRS.push(ENR.decodeTxt(bootstrapEnrs[0]))
    }
    return ENRS;
}