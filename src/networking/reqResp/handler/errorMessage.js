
/**
 * Encodes a UTF-8 string to 256 bytes max
 */
function encodeErrorMessage(errorMessage) {
    const encoder = new TextEncoder();
    return Buffer.from(encoder.encode(errorMessage).slice(0, 256));
}
exports.encodeErrorMessage = encodeErrorMessage;
/**
 * Decodes error message from network bytes and removes non printable, non ascii characters.
 */
function decodeErrorMessage(errorMessage) {
    const encoder = new TextDecoder();
    // remove non ascii characters from string
    return encoder.decode(errorMessage.slice(0, 256)).replace(/[^\x20-\x7F]/g, "");
}
exports.decodeErrorMessage = decodeErrorMessage;
//# sourceMappingURL=errorMessage.js.map