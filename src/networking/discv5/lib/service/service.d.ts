/// <reference types="node" />
import { Multiaddr } from "multiaddr";
import PeerId from "peer-id";
import { SessionService } from "../session";
import { ENR, NodeId } from "../enr";
import { IKeypair } from "../keypair";
import { RequestId } from "../message";
import { Discv5EventEmitter, ENRInput, IDiscv5Metrics } from "./types";
import { IDiscv5Config } from "../config";
/**
 * Discovery v5 is a protocol designed for encrypted peer discovery and topic advertisement. Each peer/node
 * on the network is identified via its ENR (Ethereum Name Record) which is essentially a signed key-value
 * store containing the node's public key and optionally IP address and port.
 *
 * Discv5 employs a kademlia-like routing table to store and manage discovered peers and topics.
 * The protocol allows for external IP discovery in NAT environments through regular PING/PONGs with
 * discovered nodes.
 * Nodes return the external IP address that they have received and a simple majority is chosen as our external
 * IP address.
 *
 * This section contains protocol-level logic. In particular it manages the routing table of known ENRs, topic
 * registration/advertisement and performs lookups
 */
export interface IDiscv5CreateOptions {
    enr: ENRInput;
    peerId: PeerId;
    multiaddr: Multiaddr;
    config?: Partial<IDiscv5Config>;
    metrics?: IDiscv5Metrics;
}
declare const Discv5_base: new () => Discv5EventEmitter;
/**
 * User-facing service one can use to set up, start and use Discv5.
 *
 * The service exposes a number of user-facing operations that the user may refer to in their application:
 * * Adding a new static peers
 * * Checking the properties of a specific peer
 * * Performing a lookup for a peer
 *
 * Additionally, the service offers events when peers are added to the peer table or discovered via lookup.
 */
export declare class Discv5 extends Discv5_base {
    /**
     * Configuration
     */
    private config;
    private started;
    /**
     * Session service that establishes sessions with peers
     */
    private sessionService;
    /**
     * Storage of the ENR record for each node
     *
     * BOUNDED: bounded by bucket count + size
     */
    private kbuckets;
    /**
     * All the iterative lookups we are currently performing with their ID
     *
     * UNBOUNDED: consumer data, responsibility of the app layer to bound
     */
    private activeLookups;
    /**
     * RPC requests that have been sent and are awaiting a response.
     * Some requests are linked to a lookup (spanning multiple req/resp trips)
     *
     * UNBOUNDED: consumer data, responsibility of the app layer to bound
     */
    private activeRequests;
    /**
     * Tracks responses received across NODES responses.
     *
     * UNBOUNDED: consumer data, responsibility of the app layer to bound
     */
    private activeNodesResponses;
    /**
     * List of peers we have established sessions with and an interval id
     * the interval handler pings the associated node
     *
     * BOUNDED: bounded by kad table size
     */
    private connectedPeers;
    /**
     * Id for the next lookup that we start
     */
    private nextLookupId;
    /**
     * A map of votes that nodes have made about our external IP address
     *
     * BOUNDED
     */
    private addrVotes;
    private metrics?;
    /**
     * Default constructor.
     * @param sessionService the service managing sessions underneath.
     */
    constructor(config: IDiscv5Config, sessionService: SessionService, metrics?: IDiscv5Metrics);
    /**
     * Convenience method to create a new discv5 service.
     *
     * @param enr the ENR record identifying the current node.
     * @param peerId the PeerId with the keypair that identifies the enr
     * @param multiaddr The multiaddr which contains the the network interface and port to which the UDP server binds
     */
    static create({ enr, peerId, multiaddr, config, metrics }: IDiscv5CreateOptions): Discv5;
    /**
     * Starts the service and adds all initial bootstrap peers to be considered.
     */
    start(): Promise<void>;
    /**
     * Stops the service, closing any underlying networking activity.
     */
    stop(): Promise<void>;
    isStarted(): boolean;
    /**
     * Adds a known ENR of a peer participating in Discv5 to the routing table.
     *
     * This allows pre-populating the kademlia routing table with known addresses,
     * so that they can be used immediately in following DHT operations involving one of these peers,
     * without having to dial them upfront.
     */
    addEnr(enr: ENRInput): void;
    get bindAddress(): Multiaddr;
    get keypair(): IKeypair;
    peerId(): Promise<PeerId>;
    get enr(): ENR;
    get connectedPeerCount(): number;
    getKadValue(nodeId: NodeId): ENR | undefined;
    /**
     * Return all ENRs of nodes currently contained in buckets of the kad routing table
     */
    kadValues(): ENR[];
    findRandomNode(): Promise<ENR[]>;
    /**
     * Starts an iterative FIND_NODE lookup
     */
    findNode(target: NodeId): Promise<ENR[]>;
    /**
     * Broadcast TALKREQ message to all nodes in routing table and returns response
     */
    broadcastTalkReq(payload: Buffer, protocol: string | Uint8Array): Promise<Buffer>;
    /**
     * Send TALKREQ message to dstId and returns response
     */
    sendTalkReq(dstId: string, payload: Buffer, protocol: string | Uint8Array): Promise<Buffer>;
    /**
     * Send TALKRESP message to requesting node
     */
    sendTalkResp(srcId: NodeId, requestId: RequestId, payload: Uint8Array): Promise<void>;
    /**
     * Sends a PING request to a node
     */
    private sendPing;
    /**
     * Ping all peers connected in the routing table
     */
    private pingConnectedPeers;
    /**
     * Request an external node's ENR
     */
    private requestEnr;
    /**
     * Constructs and sends a request to the session service given a target and lookup peer
     */
    private sendLookup;
    /**
     * Sends generic RPC requests.
     * Each request gets added to known outputs, awaiting a response
     *
     * Returns true if the request was sent successfully
     */
    private sendRpcRequest;
    /**
     * Update the conection status of a node in the routing table.
     * This tracks whether or not we should be pinging peers.
     * Disconnected peers are removed from the queue and
     * newly added peers to the routing table are added to the queue.
     */
    private connectionUpdated;
    /**
     * Returns an ENR if one is known for the given NodeId
     *
     * This includes ENRs from any ongoing lookups not yet in the kad table
     */
    private findEnr;
    /**
     * Processes discovered peers from a query
     */
    private discovered;
    private onPendingEviction;
    private onAppliedEviction;
    private onEstablished;
    private handleWhoAreYouRequest;
    /**
     * Processes an RPC request from a peer.
     *
     * Requests respond to the received socket address, rather than the IP of the known ENR.
     */
    private handleRpcRequest;
    private handlePing;
    /**
     * Sends a NODES response, given a list of found ENRs.
     * This function splits the nodes up into multiple responses to ensure the response stays below
     * the maximum packet size
     */
    private handleFindNode;
    private handleTalkReq;
    /**
     * Processes an RPC response from a peer.
     */
    private handleRpcResponse;
    private handlePong;
    private handleNodes;
    private handleTalkResp;
    /**
     * A session could not be established or an RPC request timed out
     */
    private rpcFailure;
}
export {};
