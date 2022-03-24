"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBeaconApi = void 0;
const lodestar_params_1 = require("@chainsafe/lodestar-params");
const state_1 = require("./state");
function getBeaconApi(modules) {
    const state = (0, state_1.getBeaconStateApi)(modules);    
    const { currentState, config } = modules;
    return {
        ...state,
        async getGenesis() {
            const genesisForkVersion = config.getForkVersion(lodestar_params_1.GENESIS_SLOT);
            return {
                data: {
                    genesisForkVersion,
                    genesisTime: BigInt(currentState.genesisTime),
                    genesisValidatorsRoot: currentState.genesisValidatorsRoot,
                },
            };
        },
    };
}
exports.getBeaconApi = getBeaconApi;
//# sourceMappingURL=index.js.map