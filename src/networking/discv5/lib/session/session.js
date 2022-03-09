"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Session = exports.ERR_INVALID_SIG = void 0;
const enr_1 = require("../enr");
const packet_1 = require("../packet");
const crypto_1 = require("./crypto");
const crypto_2 = require("crypto");
const nodeInfo_1 = require("./nodeInfo");
const ERR_NO_ENR = "No available session ENR";
exports.ERR_INVALID_SIG = "Invalid signature";
/**
 * A Session containing the encryption/decryption keys. These are kept individually for a given
 * node.
 */
class Session {
    constructor({ keys }) {
        this.keys = keys;
    }
    /**
     * Generates session keys from a handshake authdata.
     * If the IP of the ENR does not match the source IP address, the session is considered untrusted.
     * The output returns a boolean which specifies if the Session is trusted or not.
     */
    static establishFromChallenge(localKey, localId, remoteId, challenge, idSignature, ephPubkey, enrRecord) {
        let enr;
        // check and verify a potential ENR update
        if (enrRecord && enrRecord.length) {
            const newRemoteEnr = enr_1.ENR.decode(enrRecord);
            if (challenge.remoteEnr) {
                if (challenge.remoteEnr.seq < newRemoteEnr.seq) {
                    enr = newRemoteEnr;
                }
                else {
                    enr = challenge.remoteEnr;
                }
            }
            else {
                enr = newRemoteEnr;
            }
        }
        else if (challenge.remoteEnr) {
            enr = challenge.remoteEnr;
        }
        else {
            throw new Error(ERR_NO_ENR);
        }
        // verify the auth header nonce
        if (!crypto_1.idVerify(enr.keypair, challenge.data, ephPubkey, localId, idSignature)) {
            throw new Error(exports.ERR_INVALID_SIG);
        }
        // The keys are derived after the message has been verified to prevent potential extra work
        // for invalid messages.
        // generate session keys
        const [decryptionKey, encryptionKey] = crypto_1.deriveKeysFromPubkey(localKey, localId, remoteId, ephPubkey, challenge.data);
        const keys = { encryptionKey, decryptionKey };
        return [new Session({ keys }), enr];
    }
    /**
     * Encrypts a message and produces an handshake packet.
     */
    static encryptWithHeader(remoteContact, localKey, localNodeId, updatedEnr, challengeData, message) {
        // generate session keys
        const [encryptionKey, decryptionKey, ephPubkey] = crypto_1.generateSessionKeys(localNodeId, remoteContact, challengeData);
        const keys = { encryptionKey, decryptionKey };
        // construct nonce signature
        const idSignature = crypto_1.idSign(localKey, challengeData, ephPubkey, nodeInfo_1.getNodeId(remoteContact));
        // create authdata
        const authdata = packet_1.encodeHandshakeAuthdata({
            srcId: localNodeId,
            sigSize: 64,
            ephKeySize: 33,
            idSignature,
            ephPubkey,
            record: updatedEnr || undefined,
        });
        const header = packet_1.createHeader(packet_1.PacketType.Handshake, authdata);
        const maskingIv = crypto_2.randomBytes(packet_1.MASKING_IV_SIZE);
        const aad = packet_1.encodeChallengeData(maskingIv, header);
        // encrypt the message
        const messageCiphertext = crypto_1.encryptMessage(keys.encryptionKey, header.nonce, message, aad);
        return [
            {
                maskingIv,
                header,
                message: messageCiphertext,
            },
            new Session({ keys }),
        ];
    }
    /**
     * A new session has been established. Update this session based on the new session.
     */
    update(newSession) {
        this.awaitingKeys = newSession.keys;
        this.awaitingEnr = newSession.awaitingEnr;
    }
    /**
     * Uses the current `Session` to encrypt a message.
     * Encrypt packets with the current session key if we are awaiting a response from an
     * IAuthMessagePacket.
     */
    encryptMessage(srcId, destId, message) {
        const authdata = packet_1.encodeMessageAuthdata({ srcId });
        const header = packet_1.createHeader(packet_1.PacketType.Message, authdata);
        const maskingIv = crypto_2.randomBytes(packet_1.MASKING_IV_SIZE);
        const aad = packet_1.encodeChallengeData(maskingIv, header);
        const ciphertext = crypto_1.encryptMessage(this.keys.encryptionKey, header.nonce, message, aad);
        return {
            maskingIv,
            header,
            message: ciphertext,
        };
    }
    /**
     * Decrypts an encrypted message.
     * If a Session is already established, the original decryption keys are tried first,
     * upon failure, the new keys are attempted. If the new keys succeed,
     * the session keys are updated along with the Session state.
     */
    decryptMessage(nonce, message, aad) {
        // try with the new keys
        if (this.awaitingKeys) {
            const newKeys = this.awaitingKeys;
            delete this.awaitingKeys;
            try {
                const result = crypto_1.decryptMessage(newKeys.decryptionKey, nonce, message, aad);
                this.keys = newKeys;
                return result;
            }
            catch (e) {
                //
            }
        }
        return crypto_1.decryptMessage(this.keys.decryptionKey, nonce, message, aad);
    }
}
exports.Session = Session;
