"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchWeakSubjectivityState = exports.fetchBootnodes = exports.getGenesisFileUrl = exports.getNetworkBeaconNodeOptions = exports.getNetworkBeaconParams = exports.networkNames = void 0;
const got_1 = __importDefault(require("got"));
// eslint-disable-next-line no-restricted-imports
const multifork_1 = require("@chainsafe/lodestar/lib/util/multifork");
const lodestar_api_1 = require("@chainsafe/lodestar-api");
const mainnet = __importStar(require("./mainnet"));
const pyrmont = __importStar(require("./pyrmont"));
const prater = __importStar(require("./prater"));
exports.networkNames = ["mainnet", "pyrmont", "prater"];
function getNetworkData(network) {
    switch (network) {
        case "mainnet":
            return mainnet;
        case "pyrmont":
            return pyrmont;
        case "prater":
            return prater;
        default:
            throw Error(`Network not supported: ${network}`);
    }
}
function getNetworkBeaconParams(network) {
    return getNetworkData(network).chainConfig;
}
exports.getNetworkBeaconParams = getNetworkBeaconParams;
function getNetworkBeaconNodeOptions(network) {
    const { depositContractDeployBlock, bootEnrs } = getNetworkData(network);
    return {
        eth1: {
            depositContractDeployBlock,
        },
        network: {
            discv5: {
                enabled: true,
                bootEnrs,
            },
        },
    };
}
exports.getNetworkBeaconNodeOptions = getNetworkBeaconNodeOptions;
/**
 * Get genesisStateFile URL to download. Returns null if not available
 */
function getGenesisFileUrl(network) {
    return getNetworkData(network).genesisFileUrl;
}
exports.getGenesisFileUrl = getGenesisFileUrl;
/**
 * Fetches the latest list of bootnodes for a network
 * Bootnodes file is expected to contain bootnode ENR's concatenated by newlines
 */
async function fetchBootnodes(network) {
    const bootnodesFileUrl = getNetworkData(network).bootnodesFileUrl;
    const bootnodesFile = await got_1.default.get(bootnodesFileUrl).text();
    const enrs = [];
    for (const line of bootnodesFile.trim().split(/\r?\n/)) {
        // File may contain a row with '### Ethereum Node Records'
        // File may be YAML, with `- enr:-KG4QOWkRj`
        if (line.includes("enr:"))
            enrs.push("enr:" + line.split("enr:")[1]);
    }
    return enrs;
}
exports.fetchBootnodes = fetchBootnodes;
/**
 * Fetch weak subjectivity state from a remote beacon node
 */
async function fetchWeakSubjectivityState(config, url) {
    try {
        const response = await (0, got_1.default)(url, { headers: { accept: "application/octet-stream" } });
        const stateBytes = response.rawBody;
        return (0, multifork_1.getStateTypeFromBytes)(config, stateBytes).createTreeBackedFromBytes(stateBytes);
    }
    catch (e) {
        throw new Error("Unable to fetch weak subjectivity state: " + e.message);
    }
}
exports.fetchWeakSubjectivityState = fetchWeakSubjectivityState;
//# sourceMappingURL=index.js.map
