const { ResponseError } = require("./errors");
const { RespStatus } = require("../errors");
const { BufferedSource } = require("./bufferedSource");
const { decodeErrorMessage } = require("./errorMessage");
const { readEncodedPayload } = require("../encodingStrategies/index");
const { deserializeToTreeByMethod, contextBytesTypeByProtocol, ContextBytesType, getResponseSzzTypeByMethod } = require("../types");
/**
 * Internal helper type to signal stream ended early
 */
var StreamStatus;
(function (StreamStatus) {
    StreamStatus["Ended"] = "STREAM_ENDED";
})(StreamStatus || (StreamStatus = {}));
/**
 * Consumes a stream source to read a `<response>`
 * ```bnf
 * response        ::= <response_chunk>*
 * response_chunk  ::= <result> | <context-bytes> | <encoding-dependent-header> | <encoded-payload>
 * result          ::= "0" | "1" | "2" | ["128" ... "255"]
 * ```
 */
function responseDecode(protocol) {
    return async function* responseDecodeSink(source) {
        const deserializeToTree = deserializeToTreeByMethod[protocol.method];
        const contextBytesType = contextBytesTypeByProtocol(protocol);
        const bufferedSource = new BufferedSource(source);
        // Consumers of `responseDecode()` may limit the number of <response_chunk> and break out of the while loop
        while (!bufferedSource.isDone) {
            const status = await readResultHeader(bufferedSource);
            // Stream is only allowed to end at the start of a <response_chunk> block
            // The happens when source ends before readResultHeader() can fetch 1 byte
            if (status === StreamStatus.Ended) {
                break;
            }
            // For multiple chunks, only the last chunk is allowed to have a non-zero error
            // code (i.e. The chunk stream is terminated once an error occurs
            if (status !== RespStatus.SUCCESS) {
                const errorMessage = await readErrorMessage(bufferedSource);
                throw new ResponseError(status, errorMessage);
            }
            
            const forkName = await readForkName(contextBytesType);
            const type = getResponseSzzTypeByMethod(protocol, forkName);
            yield await readEncodedPayload(bufferedSource, protocol.encoding, type, { deserializeToTree });
        }
    };
}
exports.responseDecode = responseDecode;
/**
 * Consumes a stream source to read a `<result>`
 * ```bnf
 * result  ::= "0" | "1" | "2" | ["128" ... "255"]
 * ```
 * `<response_chunk>` starts with a single-byte response code which determines the contents of the response_chunk
 */
async function readResultHeader(bufferedSource) {
    for await (const buffer of bufferedSource) {
        const status = buffer.get(0);
        buffer.consume(1);
        // If first chunk had zero bytes status === null, get next
        if (status !== null) {
            return status;
        }
    }
    return StreamStatus.Ended;
}
exports.readResultHeader = readResultHeader;
/**
 * Consumes a stream source to read an optional `<error_response>?`
 * ```bnf
 * error_response  ::= <result> | <error_message>?
 * result          ::= "1" | "2" | ["128" ... "255"]
 * ```
 */
async function readErrorMessage(bufferedSource) {
    for await (const buffer of bufferedSource) {
        // Wait for next chunk with bytes or for the stream to end
        // Note: The entire <error_message> is expected to be in the same chunk
        if (buffer.length === 0) {
            continue;
        }
        const bytes = buffer.slice();
        try {
            return decodeErrorMessage(bytes);
        }
        catch {
            return bytes.toString("hex");
        }
    }
    // Error message is optional and may not be included in the response stream
    return "";
}
exports.readErrorMessage = readErrorMessage;
/**
 * Consumes a stream source to read a variable length `<context-bytes>` depending on the method.
 * While `<context-bytes>` has a single type of `ForkDigest`, this function only parses the `ForkName`
 * of the `ForkDigest` or defaults to `phase0`
 */
async function readForkName(contextBytes) {
    switch (contextBytes) {
        case ContextBytesType.Empty:
            return "phase0";

    }
}
exports.readForkName = readForkName;
/**
 * Consumes a stream source to read `<context-bytes>`, where it's a fixed-width 4 byte
 */
async function readContextBytesForkDigest(bufferedSource) {
    for await (const buffer of bufferedSource) {
        if (buffer.length >= types_1.CONTEXT_BYTES_FORK_DIGEST_LENGTH) {
            const bytes = buffer.slice(0, types_1.CONTEXT_BYTES_FORK_DIGEST_LENGTH);
            buffer.consume(types_1.CONTEXT_BYTES_FORK_DIGEST_LENGTH);
            return bytes;
        }
    }
    // TODO: Use typed error
    throw Error("Source ended while reading context bytes");
}
exports.readContextBytesForkDigest = readContextBytesForkDigest;
//# sourceMappingURL=responseDecode.js.map