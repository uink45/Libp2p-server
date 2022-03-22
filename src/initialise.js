const { readPeerId, FileENR, overwriteEnrWithCliArgs, getBeaconConfigFromArgs } = require("@chainsafe/lodestar-cli/lib/config");
const { initializeOptionsAndConfig, persistOptionsAndConfig } = require("@chainsafe/lodestar-cli/lib/cmds/init/handler");
const { getCliLogger, onGracefulShutdown } = require("@chainsafe/lodestar-cli/lib/util");
const { getBeaconPaths } = require("@chainsafe/lodestar-cli/lib/cmds/beacon/paths");
const { getVersion } = require("@chainsafe/lodestar-cli/lib/util/version");
const { fetchWeakSubjectivityState } = require("./network/networks/index");
const { parseEnrArgs } = require("@chainsafe/lodestar-cli/lib/options");
const { createIBeaconConfig } = require("@chainsafe/lodestar-config");
const { AbortController } = require("@chainsafe/abort-controller");
const { LevelDbController } = require("@chainsafe/lodestar-db");
const { BeaconDb } = require("@chainsafe/lodestar");
const { createNodeJsLibp2p } = require("./network");
const { args } = require("./args");


async function createModules(){
    // Initialise options and config
    const { beaconNodeOptions, config } = await initializeOptionsAndConfig(args);
    await persistOptionsAndConfig(args);

    // Get version and beacon paths
    const version = getVersion();
    const beaconPaths = getBeaconPaths(args);

    // Add detailed version string for API node/version endpoint
    beaconNodeOptions.set({ api: {version: version }});

    // ENR setup
    const peerId = await readPeerId(beaconPaths.peerIdFile);
    const enr = FileENR.initFromFile(beaconPaths.enrFile, peerId);
    const enrArgs = parseEnrArgs(args);
    overwriteEnrWithCliArgs(enr, enrArgs, beaconNodeOptions.getWithDefaults());
    const enrUpdate = !enrArgs.ip && !enrArgs.ip6;
    beaconNodeOptions.set( {network: {discv5: {enr, enrUpdate}}});
    
    // Options
    const options = beaconNodeOptions.getWithDefaults();
    const abortController = new AbortController();
    const logger = getCliLogger(args, beaconPaths, config);
    onGracefulShutdown(async () => {
        abortController.abort();
    }, logger.info.bind(logger));
    logger.info("Lodestar", { version: version, network: args.network });
    const db = new BeaconDb({
        config,
        controller: new LevelDbController(options.db, { logger: logger.child(options.logger.db)}),
        metrics: void 0,
    })
    await db.start();
    const state = await fetchState(logger);
    const beaconConfig = createIBeaconConfig(config, state.genesisValidatorsRoot);
    const libp2p = await createNodeJsLibp2p(peerId, options.network, {peerStoreDir: beaconPaths.peerStoreDir});
    const controller = new AbortController();
    const signal = controller.signal;
    return { state, options, beaconConfig, libp2p, db, logger, controller, signal };
}
exports.createModules = createModules;

async function fetchState(logger){
    const config = getBeaconConfigFromArgs(args);
    const remoteBeaconUrl = "https://21qajKWbOdMuXWCCPEbxW1bVPrp:5e43bc9d09711d4f34b55077cdb3380a@eth2-beacon-mainnet.infura.io";
    const stateId = "finalized";
    const url = `${remoteBeaconUrl}/eth/v1/debug/beacon/states/${stateId}`;
    logger.info("Fetching weak subjecitivity state from Infura...");
    const state = await fetchWeakSubjectivityState(config, url);
    return state;
}
exports.fetchState = fetchState;


