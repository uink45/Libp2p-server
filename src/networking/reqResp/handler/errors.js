const { RespStatus } = require("../errors");
const { LodestarError } = require("../timeout/errors");
var ResponseErrorCode;
(function (ResponseErrorCode) {
    ResponseErrorCode["RESPONSE_STATUS_ERROR"] = "RESPONSE_STATUS_ERROR";
})(ResponseErrorCode = exports.ResponseErrorCode || (exports.ResponseErrorCode = {}));
/**
 * Used internally only to signal a response status error. Since the error should never bubble up to the user,
 * the error code and error message does not matter much.
 */
class ResponseError extends LodestarError {
    constructor(status, errorMessage) {
        const type = { code: ResponseErrorCode.RESPONSE_STATUS_ERROR, status, errorMessage };
        super(type, `RESPONSE_ERROR_${RespStatus[status]}: ${errorMessage}`);
        this.status = status;
        this.errorMessage = errorMessage;
    }
}
exports.ResponseError = ResponseError;
//# sourceMappingURL=errors.js.map