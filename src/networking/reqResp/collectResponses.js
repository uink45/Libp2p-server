const { RequestErrorCode, RequestInternalError } = require("./errors");
const { isSingleResponseChunkByMethod } = require("./types");
/**
 * Sink for `<response_chunk>*`, from
 * ```bnf
 * response ::= <response_chunk>*
 * ```
 * Note: `response` has zero or more chunks for SSZ-list responses or exactly one chunk for non-list
 */
function collectResponses(method, maxResponses) {
    return async (source) => {
        if (isSingleResponseChunkByMethod[method]) {
            for await (const response of source) {
                return response;
            }
            throw new RequestInternalError({ code: RequestErrorCode.EMPTY_RESPONSE });
        }
        // else: zero or more responses
        const responses = [];
        for await (const response of source) {
            responses.push(response);
            if (maxResponses !== undefined && responses.length >= maxResponses) {
                break;
            }
        }
        return responses;
    };
}
exports.collectResponses = collectResponses;
//# sourceMappingURL=collectResponses.js.map