const { Encoding } = require("../types");
const { readSszSnappyPayload } = require("./decode");
const {writeSszSnappyPayload} = require("./encode");
/**
 * Consumes a stream source to read encoded header and payload as defined in the spec:
 * ```
 * <encoding-dependent-header> | <encoded-payload>
 * ```
 */
async function readEncodedPayload(bufferedSource, encoding, type, options) {
    switch (encoding) {
        case Encoding.SSZ_SNAPPY:
            return await readSszSnappyPayload(bufferedSource, type, options);
        default:
            throw Error("Unsupported encoding");
    }
}
exports.readEncodedPayload = readEncodedPayload;

/**
 * Yields byte chunks for encoded header and payload as defined in the spec:
 * ```
 * <encoding-dependent-header> | <encoded-payload>
 * ```
 */
 async function* writeEncodedPayload(body, encoding, serializer) {
    switch (encoding) {
        case Encoding.SSZ_SNAPPY:
            yield* writeSszSnappyPayload(body, serializer);
            break;
        default:
            throw Error("Unsupported encoding");
    }
}
exports.writeEncodedPayload = writeEncodedPayload;