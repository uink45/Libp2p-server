/// <reference types="node" />
import { EventEmitter } from "events";
import StrictEventEmitter from "strict-event-emitter-types";
import { Multiaddr } from "multiaddr";
import { ITransportService } from "../transport";
import { IPacket } from "../packet";
import { ENR } from "../enr";
import { IKeypair } from "../keypair";
import { RequestMessage, ResponseMessage } from "../message";
import { ISessionEvents, ISessionConfig } from "./types";
import { INodeAddress, NodeContact } from "./nodeInfo";
declare const SessionService_base: new () => StrictEventEmitter<EventEmitter, ISessionEvents>;
/**
 * Session management for the Discv5 Discovery service.
 *
 * The `SessionService` is responsible for establishing and maintaining sessions with
 * connected/discovered nodes. Each node, identified by it's [`NodeId`] is associated with a
 * [`Session`]. This service drives the handshakes for establishing the sessions and associated
 * logic for sending/requesting initial connections/ENR's from unknown peers.
 *
 * The `SessionService` also manages the timeouts for each request and reports back RPC failures,
 * session timeouts and received messages. Messages are encrypted and decrypted using the
 * associated `Session` for each node.
 *
 * An ongoing connection is managed by the `Session` struct. A node that provides and ENR with an
 * IP address/port that doesn't match the source, is considered untrusted. Once the IP is updated
 * to match the source, the `Session` is promoted to an established state. RPC requests are not sent
 * to untrusted Sessions, only responses.
 */
export declare class SessionService extends SessionService_base {
    /**
     * The local ENR
     */
    enr: ENR;
    /**
     * The keypair to sign the ENR and set up encrypted communication with peers
     */
    keypair: IKeypair;
    /**
     * The underlying packet transport
     */
    transport: ITransportService;
    /**
     * Configuration
     */
    private config;
    /**
     * Pending raw requests. A list of raw messages we are awaiting a response from the remote.
     *
     * UNBOUNDED: consumer data, responsibility of the app layer to bound
     *
     * Keyed by NodeAddressString
     */
    private activeRequests;
    /**
     * A mapping of all pending active raw requests message nonces to their NodeAddress.
     *
     * UNBOUNDED: consumer data, responsibility of the app layer to bound
     */
    private activeRequestsNonceMapping;
    /**
     * Requests awaiting a handshake completion.
     *
     * UNBOUNDED: consumer data, responsibility of the app layer to bound
     *
     * Keyed by NodeAddressString
     */
    private pendingRequests;
    /**
     * Currently in-progress handshakes with peers.
     *
     * BOUNDED: bounded by expiry and IP rate limiter
     *
     * Keyed by NodeAddressString
     */
    private activeChallenges;
    /**
     * Established sessions with peers.
     *
     * BOUNDED: bounded by expiry and max items
     *
     * Keyed by NodeAddressString
     */
    private sessions;
    constructor(config: ISessionConfig, enr: ENR, keypair: IKeypair, transport: ITransportService);
    /**
     * Starts the session service, starting the underlying UDP transport service.
     */
    start(): Promise<void>;
    /**
     * Stops the session service, stopping the underlying UDP transport service.
     */
    stop(): Promise<void>;
    sessionsSize(): number;
    /**
     * Sends an RequestMessage to a node.
     */
    sendRequest(contact: NodeContact, request: RequestMessage): void;
    /**
     * Sends an RPC response
     */
    sendResponse(nodeAddr: INodeAddress, response: ResponseMessage): void;
    /**
     * This is called in response to a "whoAreYouRequest" event.
     * The applications finds the highest known ENR for a node then we respond to the node with a WHOAREYOU packet.
     */
    sendChallenge(nodeAddr: INodeAddress, nonce: Buffer, remoteEnr: ENR | null): void;
    processInboundPacket: (src: Multiaddr, packet: IPacket) => void;
    private handleChallenge;
    /**
     * Verifies a Node ENR to its observed address.
     * If it fails, any associated session is also considered failed.
     * If it succeeds, we notify the application
     */
    private verifyEnr;
    /** Handle a message that contains an authentication header */
    private handleHandshake;
    private handleMessage;
    /**
     * Handles a response to a request.
     * Re-inserts the request call if the response is a multiple Nodes response.
     */
    private handleResponse;
    /**
     * Inserts a request and associated authTag mapping
     */
    private insertActiveRequest;
    private newSession;
    private removeExpectedResponse;
    private addExpectedResponse;
    private handleRequestTimeout;
    private sendNextRequest;
    /**
     * A request has failed
     */
    private failRequest;
    /**
     * Removes a session
     */
    private failSession;
    private send;
}
export {};
