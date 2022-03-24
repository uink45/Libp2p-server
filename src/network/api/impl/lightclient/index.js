"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLightclientApi = void 0;
const ssz_1 = require("@chainsafe/ssz");
const lodestar_beacon_state_transition_1 = require("@chainsafe/lodestar-beacon-state-transition");
const { getSyncCommitteesWitness, getCurrentSyncCommitteeBranch } = require("./proofs");

// TODO: Import from lightclient/server package
function getLightclientApi(opts, { currentState, config, network }) {
    var _a;
    // It's currently possible to request gigantic proofs (eg: a proof of the entire beacon state)
    // We want some some sort of resistance against this DoS vector.
    const maxGindicesInProof = (_a = opts.maxGindicesInProof) !== null && _a !== void 0 ? _a : 512;
    return {
        async getStateProof(stateId, paths) {
            
            var item;
            var gIndex;
            const state = currentState;
            for(const path of paths){
                if(path[0] =="balances"){
                    item = state.balances[path[1]];
                }
            }

            // eslint-disable-next-line @typescript-eslint/naming-convention
            const BeaconState = config.getForkTypes(state.slot).BeaconState;
            const stateTreeBacked = BeaconState.createTreeBackedFromStruct(state);
            const tree = stateTreeBacked.tree;
            const gindicesSet = new Set();
            for (const path of paths) {
                
                // Logic from TreeBacked#createProof is (mostly) copied here to expose the # of gindices in the proof
                const { type, gindex } = BeaconState.getPathInfo(path);
                gIndex = gindex;
                if (!(0, ssz_1.isCompositeType)(type)) {
                    gindicesSet.add(gindex);
                }
                else {
                    // if the path subtype is composite, include the gindices of all the leaves
                    const gindexes = type.tree_getLeafGindices(type.hasVariableSerializedLength() ? tree.getSubtree(gindex) : undefined, gindex);
                    for (const gindex of gindexes) {
                        gindicesSet.add(gindex);
                    }
                }
            }
            if (gindicesSet.size > maxGindicesInProof) {
                throw new Error("Requested proof is too large.");
            }
            return {
                leaf: tree.getNode(gIndex).root,
                singleProof: tree.getSingleProof(gIndex),
                gindex: gIndex,
                value: item,
            };
        },
        async getCommitteeUpdates(from, to) {
            //const periods = numpy_1.linspace(from, to);
            //const updates = await Promise.all(periods.map((period) => chain.lightClientServer.getCommitteeUpdates(period)));
            return { data: null };
        },
        async getHeadUpdate() {
            const header = network.peerManager.blocks.storedBlocks[network.peerManager.blocks.storedBlocks.length - 1];
            console.log(network.peerManager.blocks.storedBlocks);
            const lightClientHeader = {
                syncAggregate: header.message.body.syncAggregate,
                attestedHeader: lodestar_beacon_state_transition_1.blockToHeader(config, header.message)
            };
            return { data: lightClientHeader };
        },
        async getHeadUpdateBySlot(slot) {
            var header;
            for(let i = 0; i < network.peerManager.blocks.storedBlocks.length; i++){
                if(slot == network.peerManager.blocks.storedBlocks[i].message.slot){
                    header = network.peerManager.blocks.storedBlocks[i];
                }
            }
            const lightClientHeader = {
                syncAggregate: header.message.body.syncAggregate,
                attestedHeader: lodestar_beacon_state_transition_1.blockToHeader(config, header.message)
            };
            return { data: lightClientHeader };
        },
        async getSnapshot(blockRoot) {
            const syncCommitteeWitness = getSyncCommitteesWitness(currentState);
            const snapshotProof = {
                header: currentState.latestBlockHeader,
                currentSyncCommittee: currentState.currentSyncCommittee,
                currentSyncCommitteeBranch: getCurrentSyncCommitteeBranch(syncCommitteeWitness),
            }
            return { data: snapshotProof };
        },
    };
}
exports.getLightclientApi = getLightclientApi;
//# sourceMappingURL=index.js.map