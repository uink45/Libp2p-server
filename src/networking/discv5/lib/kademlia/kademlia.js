"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KademliaRoutingTable = void 0;
const events_1 = require("events");
const bucket_1 = require("./bucket");
const types_1 = require("./types");
const constants_1 = require("./constants");
const util_1 = require("./util");
const _1 = require(".");
/**
 * A Kademlia routing table, for storing ENRs based on their NodeIds
 *
 * ENRs are assigned to buckets based on their distance to the local NodeId
 * Each entry maintains a 'status', either connected or disconnected
 * Each bucket maintains a pending entry which may either
 * take the place of the oldest disconnected entry in the bucket
 * or be dropped after a timeout.
 */
class KademliaRoutingTable extends events_1.EventEmitter {
    /**
     * Create a new routing table.
     *
     * @param localId the ID of the local node
     * @param k the size of each bucket (k value)
     */
    constructor(localId) {
        super();
        this.localId = localId;
        this.buckets = Array.from({ length: constants_1.NUM_BUCKETS }, () => new bucket_1.Bucket(constants_1.PENDING_TIMEOUT));
        this.buckets.forEach((bucket) => {
            bucket.on("pendingEviction", (enr) => this.emit("pendingEviction", enr));
            bucket.on("appliedEviction", (inserted, evicted) => this.emit("appliedEviction", inserted, evicted));
        });
    }
    get size() {
        return this.buckets.reduce((acc, bucket) => acc + bucket.size(), 0);
    }
    isEmpty() {
        return this.size == 0;
    }
    clear() {
        this.buckets.forEach((bucket) => bucket && bucket.clear());
    }
    /**
     * Removes a node from the routing table.
     *
     * Returns the entry if it existed.
     */
    removeById(id) {
        const bucket = this.bucketForId(id);
        return bucket.removeById(id);
    }
    /**
     * Removes a node from the routing table.
     *
     * Returns the entry if it existed.
     */
    remove(value) {
        const bucket = this.bucketForValue(value);
        return bucket.remove(value);
    }
    /**
     * Updates a node's status if it exists in the table.
     */
    updateStatus(id, status) {
        if (this.localId === id) {
            return _1.UpdateResult.NotModified;
        }
        const bucket = this.bucketForId(id);
        return bucket.updateStatus(id, status);
    }
    /**
     * Updates a node's value if it exists in the table.
     *
     * Optionally the connection state can be modified.
     */
    update(value, status) {
        if (this.localId === value.nodeId) {
            return _1.UpdateResult.NotModified;
        }
        const bucket = this.bucketForValue(value);
        const updateResult = bucket.updateValue(value);
        switch (updateResult) {
            case _1.UpdateResult.FailedBucketFull:
            case _1.UpdateResult.FailedKeyNonExistant:
                return updateResult;
        }
        if (status === undefined) {
            return updateResult;
        }
        const statusResult = bucket.updateStatus(value.nodeId, status);
        switch (statusResult) {
            case _1.UpdateResult.FailedBucketFull:
            case _1.UpdateResult.FailedKeyNonExistant:
            case _1.UpdateResult.UpdatedAndPromoted:
            case _1.UpdateResult.UpdatedPending:
                return statusResult;
        }
        if (updateResult === _1.UpdateResult.UpdatedPending ||
            (updateResult === _1.UpdateResult.NotModified && statusResult === _1.UpdateResult.NotModified)) {
            return updateResult;
        }
        else {
            return _1.UpdateResult.Updated;
        }
    }
    /**
     * Attempts to insert or update
     */
    insertOrUpdate(value, status) {
        const id = value.nodeId;
        if (this.localId === id) {
            return types_1.InsertResult.FailedInvalidSelfUpdate;
        }
        const bucket = this.bucketForValue(value);
        if (!bucket.get(id)) {
            return bucket.add(value, status);
        }
        else {
            // The node exists in the bucket
            // Attempt to update the status
            const updateStatus = bucket.updateStatus(id, status);
            // If there was a failure state, we'd return early
            // but the only failure we have is a full bucket (which can't happen here)
            // Attempt to update the value
            const updateValue = bucket.updateValue(value);
            if (updateValue === _1.UpdateResult.Updated && updateStatus === _1.UpdateResult.Updated) {
                return types_1.InsertResult.Updated;
            }
            if (updateValue === _1.UpdateResult.Updated && updateStatus === _1.UpdateResult.UpdatedAndPromoted) {
                return types_1.InsertResult.UpdatedAndPromoted;
            }
            if ((updateValue === _1.UpdateResult.Updated && updateStatus === _1.UpdateResult.NotModified) ||
                (updateValue === _1.UpdateResult.Updated && updateStatus === _1.UpdateResult.UpdatedPending)) {
                return types_1.InsertResult.ValueUpdated;
            }
            if (updateValue === _1.UpdateResult.NotModified && updateStatus === _1.UpdateResult.Updated) {
                return types_1.InsertResult.StatusUpdated;
            }
            if (updateValue === _1.UpdateResult.NotModified && updateStatus === _1.UpdateResult.UpdatedAndPromoted) {
                return types_1.InsertResult.StatusUpdatedAndPromoted;
            }
            if (updateValue === _1.UpdateResult.NotModified && updateStatus === _1.UpdateResult.NotModified) {
                return types_1.InsertResult.Updated;
            }
            if (updateValue === _1.UpdateResult.UpdatedPending && updateStatus === _1.UpdateResult.UpdatedPending) {
                return types_1.InsertResult.UpdatedPending;
            }
            throw new Error("Unreachable");
        }
    }
    /**
     * Gets the ENR if stored, does not include pending values
     */
    getValue(id) {
        const bucket = this.bucketForId(id);
        return bucket.getValue(id);
    }
    /**
     * Gets the IEntryFull if stored, includes pending values
     */
    getWithPending(id) {
        const bucket = this.bucketForId(id);
        return bucket.getWithPending(id);
    }
    nearest(id, limit) {
        const results = [];
        this.buckets.forEach((bucket) => {
            results.push(...bucket.values());
        });
        results.sort((a, b) => {
            return util_1.log2Distance(id, a.nodeId) - util_1.log2Distance(id, b.nodeId);
        });
        return results.slice(0, limit);
    }
    valuesOfDistance(value) {
        const bucket = this.buckets[value - 1];
        return bucket === undefined ? [] : bucket.values();
    }
    values() {
        return this.buckets
            .filter((bucket) => !bucket.isEmpty())
            .map((bucket) => bucket.values())
            .flat();
    }
    rawValues() {
        return this.buckets
            .filter((bucket) => !bucket.isEmpty())
            .map((bucket) => bucket.rawValues())
            .flat();
    }
    random() {
        const nonEmptyBuckets = this.buckets.filter((bucket) => !bucket.isEmpty());
        if (nonEmptyBuckets.length == 0) {
            return undefined;
        }
        const selectedBucket = nonEmptyBuckets[Math.floor(Math.random() * nonEmptyBuckets.length)];
        return selectedBucket.getValueByIndex(Math.floor(Math.random() * selectedBucket.size()));
    }
    bucketForValue(value) {
        return this.bucketForId(value.nodeId);
    }
    bucketForId(id) {
        const bucketId = util_1.log2Distance(this.localId, id) - 1;
        return this.buckets[bucketId];
    }
}
exports.KademliaRoutingTable = KademliaRoutingTable;
