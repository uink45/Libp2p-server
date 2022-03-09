"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const { TTFB_TIMEOUT, RESP_TIMEOUT } = require("../configuration");
const { RequestErrorCode, RequestInternalError } = require("../errors");
const { abortableSource } = require("./abortableSource");
const { onChunk } = require("./onChunk");
const abort_controller_1 = require("@chainsafe/abort-controller");
const it_pipe_1 = __importDefault(require("it-pipe"));


/** Returns the maximum total timeout possible for a response. See @responseTimeoutsHandler */
function maxTotalResponseTimeout(maxResponses = 1) {
    return TTFB_TIMEOUT + maxResponses * RESP_TIMEOUT;
}
exports.maxTotalResponseTimeout = maxTotalResponseTimeout;
/**
 * Wraps responseDecoder to isolate the logic that handles response timeouts.
 * - TTFB_TIMEOUT: The requester MUST wait a maximum of TTFB_TIMEOUT for the first response byte to arrive
 * - RESP_TIMEOUT: Requester allows a further RESP_TIMEOUT for each subsequent response_chunk
 */
function responseTimeoutsHandler(responseDecoder) {
    return async function* responseTimeoutsHandlerTransform(source) {
        const ttfbTimeoutController = new abort_controller_1.AbortController();
        const respTimeoutController = new abort_controller_1.AbortController();
        const timeoutTTFB = setTimeout(() => ttfbTimeoutController.abort(), TTFB_TIMEOUT);
        let timeoutRESP = null;
        let isFirstByte = true;
        const restartRespTimeout = () => {
            if (timeoutRESP)
                clearTimeout(timeoutRESP);
            timeoutRESP = setTimeout(() => respTimeoutController.abort(), RESP_TIMEOUT);
        };
        try {
            yield* it_pipe_1.default(abortableSource(source, [
                {
                    signal: ttfbTimeoutController.signal,
                    getError: () => new RequestInternalError({ code: RequestErrorCode.TTFB_TIMEOUT }),
                },
                {
                    signal: respTimeoutController.signal,
                    getError: () => new RequestInternalError({ code: RequestErrorCode.RESP_TIMEOUT }),
                },
            ]), onChunk((bytesChunk) => {
                // Ignore null and empty chunks
                if (isFirstByte && bytesChunk.length > 0) {
                    isFirstByte = false;
                    // On first byte, cancel the single use TTFB_TIMEOUT, and start RESP_TIMEOUT
                    clearTimeout(timeoutTTFB);
                    restartRespTimeout();
                }
            }), 
            // Transforms `Buffer` chunks to yield `ResponseBody` chunks
            responseDecoder, onChunk(() => {
                // On <response_chunk>, cancel this chunk's RESP_TIMEOUT and start next's
                restartRespTimeout();
            }));
        }
        finally {
            clearTimeout(timeoutTTFB);
            if (timeoutRESP !== null)
                clearTimeout(timeoutRESP);
        }
    };
}
exports.responseTimeoutsHandler = responseTimeoutsHandler;
//# sourceMappingURL=responseTimeoutsHandler.js.map