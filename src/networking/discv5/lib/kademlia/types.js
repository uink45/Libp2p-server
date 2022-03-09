"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LookupPeerState = exports.LookupState = exports.EntryStatus = exports.UpdateResult = exports.InsertResult = void 0;
/** The result of inserting an entry into a bucket. */
var InsertResult;
(function (InsertResult) {
    /** The entry has been sucessfully inserted */
    InsertResult[InsertResult["Inserted"] = 0] = "Inserted";
    /**
     * The entry is pending insertion because the relevant bucket is currently full.
     *
     * The entry is inserted after a timeout elapsed, if the status of the least-recently connected
     * (and currently disconnected) node in the bucket is not updated before the timeout expires.
     */
    InsertResult[InsertResult["Pending"] = 1] = "Pending";
    /** The node existed and the status was updated */
    InsertResult[InsertResult["StatusUpdated"] = 2] = "StatusUpdated";
    /** The node existed and the status was updated and the node was promoted to a connected state */
    InsertResult[InsertResult["StatusUpdatedAndPromoted"] = 3] = "StatusUpdatedAndPromoted";
    /** The node existed and the value was updated. */
    InsertResult[InsertResult["ValueUpdated"] = 4] = "ValueUpdated";
    /** Both the status and value were updated. */
    InsertResult[InsertResult["Updated"] = 5] = "Updated";
    /** Both the status and value were promoted and the node was promoted to a connected state */
    InsertResult[InsertResult["UpdatedAndPromoted"] = 6] = "UpdatedAndPromoted";
    /** The pending slot was updated. */
    InsertResult[InsertResult["UpdatedPending"] = 7] = "UpdatedPending";
    /** The entry was not inserted because the relevant bucket is full. */
    InsertResult[InsertResult["FailedBucketFull"] = 8] = "FailedBucketFull";
    /** Cannot update self */
    InsertResult[InsertResult["FailedInvalidSelfUpdate"] = 9] = "FailedInvalidSelfUpdate";
    /** The entry already exists. */
    InsertResult[InsertResult["NodeExists"] = 10] = "NodeExists";
})(InsertResult = exports.InsertResult || (exports.InsertResult = {}));
/** The result of performing an update on a bucket. */
var UpdateResult;
(function (UpdateResult) {
    /** The node was updated successfully */
    UpdateResult[UpdateResult["Updated"] = 0] = "Updated";
    /** The update promited the node to a connected state from a disconnected state. */
    UpdateResult[UpdateResult["UpdatedAndPromoted"] = 1] = "UpdatedAndPromoted";
    /** The pending entry was updated. */
    UpdateResult[UpdateResult["UpdatedPending"] = 2] = "UpdatedPending";
    /** The update removed the node. The node didn't exist. */
    UpdateResult[UpdateResult["FailedKeyNonExistant"] = 3] = "FailedKeyNonExistant";
    /** The update removed the node. The bucket was full. */
    UpdateResult[UpdateResult["FailedBucketFull"] = 4] = "FailedBucketFull";
    /** There were no changes made to the value of the node. */
    UpdateResult[UpdateResult["NotModified"] = 5] = "NotModified";
})(UpdateResult = exports.UpdateResult || (exports.UpdateResult = {}));
var EntryStatus;
(function (EntryStatus) {
    EntryStatus[EntryStatus["Connected"] = 0] = "Connected";
    EntryStatus[EntryStatus["Disconnected"] = 1] = "Disconnected";
})(EntryStatus = exports.EntryStatus || (exports.EntryStatus = {}));
var LookupState;
(function (LookupState) {
    /**
     * The query is making progress by iterating towards `numResults` closest peers
     * to the target with a maximum of `parallelism` peers at a time
     */
    LookupState[LookupState["Iterating"] = 0] = "Iterating";
    /**
     * A query is stalled when it did not make progress after `parallelism` consecutive
     * successful results.
     *
     * While the query is stalled, the maximum allowed parallelism for pending results
     * is increased to numResults in an attempt to finish the query.
     * If the query can make progress again upon receiving the remaining results,
     * it switches back to `Iterating`. Otherwise it will be finished.
     */
    LookupState[LookupState["Stalled"] = 1] = "Stalled";
    /**
     * The query is finished.
     *
     * A query finishes either when it has collected `numResults` results from the
     * closes peers (not counting those that failed or are unresponsive)
     * or because the query ran out of peers that have not yet delivered results (or failed).
     */
    LookupState[LookupState["Finished"] = 2] = "Finished";
})(LookupState = exports.LookupState || (exports.LookupState = {}));
var LookupPeerState;
(function (LookupPeerState) {
    /**
     * The peer has not yet been contacted
     *
     * This is the starting state for every peer known or discovered by a lookup
     */
    LookupPeerState[LookupPeerState["NotContacted"] = 0] = "NotContacted";
    /**
     * The lookup is waiting for a result from the peer
     */
    LookupPeerState[LookupPeerState["Waiting"] = 1] = "Waiting";
    /**
     * Obtaining a result from the peer has failed
     */
    LookupPeerState[LookupPeerState["Failed"] = 2] = "Failed";
    /**
     * A successful result from the peer has been delivered
     */
    LookupPeerState[LookupPeerState["Succeeded"] = 3] = "Succeeded";
})(LookupPeerState = exports.LookupPeerState || (exports.LookupPeerState = {}));
