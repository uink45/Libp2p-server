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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClient = exports.HttpError = exports.HttpClient = void 0;
const utils_1 = require("./utils");
Object.defineProperty(exports, "HttpClient", { enumerable: true, get: function () { return utils_1.HttpClient; } });
Object.defineProperty(exports, "HttpError", { enumerable: true, get: function () { return utils_1.HttpError; } });
const beacon = __importStar(require("./beacon"));
const lightclient = __importStar(require("./lightclient"));

/**
 * REST HTTP client for all routes
 */
function getClient(config, opts, httpClient) {
    if (!httpClient)
        httpClient = new utils_1.HttpClient(opts);
    return {
        beacon: beacon.getClient(config, httpClient),
        lightclient: lightclient.getClient(config, httpClient),
    };
}
exports.getClient = getClient;
//# sourceMappingURL=index.js.map