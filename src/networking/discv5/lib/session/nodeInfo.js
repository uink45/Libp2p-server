"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicKey = exports.getNodeAddress = exports.getNodeId = exports.createNodeContact = exports.INodeContactType = exports.nodeAddressToString = void 0;
const multiaddr_1 = require("multiaddr");
const peer_id_1 = __importDefault(require("peer-id"));
const __1 = require("..");
function nodeAddressToString(nodeAddr) {
    return nodeAddr.nodeId + ":" + Buffer.from(nodeAddr.socketAddr.bytes).toString("hex");
}
exports.nodeAddressToString = nodeAddressToString;
/**
 * This type relaxes the requirement of having an ENR to connect to a node, to allow for unsigned
 * connection types, such as multiaddrs.
 */
var INodeContactType;
(function (INodeContactType) {
    /** We know the ENR of the node we are contacting. */
    INodeContactType[INodeContactType["ENR"] = 0] = "ENR";
    /**
     * We don't have an ENR, but have enough information to start a handshake.
     *
     * The handshake will request the ENR at the first opportunity.
     * The public key can be derived from multiaddr's whose keys can be inlined.
     */
    INodeContactType[INodeContactType["Raw"] = 1] = "Raw";
})(INodeContactType = exports.INodeContactType || (exports.INodeContactType = {}));
function createNodeContact(input) {
    if (multiaddr_1.Multiaddr.isMultiaddr(input)) {
        const options = input.toOptions();
        if (options.transport !== "udp") {
            throw new Error("Multiaddr must specify a UDP port");
        }
        const peerIdStr = input.getPeerId();
        if (!peerIdStr) {
            throw new Error("Multiaddr must specify a peer id");
        }
        const peerId = peer_id_1.default.createFromB58String(peerIdStr);
        const keypair = __1.createKeypairFromPeerId(peerId);
        const nodeId = __1.v4.nodeId(keypair.publicKey);
        return {
            type: INodeContactType.Raw,
            publicKey: keypair,
            nodeAddress: {
                socketAddr: input,
                nodeId,
            },
        };
    }
    else {
        return {
            type: INodeContactType.ENR,
            enr: input,
        };
    }
}
exports.createNodeContact = createNodeContact;
function getNodeId(contact) {
    switch (contact.type) {
        case INodeContactType.ENR:
            return contact.enr.nodeId;
        case INodeContactType.Raw:
            return contact.nodeAddress.nodeId;
    }
}
exports.getNodeId = getNodeId;
function getNodeAddress(contact) {
    switch (contact.type) {
        case INodeContactType.ENR: {
            const socketAddr = contact.enr.getLocationMultiaddr("udp");
            if (!socketAddr) {
                throw new Error("ENR has no udp multiaddr");
            }
            return {
                socketAddr,
                nodeId: contact.enr.nodeId,
            };
        }
        case INodeContactType.Raw:
            return contact.nodeAddress;
    }
}
exports.getNodeAddress = getNodeAddress;
function getPublicKey(contact) {
    switch (contact.type) {
        case INodeContactType.ENR:
            return contact.enr.keypair;
        case INodeContactType.Raw:
            return contact.publicKey;
    }
}
exports.getPublicKey = getPublicKey;
