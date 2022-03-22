"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderIrrelevantPeerType = exports.isZeroRoot = exports.assertPeerRelevance = exports.IrrelevantPeerCode = void 0;
const lodestar_beacon_state_transition_1 = require("@chainsafe/lodestar-beacon-state-transition");
const lodestar_params_1 = require("@chainsafe/lodestar-params");
const lodestar_types_1 = require("@chainsafe/lodestar-types");
const ssz_1 = require("@chainsafe/ssz");
const constants_1 = require("../../../constants");
// TODO: Why this value? (From Lighthouse)
const FUTURE_SLOT_TOLERANCE = 1;
var IrrelevantPeerCode;
(function (IrrelevantPeerCode) {
    IrrelevantPeerCode["INCOMPATIBLE_FORKS"] = "IRRELEVANT_PEER_INCOMPATIBLE_FORKS";
    IrrelevantPeerCode["DIFFERENT_CLOCKS"] = "IRRELEVANT_PEER_DIFFERENT_CLOCKS";
    IrrelevantPeerCode["GENESIS_NONZERO"] = "IRRELEVANT_PEER_GENESIS_NONZERO";
    IrrelevantPeerCode["DIFFERENT_FINALIZED"] = "IRRELEVANT_PEER_DIFFERENT_FINALIZED";
})(IrrelevantPeerCode = exports.IrrelevantPeerCode || (exports.IrrelevantPeerCode = {}));
/**
 * Process a `Status` message to determine if a peer is relevant to us. If the peer is
 * irrelevant the reason is returned.
 */
function assertPeerRelevance(remote, blocks) {
    const local = blocks.getStatus();
    /*
    console.log("Local: ");
    console.log(local);
    console.log("Remote: ");
    console.log(remote);
    */
    // The node is on a different network/fork
    if (!lodestar_types_1.ssz.ForkDigest.equals(local.forkDigest, remote.forkDigest)) {
        console.log("Incompatible forks");
        return {
            code: IrrelevantPeerCode.INCOMPATIBLE_FORKS,
            ours: local.forkDigest,
            theirs: remote.forkDigest,
        };
    }
    // The remote's head is on a slot that is significantly ahead of what we consider the
    // current slot. This could be because they are using a different genesis time, or that
    // their or our system's clock is incorrect.
    const slotDiff = remote.headSlot - Math.max(blocks.clock.currentSlot, 0);
    if (slotDiff > FUTURE_SLOT_TOLERANCE) {
        console.log("Different clocks");
        return { code: IrrelevantPeerCode.DIFFERENT_CLOCKS, slotDiff };
    }
    // TODO: Is this check necessary?
    if (remote.finalizedEpoch === constants_1.GENESIS_EPOCH && !isZeroRoot(remote.finalizedRoot)) {
        console.log("Genesis non-zero");
        return {
            code: IrrelevantPeerCode.GENESIS_NONZERO,
            root: remote.finalizedRoot,
        };
    }
    // The remote's finalized epoch is less than or equal to ours, but the block root is
    // different to the one in our chain. Therefore, the node is on a different chain and we
    // should not communicate with them.
    if (remote.finalizedEpoch <= local.finalizedEpoch &&
        !isZeroRoot(remote.finalizedRoot) &&
        !isZeroRoot(local.finalizedRoot)) {
        const remoteRoot = remote.finalizedRoot;
        const expectedRoot = local.finalizedRoot;
        if (expectedRoot !== null && !lodestar_types_1.ssz.Root.equals(remoteRoot, expectedRoot)) {
            console.log("Different finalized");
            return {
                code: IrrelevantPeerCode.DIFFERENT_FINALIZED,
                expectedRoot: expectedRoot,
                remoteRoot: remoteRoot,
            };
        }
    }
    // Note: Accept request status finalized checkpoint in the future, we do not know if it is a true finalized root
    return null;
}
exports.assertPeerRelevance = assertPeerRelevance;
function isZeroRoot(root) {
    const ZERO_ROOT = lodestar_types_1.ssz.Root.defaultValue();
    return lodestar_types_1.ssz.Root.equals(root, ZERO_ROOT);
}
exports.isZeroRoot = isZeroRoot;

function renderIrrelevantPeerType(type) {
    switch (type.code) {
        case IrrelevantPeerCode.INCOMPATIBLE_FORKS:
            return `INCOMPATIBLE_FORKS ours: ${(0, ssz_1.toHexString)(type.ours)} theirs: ${(0, ssz_1.toHexString)(type.theirs)}`;
        case IrrelevantPeerCode.DIFFERENT_CLOCKS:
            return `DIFFERENT_CLOCKS slotDiff: ${type.slotDiff}`;
        case IrrelevantPeerCode.GENESIS_NONZERO:
            return `GENESIS_NONZERO: ${(0, ssz_1.toHexString)(type.root)}`;
        case IrrelevantPeerCode.DIFFERENT_FINALIZED:
            return `DIFFERENT_FINALIZED root: ${(0, ssz_1.toHexString)(type.remoteRoot)} expected: ${(0, ssz_1.toHexString)(type.expectedRoot)}`;
    }
}
exports.renderIrrelevantPeerType = renderIrrelevantPeerType;
//# sourceMappingURL=assertPeerRelevance.js.map