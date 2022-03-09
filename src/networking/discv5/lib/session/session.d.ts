/// <reference types="node" />
import { NodeId, ENR } from "../enr";
import { IKeys } from "./types";
import { IPacket } from "../packet";
import { IKeypair } from "../keypair";
import { RequestId } from "../message";
import { IChallenge } from ".";
import { NodeContact } from "./nodeInfo";
interface ISessionOpts {
    keys: IKeys;
}
export declare const ERR_INVALID_SIG = "Invalid signature";
/**
 * A Session containing the encryption/decryption keys. These are kept individually for a given
 * node.
 */
export declare class Session {
    /** The current keys used to encrypt/decrypt messages. */
    keys: IKeys;
    /**
     * If a new handshake is being established, these keys can be tried to determine if this new
     * set of keys is canon.
     */
    awaitingKeys?: IKeys;
    /**
     * If we contacted this node without an ENR, i.e. via a multiaddr, during the session
     * establishment we request the nodes ENR. Once the ENR is received and verified, this session
     * becomes established.
     *
     * This field holds the request_id associated with the ENR request.
     */
    awaitingEnr?: RequestId;
    constructor({ keys }: ISessionOpts);
    /**
     * Generates session keys from a handshake authdata.
     * If the IP of the ENR does not match the source IP address, the session is considered untrusted.
     * The output returns a boolean which specifies if the Session is trusted or not.
     */
    static establishFromChallenge(localKey: IKeypair, localId: NodeId, remoteId: NodeId, challenge: IChallenge, idSignature: Buffer, ephPubkey: Buffer, enrRecord?: Buffer): [Session, ENR];
    /**
     * Encrypts a message and produces an handshake packet.
     */
    static encryptWithHeader(remoteContact: NodeContact, localKey: IKeypair, localNodeId: NodeId, updatedEnr: Buffer | null, challengeData: Buffer, message: Buffer): [IPacket, Session];
    /**
     * A new session has been established. Update this session based on the new session.
     */
    update(newSession: Session): void;
    /**
     * Uses the current `Session` to encrypt a message.
     * Encrypt packets with the current session key if we are awaiting a response from an
     * IAuthMessagePacket.
     */
    encryptMessage(srcId: NodeId, destId: NodeId, message: Buffer): IPacket;
    /**
     * Decrypts an encrypted message.
     * If a Session is already established, the original decryption keys are tried first,
     * upon failure, the new keys are attempted. If the new keys succeed,
     * the session keys are updated along with the Session state.
     */
    decryptMessage(nonce: Buffer, message: Buffer, aad: Buffer): Buffer;
}
export {};
