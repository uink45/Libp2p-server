"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Discv5 = void 0;
const events_1 = require("events");
const debug_1 = __importDefault(require("debug"));
const libp2p_crypto_1 = require("libp2p-crypto");
const multiaddr_1 = require("multiaddr");
const transport_1 = require("../transport");
const packet_1 = require("../packet");
const session_1 = require("../session");
const enr_1 = require("../enr");
const keypair_1 = require("../keypair");
const kademlia_1 = require("../kademlia");
const message_1 = require("../message");
const addrVotes_1 = require("./addrVotes");
const util_1 = require("../util");
const config_1 = require("../config");
const nodeInfo_1 = require("../session/nodeInfo");
const _1 = require(".");
const log = debug_1.default("discv5:service");
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
class Discv5 extends events_1.EventEmitter {
    /**
     * Default constructor.
     * @param sessionService the service managing sessions underneath.
     */
    constructor(config, sessionService, metrics) {
        super();
        this.started = false;
        // process kad updates
        this.onPendingEviction = (enr) => {
            this.sendPing(enr);
        };
        this.onAppliedEviction = (inserted, evicted) => {
            this.emit("enrAdded", inserted, evicted);
        };
        // process events from the session service
        this.onEstablished = (enr, direction) => {
            // Ignore sessions with non-contactable ENRs
            if (!enr.getLocationMultiaddr("udp")) {
                return;
            }
            const nodeId = enr.nodeId;
            log("Session established with Node: %s, Direction: %s", nodeId, session_1.ConnectionDirection[direction]);
            this.connectionUpdated(nodeId, { type: _1.ConnectionStatusType.Connected, enr, direction });
        };
        this.handleWhoAreYouRequest = (nodeAddr, nonce) => {
            // Check what our latest known ENR is for this node
            const enr = this.findEnr(nodeAddr.nodeId) ?? null;
            if (enr) {
                log("Received WHOAREYOU, Node known, Node: %o", nodeAddr);
            }
            else {
                log("Received WHOAREYOU, Node unknown, requesting ENR. Node: %o", nodeAddr);
            }
            this.sessionService.sendChallenge(nodeAddr, nonce, enr);
        };
        // handle rpc request
        /**
         * Processes an RPC request from a peer.
         *
         * Requests respond to the received socket address, rather than the IP of the known ENR.
         */
        this.handleRpcRequest = (nodeAddr, request) => {
            this.metrics?.rcvdMessageCount.inc({ type: message_1.MessageType[request.type] });
            switch (request.type) {
                case message_1.MessageType.PING:
                    return this.handlePing(nodeAddr, request);
                case message_1.MessageType.FINDNODE:
                    return this.handleFindNode(nodeAddr, request);
                case message_1.MessageType.TALKREQ:
                    return this.handleTalkReq(nodeAddr, request);
                default:
                    log("Received request which is unimplemented");
                    // TODO Implement all RPC methods
                    return;
            }
        };
        this.handleTalkReq = (nodeAddr, message) => {
            log("Received TALKREQ message from Node: %o", nodeAddr);
            this.emit("talkReqReceived", nodeAddr, this.findEnr(nodeAddr.nodeId) ?? null, message);
        };
        // handle rpc response
        /**
         * Processes an RPC response from a peer.
         */
        this.handleRpcResponse = (nodeAddr, response) => {
            this.metrics?.rcvdMessageCount.inc({ type: message_1.MessageType[response.type] });
            // verify we know of the rpc id
            const activeRequest = this.activeRequests.get(response.id);
            if (!activeRequest) {
                log("Received an RPC response which doesn't match a request. Id: &s", response.id);
                return;
            }
            this.activeRequests.delete(response.id);
            // Check that the responder matches the expected request
            const requestNodeAddr = nodeInfo_1.getNodeAddress(activeRequest.contact);
            if (requestNodeAddr.nodeId !== nodeAddr.nodeId || !requestNodeAddr.socketAddr.equals(nodeAddr.socketAddr)) {
                log("Received a response from an unexpected address. Expected %o, received %o, request id: %s", requestNodeAddr, nodeAddr, response.id);
                return;
            }
            // Check that the response type matches the request
            if (!message_1.requestMatchesResponse(activeRequest.request, response)) {
                log("Node gave an incorrect response type. Ignoring response from: %o", nodeAddr);
                return;
            }
            switch (response.type) {
                case message_1.MessageType.PONG:
                    return this.handlePong(nodeAddr, activeRequest, response);
                case message_1.MessageType.NODES:
                    return this.handleNodes(nodeAddr, activeRequest, response);
                case message_1.MessageType.TALKRESP:
                    return this.handleTalkResp(nodeAddr, activeRequest, response);
                default:
                    // TODO Implement all RPC methods
                    return;
            }
        };
        this.handleTalkResp = (nodeAddr, activeRequest, message) => {
            log("Received TALKRESP message from Node: %o", nodeAddr);
            this.emit("talkRespReceived", nodeAddr, this.findEnr(nodeAddr.nodeId) ?? null, message);
            if (activeRequest.callback) {
                activeRequest.callback(null, message.response);
            }
        };
        /**
         * A session could not be established or an RPC request timed out
         */
        this.rpcFailure = (rpcId, error) => {
            log("RPC error, removing request. Reason: %s, id %s", session_1.RequestErrorType[error], rpcId);
            const req = this.activeRequests.get(rpcId);
            if (!req) {
                return;
            }
            const { request, contact, lookupId, callback } = req;
            this.activeRequests.delete(request.id);
            // If this is initiated by the user, return an error on the callback.
            if (callback) {
                callback(error, null);
            }
            const nodeId = nodeInfo_1.getNodeId(contact);
            // If a failed FindNodes Request, ensure we haven't partially received responses.
            // If so, process the partially found nodes
            if (request.type === message_1.MessageType.FINDNODE) {
                const nodesResponse = this.activeNodesResponses.get(request.id);
                if (nodesResponse) {
                    this.activeNodesResponses.delete(request.id);
                    if (nodesResponse.enrs.length) {
                        log("NODES response failed, but was partially processed from Node: %s", nodeId);
                        // If its a query, mark it as a success, to process the partial collection of its peers
                        this.discovered(nodeId, nodesResponse.enrs, lookupId);
                    }
                }
                else {
                    // There was no partially downloaded nodes, inform the lookup of the failure if its part of a query
                    const lookup = this.activeLookups.get(lookupId);
                    if (lookup) {
                        lookup.onFailure(nodeId);
                    }
                    else {
                        log("Failed %s request: %O for node: %s", message_1.MessageType[request.type], request, nodeId);
                    }
                }
            }
            else {
                // for all other requests, if any are lookups, mark them as failures.
                const lookup = this.activeLookups.get(lookupId);
                if (lookup) {
                    lookup.onFailure(nodeId);
                }
                else {
                    log("Failed %s request: %O for node: %s", message_1.MessageType[request.type], request, nodeId);
                }
            }
            // report the node as being disconnected
            this.connectionUpdated(nodeId, { type: _1.ConnectionStatusType.Disconnected });
        };
        this.config = config;
        this.sessionService = sessionService;
        this.kbuckets = new kademlia_1.KademliaRoutingTable(this.sessionService.enr.nodeId);
        this.activeLookups = new Map();
        this.activeRequests = new Map();
        this.activeNodesResponses = new Map();
        this.connectedPeers = new Map();
        this.nextLookupId = 1;
        this.addrVotes = new addrVotes_1.AddrVotes(config.addrVotesToUpdateEnr);
        if (metrics) {
            this.metrics = metrics;
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            const discv5 = this;
            metrics.kadTableSize.collect = () => metrics.kadTableSize.set(discv5.kbuckets.size);
            metrics.connectedPeerCount.collect = () => metrics.connectedPeerCount.set(discv5.connectedPeers.size);
            metrics.activeSessionCount.collect = () => metrics.activeSessionCount.set(discv5.sessionService.sessionsSize());
            metrics.lookupCount.collect = () => metrics.lookupCount.set(this.nextLookupId - 1);
        }
    }
    /**
     * Convenience method to create a new discv5 service.
     *
     * @param enr the ENR record identifying the current node.
     * @param peerId the PeerId with the keypair that identifies the enr
     * @param multiaddr The multiaddr which contains the the network interface and port to which the UDP server binds
     */
    static create({ enr, peerId, multiaddr, config = {}, metrics }) {
        const fullConfig = { ...config_1.defaultConfig, ...config };
        const decodedEnr = typeof enr === "string" ? enr_1.ENR.decodeTxt(enr) : enr;
        const udpTransport = new transport_1.UDPTransportService(multiaddr, decodedEnr.nodeId);
        const sessionService = new session_1.SessionService(fullConfig, decodedEnr, keypair_1.createKeypairFromPeerId(peerId), udpTransport);
        return new Discv5(fullConfig, sessionService, metrics);
    }
    /**
     * Starts the service and adds all initial bootstrap peers to be considered.
     */
    async start() {
        if (this.started) {
            log("Starting discv5 service failed -- already started");
            return;
        }
        log(`Starting discv5 service with node id ${this.enr.nodeId}`);
        this.kbuckets.on("pendingEviction", this.onPendingEviction);
        this.kbuckets.on("appliedEviction", this.onAppliedEviction);
        this.sessionService.on("established", this.onEstablished);
        this.sessionService.on("request", this.handleRpcRequest);
        this.sessionService.on("response", this.handleRpcResponse);
        this.sessionService.on("whoAreYouRequest", this.handleWhoAreYouRequest);
        this.sessionService.on("requestFailed", this.rpcFailure);
        await this.sessionService.start();
        this.started = true;
    }
    /**
     * Stops the service, closing any underlying networking activity.
     */
    async stop() {
        if (!this.started) {
            log("Stopping discv5 service -- already stopped");
            return;
        }
        log("Stopping discv5 service");
        this.kbuckets.off("pendingEviction", this.onPendingEviction);
        this.kbuckets.off("appliedEviction", this.onAppliedEviction);
        this.kbuckets.clear();
        this.activeLookups.forEach((lookup) => lookup.stop());
        this.activeLookups.clear();
        this.nextLookupId = 1;
        this.activeRequests.clear();
        this.activeNodesResponses.clear();
        this.addrVotes.clear();
        this.connectedPeers.forEach((intervalId) => clearInterval(intervalId));
        this.connectedPeers.clear();
        this.sessionService.off("established", this.onEstablished);
        this.sessionService.off("request", this.handleRpcRequest);
        this.sessionService.off("response", this.handleRpcResponse);
        this.sessionService.off("whoAreYouRequest", this.handleWhoAreYouRequest);
        this.sessionService.off("requestFailed", this.rpcFailure);
        await this.sessionService.stop();
        this.started = false;
    }
    isStarted() {
        return this.started;
    }
    /**
     * Adds a known ENR of a peer participating in Discv5 to the routing table.
     *
     * This allows pre-populating the kademlia routing table with known addresses,
     * so that they can be used immediately in following DHT operations involving one of these peers,
     * without having to dial them upfront.
     */
    addEnr(enr) {
        let decodedEnr;
        try {
            decodedEnr = typeof enr === "string" ? enr_1.ENR.decodeTxt(enr) : enr;
            decodedEnr.encode();
        }
        catch (e) {
            log("Unable to add enr: %o", enr);
            return;
        }
        if (this.kbuckets.insertOrUpdate(decodedEnr, kademlia_1.EntryStatus.Disconnected) === kademlia_1.InsertResult.Inserted) {
            this.emit("enrAdded", decodedEnr);
        }
    }
    get bindAddress() {
        return this.sessionService.transport.multiaddr;
    }
    get keypair() {
        return this.sessionService.keypair;
    }
    peerId() {
        return keypair_1.createPeerIdFromKeypair(this.keypair);
    }
    get enr() {
        return this.sessionService.enr;
    }
    get connectedPeerCount() {
        return this.connectedPeers.size;
    }
    getKadValue(nodeId) {
        return this.kbuckets.getValue(nodeId);
    }
    /**
     * Return all ENRs of nodes currently contained in buckets of the kad routing table
     */
    kadValues() {
        return this.kbuckets.values();
    }
    async findRandomNode() {
        return await this.findNode(enr_1.createNodeId(util_1.toBuffer(libp2p_crypto_1.randomBytes(32))));
    }
    /**
     * Starts an iterative FIND_NODE lookup
     */
    async findNode(target) {
        const lookupId = this.nextLookupId;
        log("Starting a new lookup. Id: %d", lookupId);
        if (this.nextLookupId >= 2 ** 32) {
            this.nextLookupId = 1;
        }
        else {
            this.nextLookupId += 1;
        }
        const knownClosestPeers = this.kbuckets.nearest(target, 16).map((enr) => enr.nodeId);
        const lookup = new kademlia_1.Lookup(this.config, target, knownClosestPeers);
        this.activeLookups.set(lookupId, lookup);
        return await new Promise((resolve) => {
            lookup.on("peer", (peer) => this.sendLookup(lookupId, peer, lookup.createRpcRequest(peer)));
            lookup.on("finished", (closest) => {
                log("Lookup Id: %d finished, %d total found", lookupId, closest.length);
                resolve(closest.map((nodeId) => this.findEnr(nodeId)).filter((enr) => enr));
                this.activeLookups.delete(lookupId);
            });
            // This will trigger "peer" events, eventually leading to a "finished" event
            lookup.start();
        });
    }
    /**
     * Broadcast TALKREQ message to all nodes in routing table and returns response
     */
    async broadcastTalkReq(payload, protocol) {
        return await new Promise((resolve, reject) => {
            const request = message_1.createTalkRequestMessage(payload, protocol);
            const callback = (err, res) => {
                if (err) {
                    return reject(err);
                }
                if (res) {
                    resolve(res);
                }
            };
            /** Broadcast request to all peers in the routing table */
            for (const node of this.kadValues()) {
                this.sendRpcRequest({
                    contact: nodeInfo_1.createNodeContact(node),
                    request,
                    callback,
                });
            }
        });
    }
    /**
     * Send TALKREQ message to dstId and returns response
     */
    async sendTalkReq(dstId, payload, protocol) {
        return await new Promise((resolve, reject) => {
            const enr = this.findEnr(dstId);
            if (!enr) {
                log("Talkreq requested an unknown ENR, node: %s", dstId);
                return;
            }
            this.sendRpcRequest({
                contact: nodeInfo_1.createNodeContact(enr),
                request: message_1.createTalkRequestMessage(payload, protocol),
                callback: (err, res) => {
                    if (err !== null) {
                        reject(err);
                        return;
                    }
                    resolve(res);
                },
            });
        });
    }
    /**
     * Send TALKRESP message to requesting node
     */
    async sendTalkResp(srcId, requestId, payload) {
        const msg = message_1.createTalkResponseMessage(requestId, payload);
        const enr = this.findEnr(srcId);
        const addr = enr?.getLocationMultiaddr("udp");
        if (enr && addr) {
            log(`Sending TALKRESP message to node ${enr.id}`);
            try {
                this.sessionService.sendResponse({ nodeId: srcId, socketAddr: addr }, msg);
                this.metrics?.sentMessageCount.inc({ type: message_1.MessageType[message_1.MessageType.TALKRESP] });
            }
            catch (e) {
                log("Failed to send a TALKRESP response. Error: %s", e.message);
            }
        }
        else {
            if (!addr && enr) {
                log(`No ip + udp port found for node ${srcId}`);
            }
            else {
                log(`Node ${srcId} not found`);
            }
        }
    }
    /**
     * Sends a PING request to a node
     */
    sendPing(enr) {
        this.sendRpcRequest({ contact: nodeInfo_1.createNodeContact(enr), request: message_1.createPingMessage(this.enr.seq) });
    }
    /**
     * Ping all peers connected in the routing table
     */
    pingConnectedPeers() {
        for (const entry of this.kbuckets.rawValues()) {
            if (entry.status === kademlia_1.EntryStatus.Connected) {
                this.sendPing(entry.value);
            }
        }
    }
    /**
     * Request an external node's ENR
     */
    requestEnr(contact, callback) {
        this.sendRpcRequest({ request: message_1.createFindNodeMessage([0]), contact, callback });
    }
    /**
     * Constructs and sends a request to the session service given a target and lookup peer
     */
    sendLookup(lookupId, peer, request) {
        const enr = this.findEnr(peer);
        if (!enr || !enr.getLocationMultiaddr("udp")) {
            log("Lookup %s requested an unknown ENR or ENR w/o UDP", lookupId);
            this.activeLookups.get(lookupId)?.onFailure(peer);
            return;
        }
        this.sendRpcRequest({
            contact: nodeInfo_1.createNodeContact(enr),
            request,
            lookupId,
        });
    }
    /**
     * Sends generic RPC requests.
     * Each request gets added to known outputs, awaiting a response
     *
     * Returns true if the request was sent successfully
     */
    sendRpcRequest(activeRequest) {
        this.activeRequests.set(activeRequest.request.id, activeRequest);
        const nodeAddr = nodeInfo_1.getNodeAddress(activeRequest.contact);
        log("Sending %s to node: %o", message_1.MessageType[activeRequest.request.type], nodeAddr);
        try {
            this.sessionService.sendRequest(activeRequest.contact, activeRequest.request);
            this.metrics?.sentMessageCount.inc({ type: message_1.MessageType[activeRequest.request.type] });
        }
        catch (e) {
            this.activeRequests.delete(activeRequest.request.id);
            log("Error sending RPC to node: %o, :Error: %s", nodeAddr, e.message);
        }
    }
    /**
     * Update the conection status of a node in the routing table.
     * This tracks whether or not we should be pinging peers.
     * Disconnected peers are removed from the queue and
     * newly added peers to the routing table are added to the queue.
     */
    connectionUpdated(nodeId, newStatus) {
        switch (newStatus.type) {
            case _1.ConnectionStatusType.Connected: {
                // attempt to update or insert the new ENR.
                switch (this.kbuckets.insertOrUpdate(newStatus.enr, kademlia_1.EntryStatus.Connected)) {
                    case kademlia_1.InsertResult.Inserted: {
                        // We added this peer to the table
                        log("New connected node added to routing table: %s", nodeId);
                        clearInterval(this.connectedPeers.get(nodeId));
                        this.connectedPeers.set(nodeId, setInterval(() => {
                            // If the node is in the routing table, keep pinging
                            if (this.kbuckets.getValue(nodeId)) {
                                this.sendPing(newStatus.enr);
                            }
                            else {
                                clearInterval(this.connectedPeers.get(nodeId));
                                this.connectedPeers.delete(nodeId);
                            }
                        }, this.config.pingInterval));
                        this.emit("enrAdded", newStatus.enr);
                        break;
                    }
                    case kademlia_1.InsertResult.UpdatedAndPromoted:
                    case kademlia_1.InsertResult.StatusUpdatedAndPromoted: {
                        // The node was promoted
                        log("Node promoted to connected: %s", nodeId);
                        clearInterval(this.connectedPeers.get(nodeId));
                        this.connectedPeers.set(nodeId, setInterval(() => {
                            // If the node is in the routing table, keep pinging
                            if (this.kbuckets.getValue(nodeId)) {
                                this.sendPing(newStatus.enr);
                            }
                            else {
                                clearInterval(this.connectedPeers.get(nodeId));
                                this.connectedPeers.delete(nodeId);
                            }
                        }, this.config.pingInterval));
                        break;
                    }
                    case kademlia_1.InsertResult.FailedBucketFull:
                    case kademlia_1.InsertResult.FailedInvalidSelfUpdate:
                        log("Could not insert node: %s", nodeId);
                        clearInterval(this.connectedPeers.get(nodeId));
                        this.connectedPeers.delete(nodeId);
                        break;
                }
                break;
            }
            case _1.ConnectionStatusType.PongReceived: {
                switch (this.kbuckets.update(newStatus.enr, kademlia_1.EntryStatus.Connected)) {
                    case kademlia_1.UpdateResult.FailedBucketFull:
                    case kademlia_1.UpdateResult.FailedKeyNonExistant: {
                        log("Could not update ENR from pong. Node: %s", nodeId);
                        clearInterval(this.connectedPeers.get(nodeId));
                        this.connectedPeers.delete(nodeId);
                        break;
                    }
                }
                break;
            }
            case _1.ConnectionStatusType.Disconnected: {
                // If the node has disconnected, remove any ping timer for the node.
                switch (this.kbuckets.updateStatus(nodeId, kademlia_1.EntryStatus.Disconnected)) {
                    case kademlia_1.UpdateResult.FailedBucketFull:
                    case kademlia_1.UpdateResult.FailedKeyNonExistant: {
                        log("Could not update node to disconnected, Node: %s", nodeId);
                        break;
                    }
                    default: {
                        log("Node set to disconnected: %s", nodeId);
                        break;
                    }
                }
                clearInterval(this.connectedPeers.get(nodeId));
                this.connectedPeers.delete(nodeId);
                break;
            }
        }
    }
    /**
     * Returns an ENR if one is known for the given NodeId
     *
     * This includes ENRs from any ongoing lookups not yet in the kad table
     */
    findEnr(nodeId) {
        // check if we know this node id in our routing table
        const enr = this.kbuckets.getValue(nodeId);
        if (enr) {
            return enr;
        }
        // Check the untrusted addresses for ongoing lookups
        for (const lookup of this.activeLookups.values()) {
            const enr = lookup.untrustedEnrs[nodeId];
            if (enr) {
                return enr;
            }
        }
        return undefined;
    }
    /**
     * Processes discovered peers from a query
     */
    discovered(srcId, enrs, lookupId) {
        const localId = this.enr.nodeId;
        const others = [];
        for (const enr of enrs) {
            if (enr.nodeId === localId) {
                continue;
            }
            // send the discovered event
            //if (this.config.reportDiscoveredPeers)
            this.emit("discovered", enr);
            // ignore peers that don't pass the table filter
            // if (this.config.tableFilter(enr)) {}
            // If any of the discovered nodes are in the routing table,
            // and there contains an older ENR, update it.
            const entry = this.kbuckets.getWithPending(enr.nodeId);
            if (entry) {
                if (entry.value.seq < enr.seq) {
                    switch (this.kbuckets.update(enr)) {
                        case kademlia_1.UpdateResult.FailedBucketFull:
                        case kademlia_1.UpdateResult.FailedKeyNonExistant: {
                            clearInterval(this.connectedPeers.get(enr.nodeId));
                            this.connectedPeers.delete(enr.nodeId);
                            log("Failed to update discovered ENR. Node: %s", enr.nodeId);
                            continue;
                        }
                    }
                }
            }
            others.push(enr);
        }
        // If this is part of a lookup, update the lookup
        if (lookupId) {
            const lookup = this.activeLookups.get(lookupId);
            if (lookup) {
                for (const enr of others) {
                    const enrNodeId = enr.nodeId;
                    if (!lookup.untrustedEnrs[enrNodeId]) {
                        lookup.untrustedEnrs[enrNodeId] = enr;
                    }
                }
                log("%d peers found for lookup Id: %d, Node: %s", others.length, lookupId, srcId);
                lookup.onSuccess(srcId, others.map((enr) => enr.nodeId));
            }
        }
    }
    handlePing(nodeAddr, message) {
        // check if we need to update the known ENR
        const entry = this.kbuckets.getWithPending(nodeAddr.nodeId);
        if (entry) {
            if (entry.value.seq < message.enrSeq) {
                this.requestEnr(nodeInfo_1.createNodeContact(entry.value));
            }
        }
        // build the Pong response
        log("Sending PONG response to node: %o", nodeAddr);
        try {
            const srcOpts = nodeAddr.socketAddr.toOptions();
            this.sessionService.sendResponse(nodeAddr, message_1.createPongMessage(message.id, this.enr.seq, srcOpts.host, srcOpts.port));
            this.metrics?.sentMessageCount.inc({ type: message_1.MessageType[message_1.MessageType.PONG] });
        }
        catch (e) {
            log("Failed to send Pong. Error %s", e.message);
        }
    }
    /**
     * Sends a NODES response, given a list of found ENRs.
     * This function splits the nodes up into multiple responses to ensure the response stays below
     * the maximum packet size
     */
    handleFindNode(nodeAddr, message) {
        const { id, distances } = message;
        let nodes = [];
        distances.forEach((distance) => {
            // if the distance is 0, send our local ENR
            if (distance === 0) {
                this.enr.encodeToValues(this.keypair.privateKey);
                nodes.push(this.enr);
            }
            else {
                nodes.push(...this.kbuckets.valuesOfDistance(distance));
            }
        });
        nodes = nodes.slice(0, 15);
        if (nodes.length === 0) {
            log("Sending empty NODES response to %o", nodeAddr);
            try {
                this.sessionService.sendResponse(nodeAddr, message_1.createNodesMessage(id, 0, nodes));
                this.metrics?.sentMessageCount.inc({ type: message_1.MessageType[message_1.MessageType.NODES] });
            }
            catch (e) {
                log("Failed to send a NODES response. Error: %s", e.message);
            }
            return;
        }
        // Repsonses assume that a session is established.
        // Thus, on top of the encoded ENRs the packet should be a regular message.
        // A regular message has a tag (32 bytes), an authTag (12 bytes)
        // and the NODES response has an ID (8 bytes) and a total (8 bytes).
        // The encryption adds the HMAC (16 bytes) and can be at most 16 bytes larger
        // So, the total empty packet size can be at most 92
        const nodesPerPacket = Math.floor((packet_1.MAX_PACKET_SIZE - 92) / enr_1.MAX_RECORD_SIZE);
        const total = Math.ceil(nodes.length / nodesPerPacket);
        log("Sending %d NODES responses to %o", total, nodeAddr);
        for (let i = 0; i < nodes.length; i += nodesPerPacket) {
            const _nodes = nodes.slice(i, i + nodesPerPacket);
            try {
                this.sessionService.sendResponse(nodeAddr, message_1.createNodesMessage(id, total, _nodes));
                this.metrics?.sentMessageCount.inc({ type: message_1.MessageType[message_1.MessageType.NODES] });
            }
            catch (e) {
                log("Failed to send a NODES response. Error: %s", e.message);
            }
        }
    }
    handlePong(nodeAddr, activeRequest, message) {
        log("Received a PONG response from %o", nodeAddr);
        if (this.config.enrUpdate) {
            const winningVote = this.addrVotes.addVote(nodeAddr.nodeId, message);
            const currentAddr = this.enr.getLocationMultiaddr("udp");
            if (winningVote && (!currentAddr || winningVote.multiaddrStr !== currentAddr.toString())) {
                log("Local ENR (IP & UDP) updated: %s", winningVote.multiaddrStr);
                const votedAddr = new multiaddr_1.Multiaddr(winningVote.multiaddrStr);
                this.enr.setLocationMultiaddr(votedAddr);
                this.emit("multiaddrUpdated", votedAddr);
                // publish update to all connected peers
                this.pingConnectedPeers();
            }
        }
        // Check if we need to request a new ENR
        const enr = this.findEnr(nodeAddr.nodeId);
        if (enr) {
            if (enr.seq < message.enrSeq) {
                log("Requesting an ENR update from node: %o", nodeAddr);
                this.sendRpcRequest({
                    contact: activeRequest.contact,
                    request: message_1.createFindNodeMessage([0]),
                });
            }
            this.connectionUpdated(nodeAddr.nodeId, { type: _1.ConnectionStatusType.PongReceived, enr });
        }
    }
    handleNodes(nodeAddr, activeRequest, message) {
        const { request, lookupId } = activeRequest;
        // Currently a maximum of 16 peers can be returned.
        // Datagrams have a max size of 1280 and ENRs have a max size of 300 bytes.
        // There should be no more than 5 responses to return 16 peers
        if (message.total > 5) {
            log("NODES response has a total larger than 5, nodes will be truncated");
        }
        // Filter out any nodes that are not of the correct distance
        // TODO: if a swarm peer reputation is built,
        // downvote the peer if all peers do not have the correct distance
        const distancesRequested = request.distances;
        message.enrs = message.enrs.filter((enr) => distancesRequested.includes(kademlia_1.log2Distance(enr.nodeId, nodeAddr.nodeId)));
        // handle the case that there is more than one response
        if (message.total > 1) {
            const currentResponse = this.activeNodesResponses.get(message.id) || { count: 1, enrs: [] };
            this.activeNodesResponses.delete(message.id);
            log("NODES response: %d of %d received, length: %d", currentResponse.count, message.total, message.enrs.length);
            // If there are more requests coming, store the nodes and wait for another response
            if (currentResponse.count < 5 && currentResponse.count < message.total) {
                currentResponse.count += 1;
                currentResponse.enrs.push(...message.enrs);
                this.activeRequests.set(message.id, activeRequest);
                this.activeNodesResponses.set(message.id, currentResponse);
                return;
            }
            // Have received all the Nodes responses we are willing to accept
            message.enrs.push(...currentResponse.enrs);
        }
        log("Received NODES response of length: %d, total: %d, from node: %o", message.enrs.length, message.total, nodeAddr);
        this.activeNodesResponses.delete(message.id);
        this.discovered(nodeAddr.nodeId, message.enrs, lookupId);
    }
}
exports.Discv5 = Discv5;
