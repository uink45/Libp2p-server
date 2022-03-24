"use strict";
/**
 * @module network
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Network = void 0;
const chain_1 = require("../chain/emitter");
const clock_1 = require("../chain/clock");
const reqresp_1 = require("./reqresp");
const metadata_1 = require("./metadata");

const emitter_1 = require("../chain/emitter");
const forks_1 = require("./forks");
const peerManager_1 = require("./peers/peerManager");
const peers_1 = require("./peers");
const events_1 = require("./events");
const blocks_1 = require("./blocks");
const { getReqRespHandlers } = require("./reqresp/handlers");
class Network {
    constructor(opts, modules) {
        this.opts = opts;
        this.subscribedForks = new Set();
        /**
         * Handle subscriptions through fork transitions, @see FORK_EPOCH_LOOKAHEAD
         */
        this.onEpoch = (epoch) => {
            try {
                // Compute prev and next fork shifted, so next fork is still next at forkEpoch + FORK_EPOCH_LOOKAHEAD
                const activeForks = (0, forks_1.getActiveForks)(this.config, epoch);
                for (let i = 0; i < activeForks.length; i++) {
                    // Only when a new fork is scheduled post this one
                    if (activeForks[i + 1]) {
                        const prevFork = activeForks[i];
                        const nextFork = activeForks[i + 1];
                        const forkEpoch = this.config.forks[nextFork].epoch;
                        // Before fork transition
                        if (epoch === forkEpoch - forks_1.FORK_EPOCH_LOOKAHEAD) {

                        }
                        // On fork transition
                        if (epoch === forkEpoch) {
                            // updateEth2Field() MUST be called with clock epoch, onEpoch event is emitted in response to clock events
                            this.metadata.updateEth2Field(epoch);
                        }
                        // After fork transition
                        if (epoch === forkEpoch + forks_1.FORK_EPOCH_LOOKAHEAD) {
                        }
                    }
                }
            }
            catch (e) {
                this.logger.error("Error on BeaconGossipHandler.onEpoch", { epoch }, e);
            }
        };
        this.subscribeCoreTopicsAtFork = (fork) => {
        };
        this.unsubscribeCoreTopicsAtFork = (fork) => {
        };
        const { config, libp2p, logger, metrics, signal } = modules;
        const emitter = new emitter_1.ChainEventEmitter();
        const clock = new clock_1.LocalClock({ config, emitter, genesisTime: 1606824023, signal });
        
        const networkEventBus = new events_1.NetworkEventBus();
        const metadata = new metadata_1.MetadataController({}, { config, clock, logger });
        const peerRpcScores = new peers_1.PeerRpcScoreStore();                
        const blocks = new blocks_1.Blocks(config, clock );    
        
        const reqRespHandlers = getReqRespHandlers({blocks});  
        this.libp2p = libp2p;
        this.logger = logger;
        this.config = config;
        this.clock = clock;
        this.emitter = emitter;
        this.events = networkEventBus;
        this.metadata = metadata;
        this.peerRpcScores = peerRpcScores;
        this.reqResp = new reqresp_1.ReqResp({ config, libp2p, reqRespHandlers, metadata, peerRpcScores, logger, networkEventBus, metrics }, opts);        
        this.peerManager = new peerManager_1.PeerManager({
            libp2p,
            reqResp: this.reqResp,
            logger,
            blocks,
            metrics,
            config,
            peerRpcScores,
            networkEventBus,
        }, opts);
        
        this.emitter.on(chain_1.ChainEvent.clockEpoch, this.onEpoch);
        modules.signal.addEventListener("abort", this.close.bind(this), { once: true });
    }
    /** Destroy this instance. Can only be called once. */
    close() {
        this.emitter.off(chain_1.ChainEvent.clockEpoch, this.onEpoch);
    }
    async start() {
        await this.libp2p.start();
        // Stop latency monitor since we handle disconnects here and don't want additional load on the event loop
        this.libp2p.connectionManager._latencyMonitor.stop();
        this.reqResp.start();
        this.metadata.start(this.getEnr(), this.config.getForkName(this.clock.currentSlot));
        await this.peerManager.start();
        const multiaddresses = this.libp2p.multiaddrs.map((m) => m.toString()).join(",");
        this.logger.info(`PeerId ${this.libp2p.peerId.toB58String()}, Multiaddrs ${multiaddresses}`);
    }
    async stop() {
        // Must goodbye and disconnect before stopping libp2p
        await this.peerManager.goodbyeAndDisconnectAllPeers();
        await this.peerManager.stop();
        this.reqResp.stop();
        await this.libp2p.stop();
    }
    get discv5() {
        var _a;
        return (_a = this.peerManager["discovery"]) === null || _a === void 0 ? void 0 : _a.discv5;
    }
    get localMultiaddrs() {
        return this.libp2p.multiaddrs;
    }
    get peerId() {
        return this.libp2p.peerId;
    }
    getEnr() {
        var _a;
        return (_a = this.peerManager["discovery"]) === null || _a === void 0 ? void 0 : _a.discv5.enr;
    }
    getConnectionsByPeer() {
        return this.libp2p.connectionManager.connections;
    }
    getConnectedPeers() {
        return this.peerManager.getConnectedPeerIds();
    }
    hasSomeConnectedPeer() {
        return this.peerManager.hasSomeConnectedPeer();
    }
    /**
     * The app layer needs to refresh the status of some peers. The sync have reached a target
     */
    reStatusPeers(peers) {
        this.peerManager.reStatusPeers(peers);
    }
    reportPeer(peer, action, actionName) {
        this.peerRpcScores.applyAction(peer, action, actionName);
    }
    // Debug
    async connectToPeer(peer, multiaddr) {
        await this.libp2p.peerStore.addressBook.add(peer, multiaddr);
        await this.libp2p.dial(peer);
    }
    async disconnectPeer(peer) {
        await this.libp2p.hangUp(peer);
    }
}
exports.Network = Network;
//# sourceMappingURL=network.js.map