const { networkInterfaces } = require("os");

/**
 * Check if multiaddr belongs to the local network interfaces.
 */
 function isLocalMultiAddr(multiaddr) {
    if (!multiaddr)
        return false;

    const protoNames = multiaddr.protoNames();
    if (protoNames.length !== 2 && protoNames[1] !== "udp") {
        throw new Error("Invalid udp multiaddr");
    }

    const interfaces = networkInterfaces();
    const tuples = multiaddr.tuples();
    const isIPv4 = tuples[0][0] === 4;
    const family = isIPv4 ? "IPv4" : "IPv6";
    const ip = tuples[0][1];

    if (!ip) {
        return false;
    }

    const ipStr = isIPv4
        ? Array.from(ip).join(".")
        : Array.from(Uint16Array.from(ip))
            .map((n) => n.toString(16))
            .join(":");
            
    for (const networkInterfaces of Object.values(interfaces)) {
        for (const networkInterface of networkInterfaces || []) {
            if (networkInterface.family === family && networkInterface.address === ipStr) {
                return true;
            }
        }
    }
    return false;
}
exports.isLocalMultiAddr = isLocalMultiAddr;

function clearMultiaddrUDP(enr) {
    // enr.multiaddrUDP = undefined in new version
    enr.delete("ip");
    enr.delete("udp");
    enr.delete("ip6");
    enr.delete("udp6");
}
exports.clearMultiaddrUDP = clearMultiaddrUDP;