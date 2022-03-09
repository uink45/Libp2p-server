import { Multiaddr } from "multiaddr";
import { ENR, IKeypair, NodeId } from "..";
/** A representation of an unsigned contactable node. */
export interface INodeAddress {
    /** The destination socket address. */
    socketAddr: Multiaddr;
    /** The destination Node Id. */
    nodeId: NodeId;
}
export declare function nodeAddressToString(nodeAddr: INodeAddress): string;
/**
 * This type relaxes the requirement of having an ENR to connect to a node, to allow for unsigned
 * connection types, such as multiaddrs.
 */
export declare enum INodeContactType {
    /** We know the ENR of the node we are contacting. */
    ENR = 0,
    /**
     * We don't have an ENR, but have enough information to start a handshake.
     *
     * The handshake will request the ENR at the first opportunity.
     * The public key can be derived from multiaddr's whose keys can be inlined.
     */
    Raw = 1
}
/**
 * This type relaxes the requirement of having an ENR to connect to a node, to allow for unsigned
 * connection types, such as multiaddrs.
 */
export declare type NodeContact = {
    type: INodeContactType.ENR;
    enr: ENR;
} | {
    type: INodeContactType.Raw;
    publicKey: IKeypair;
    nodeAddress: INodeAddress;
};
export declare function createNodeContact(input: ENR | Multiaddr): NodeContact;
export declare function getNodeId(contact: NodeContact): NodeId;
export declare function getNodeAddress(contact: NodeContact): INodeAddress;
export declare function getPublicKey(contact: NodeContact): IKeypair;
