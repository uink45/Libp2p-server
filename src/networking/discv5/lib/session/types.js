"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionDirection = exports.RequestErrorType = void 0;
var RequestErrorType;
(function (RequestErrorType) {
    /** The request timed out. */
    RequestErrorType[RequestErrorType["Timeout"] = 0] = "Timeout";
    /** The discovery service has not been started. */
    RequestErrorType[RequestErrorType["ServiceNotStarted"] = 1] = "ServiceNotStarted";
    /** The request was sent to ourselves. */
    RequestErrorType[RequestErrorType["SelfRequest"] = 2] = "SelfRequest";
    /** An invalid ENR was provided. */
    RequestErrorType[RequestErrorType["InvalidENR"] = 3] = "InvalidENR";
    /** The remote's ENR was invalid. */
    RequestErrorType[RequestErrorType["InvalidRemoteENR"] = 4] = "InvalidRemoteENR";
    /** The remote returned an invalid packet. */
    RequestErrorType[RequestErrorType["InvalidRemotePacket"] = 5] = "InvalidRemotePacket";
    /** Failed attempting to encrypt the request. */
    RequestErrorType[RequestErrorType["Encryptionailed"] = 6] = "Encryptionailed";
    /** The multiaddr provided is invalid */
    RequestErrorType[RequestErrorType["InvalidMultiaddr"] = 7] = "InvalidMultiaddr";
})(RequestErrorType = exports.RequestErrorType || (exports.RequestErrorType = {}));
/** How we connected to the node. */
var ConnectionDirection;
(function (ConnectionDirection) {
    /** The node contacted us. */
    ConnectionDirection[ConnectionDirection["Incoming"] = 0] = "Incoming";
    /** We contacted the node. */
    ConnectionDirection[ConnectionDirection["Outgoing"] = 1] = "Outgoing";
})(ConnectionDirection = exports.ConnectionDirection || (exports.ConnectionDirection = {}));
