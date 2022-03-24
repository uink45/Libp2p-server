"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBeaconStateApi = void 0;

function getBeaconStateApi({ config, currentState }) {
    async function getState(stateId) {
        return currentState;
    }
    return {
        async getStateRoot(stateId) {
            const state = await getState(stateId);
            return { data: config.getForkTypes(state.slot).BeaconState.hashTreeRoot(state) };
        },
        async getStateFinalityCheckpoints(stateId) {
            const state = await getState(stateId);
            return {
                data: {
                    currentJustified: state.currentJustifiedCheckpoint,
                    previousJustified: state.previousJustifiedCheckpoint,
                    finalized: state.finalizedCheckpoint,
                },
            };
        },

    };
}
exports.getBeaconStateApi = getBeaconStateApi;
//# sourceMappingURL=index.js.map