"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApi = void 0;
const beacon_1 = require("./beacon");
const lightclient_1 = require("./lightclient");
function getApi(opts, modules) {
    return {
        beacon:  beacon_1.getBeaconApi(modules),
        lightclient: lightclient_1.getLightclientApi(opts, modules),
    };
}
exports.getApi = getApi;
//# sourceMappingURL=api.js.map