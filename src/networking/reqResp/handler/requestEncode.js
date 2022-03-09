const { writeEncodedPayload } = require("../encodingStrategies");
const { getRequestSzzTypeByMethod } = require("../types");
/**
 * Yields byte chunks for a `<request>`
 * ```bnf
 * request  ::= <encoding-dependent-header> | <encoded-payload>
 * ```
 * Requests may contain no payload (e.g. /eth2/beacon_chain/req/metadata/1/)
 * if so, it would yield no byte chunks
 */
async function* requestEncode(protocol, requestBody) {
    const type = getRequestSzzTypeByMethod(protocol.method);
    if (type && requestBody !== null) {
        yield* writeEncodedPayload(requestBody, protocol.encoding, type);
    }
}
exports.requestEncode = requestEncode;
//# sourceMappingURL=requestEncode.js.map