const types = require("@chainsafe/lodestar-types");
const { fetchWeakSubjectivityState } = require("./network/networks/index");
const { getBeaconConfigFromArgs } = require("@chainsafe/lodestar-cli/lib/config/beaconParams")
const { args } = require("./args");




async function fetchState(){
    const config = getBeaconConfigFromArgs(args);
    const remoteBeaconUrl = "https://21qajKWbOdMuXWCCPEbxW1bVPrp:5e43bc9d09711d4f34b55077cdb3380a@eth2-beacon-mainnet.infura.io";
    const stateId = "head";
    const url = `${remoteBeaconUrl}/eth/v1/debug/beacon/states/${stateId}`;
    const state = await fetchWeakSubjectivityState(config, url);
    const stateTreeBacked = types.ssz.altair.BeaconState.createTreeBackedFromStruct(state);

    return stateTreeBacked;
}
exports.fetchState = fetchState;


