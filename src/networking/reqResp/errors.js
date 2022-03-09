const { LodestarError } = require("./timeout/errors");
var RequestErrorCode;
(function (RequestErrorCode) {
    // Declaring specific values of RpcResponseStatusError for error clarity downstream
    /** `<response_chunk>` had `<result>` === INVALID_REQUEST */
    RequestErrorCode["INVALID_REQUEST"] = "REQUEST_ERROR_INVALID_REQUEST";
    /** `<response_chunk>` had `<result>` === SERVER_ERROR */
    RequestErrorCode["SERVER_ERROR"] = "REQUEST_ERROR_SERVER_ERROR";
    /** `<response_chunk>` had `<result>` === RESOURCE_UNAVAILABLE */
    RequestErrorCode["RESOURCE_UNAVAILABLE"] = "RESOURCE_UNAVAILABLE_ERROR";
    /** `<response_chunk>` had a `<result>` not known in the current spec */
    RequestErrorCode["UNKNOWN_ERROR_STATUS"] = "REQUEST_ERROR_UNKNOWN_ERROR_STATUS";
    /** Could not open a stream with peer before DIAL_TIMEOUT */
    RequestErrorCode["DIAL_TIMEOUT"] = "REQUEST_ERROR_DIAL_TIMEOUT";
    /** Error opening a stream with peer */
    RequestErrorCode["DIAL_ERROR"] = "REQUEST_ERROR_DIAL_ERROR";
    /** Reponder did not close write stream before REQUEST_TIMEOUT */
    RequestErrorCode["REQUEST_TIMEOUT"] = "REQUEST_ERROR_REQUEST_TIMEOUT";
    /** Error when sending request to responder */
    RequestErrorCode["REQUEST_ERROR"] = "REQUEST_ERROR_REQUEST_ERROR";
    /** Reponder did not deliver a full reponse before max maxTotalResponseTimeout() */
    RequestErrorCode["RESPONSE_TIMEOUT"] = "REQUEST_ERROR_RESPONSE_TIMEOUT";
    /** A single-response method returned 0 chunks */
    RequestErrorCode["EMPTY_RESPONSE"] = "REQUEST_ERROR_EMPTY_RESPONSE";
    /** Time to first byte timeout */
    RequestErrorCode["TTFB_TIMEOUT"] = "REQUEST_ERROR_TTFB_TIMEOUT";
    /** Timeout between `<response_chunk>` exceed */
    RequestErrorCode["RESP_TIMEOUT"] = "REQUEST_ERROR_RESP_TIMEOUT";
})(RequestErrorCode = exports.RequestErrorCode || (exports.RequestErrorCode = {}));

var RespStatus;
(function (RespStatus) {
    /**
     * A normal response follows, with contents matching the expected message schema and encoding specified in the request
     */
    RespStatus[RespStatus["SUCCESS"] = 0] = "SUCCESS";
    /**
     * The contents of the request are semantically invalid, or the payload is malformed,
     * or could not be understood. The response payload adheres to the ErrorMessage schema
     */
    RespStatus[RespStatus["INVALID_REQUEST"] = 1] = "INVALID_REQUEST";
    /**
     * The responder encountered an error while processing the request. The response payload adheres to the ErrorMessage schema
     */
    RespStatus[RespStatus["SERVER_ERROR"] = 2] = "SERVER_ERROR";
    /**
     * The responder does not have requested resource.  The response payload adheres to the ErrorMessage schema (described below). Note: This response code is only valid as a response to BlocksByRange
     */
    RespStatus[RespStatus["RESOURCE_UNAVAILABLE"] = 3] = "RESOURCE_UNAVAILABLE";
})(RespStatus = exports.RespStatus || (exports.RespStatus = {}));
/**
 * Same error types as RequestError but without metadata.
 * Top level function sendRequest() must rethrow RequestInternalError with metadata
 */
class RequestInternalError extends LodestarError {
    constructor(type) {
        super(type);
    }
}
exports.RequestInternalError = RequestInternalError;
class RequestError extends LodestarError {
    constructor(type, metadata) {
        super({ ...metadata, ...type }, renderErrorMessage(type));
    }
}
exports.RequestError = RequestError;
/**
 * Parse response status errors into detailed request errors for each status code for easier debugging
 */
function responseStatusErrorToRequestError(e) {
    const { errorMessage, status } = e;
    switch (status) {
        case RespStatus.INVALID_REQUEST:
            return { code: RequestErrorCode.INVALID_REQUEST, errorMessage };
        case RespStatus.SERVER_ERROR:
            return { code: RequestErrorCode.SERVER_ERROR, errorMessage };
        case RespStatus.RESOURCE_UNAVAILABLE:
            return { code: RequestErrorCode.RESOURCE_UNAVAILABLE, errorMessage };
        default:
            return { code: RequestErrorCode.UNKNOWN_ERROR_STATUS, errorMessage, status };
    }
}
exports.responseStatusErrorToRequestError = responseStatusErrorToRequestError;
/**
 * Render responder's errorMessage directly in main's error.message for easier debugging
 */
function renderErrorMessage(type) {
    switch (type.code) {
        case RequestErrorCode.INVALID_REQUEST:
        case RequestErrorCode.SERVER_ERROR:
        case RequestErrorCode.RESOURCE_UNAVAILABLE:
        case RequestErrorCode.UNKNOWN_ERROR_STATUS:
            return `${type.code}: ${type.errorMessage}`;
        default:
            return type.code;
    }
}
//# sourceMappingURL=errors.js.map