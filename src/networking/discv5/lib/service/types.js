"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionStatusType = void 0;
var ConnectionStatusType;
(function (ConnectionStatusType) {
    ConnectionStatusType[ConnectionStatusType["Connected"] = 0] = "Connected";
    ConnectionStatusType[ConnectionStatusType["PongReceived"] = 1] = "PongReceived";
    ConnectionStatusType[ConnectionStatusType["Disconnected"] = 2] = "Disconnected";
})(ConnectionStatusType = exports.ConnectionStatusType || (exports.ConnectionStatusType = {}));
