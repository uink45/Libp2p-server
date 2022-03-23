"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApi = void 0;
const beacon_1 = require("./beacon");
const lightclient_1 = require("./lightclient");
function getApi(opts, modules) {
    return {
        beacon: (0, beacon_1.getBeaconApi)(modules),
        lightclient: (0, lightclient_1.getLightclientApi)(opts, modules),
    };
}
exports.getApi = getApi;
//# sourceMappingURL=api.js.map