"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bucket = void 0;
const events_1 = require("events");
const constants_1 = require("./constants");
const types_1 = require("./types");
class Bucket extends events_1.EventEmitter {
    constructor(pendingTimeout) {
        super();
        this.applyPending = () => {
            if (this.pending) {
                // If the bucket is full with connected nodes, drop the pending node
                if (this.firstConnectedIndex === 0) {
                    this.pending = undefined;
                    return;
                }
                // else the first entry can be removed and the pending can be added
                const evicted = this.removeByIndex(0);
                const inserted = this.pending.value;
                this.add(this.pending.value, this.pending.status);
                this.pending = undefined;
                this.emit("appliedEviction", inserted, evicted.value);
            }
        };
        this.nodes = [];
        this.pendingTimeout = pendingTimeout;
    }
    /**
     * Remove all entries, including any pending entry
     */
    clear() {
        this.nodes = [];
        this.pending = undefined;
        clearTimeout(this.pendingTimeoutId);
    }
    /**
     * The number of entries in the bucket
     */
    size() {
        return this.nodes.length;
    }
    /**
     * Returns true when there are no entries in the bucket
     */
    isEmpty() {
        return this.nodes.length === 0;
    }
    /**
     * Attempt to add an ENR with a status to the bucket
     *
     * If this entry's status is connected, the bucket is full, and there are disconnected entries in the bucket,
     * set this new entry as a pending entry
     */
    add(value, status) {
        // Prevent inserting duplicate nodes.
        if (this.get(value.nodeId)) {
            return types_1.InsertResult.NodeExists;
        }
        const isPendingNode = this.pending?.value.nodeId === value.nodeId;
        switch (status) {
            case types_1.EntryStatus.Connected: {
                if (this.nodes.length < constants_1.MAX_NODES_PER_BUCKET) {
                    this.firstConnectedIndex = this.firstConnectedIndex ?? this.nodes.length;
                    this.nodes.push({ value, status });
                    break;
                }
                else {
                    // The bucket is full, attempt to add the node as pending
                    if (this.addPending(value, status)) {
                        return types_1.InsertResult.Pending;
                    }
                    else {
                        return types_1.InsertResult.FailedBucketFull;
                    }
                }
            }
            case types_1.EntryStatus.Disconnected: {
                if (this.nodes.length < constants_1.MAX_NODES_PER_BUCKET) {
                    if (this.firstConnectedIndex === undefined) {
                        // No connected nodes, add to the end
                        this.nodes.push({ value, status });
                    }
                    else {
                        // add before the first connected node
                        this.nodes.splice(this.firstConnectedIndex, 0, { value, status });
                        this.firstConnectedIndex++;
                    }
                    break;
                }
                else {
                    // The bucket is full
                    return types_1.InsertResult.FailedBucketFull;
                }
            }
        }
        // If we inserted the node, make sure there is no pending node of the same key. This can
        // happen when a pending node is inserted, a node gets removed from the bucket, freeing up
        // space and then re-inserted here.
        if (isPendingNode) {
            delete this.pending;
        }
        return types_1.InsertResult.Inserted;
    }
    /**
     * Updates the value of the node referred to by the given key, if it is in the bucket.
     * If the node is not in the bucket, returns an update result indicating the outcome.
     * NOTE: This does not update the position of the node in the table.
     */
    updateValue(value) {
        const node = this.nodes.find((entry) => entry.value.nodeId === value.nodeId);
        if (node) {
            // use seq numbers to determine whether to update the value
            if (value.seq > node.value.seq) {
                node.value = value;
                return types_1.UpdateResult.Updated;
            }
            else {
                return types_1.UpdateResult.NotModified;
            }
        }
        else if (this.pending?.value.nodeId === value.nodeId) {
            this.pending.value = value;
            return types_1.UpdateResult.UpdatedPending;
        }
        else {
            return types_1.UpdateResult.FailedKeyNonExistant;
        }
    }
    /**
     * Updates the status of the node referred to by the given key, if it is in the bucket.
     * If the node is not in the bucket, returns an update result indicating the outcome.
     */
    updateStatus(id, status) {
        // Remove the node from its current position and then reinsert it
        // with the desired status, which puts it at the end of either the
        // prefix list of disconnected nodes or the suffix list of connected
        // nodes (i.e. most-recently disconnected or most-recently connected,
        // respectively).
        const index = this.nodes.findIndex((entry) => entry.value.nodeId === id);
        if (index !== -1) {
            // Remove the node from its current position.
            const node = this.removeByIndex(index);
            const oldStatus = node.status;
            // Flag indicating if this update modified the entry
            const notModified = oldStatus === status;
            // Flags indicating we are upgrading to a connected status
            const wasConnected = oldStatus === types_1.EntryStatus.Connected;
            const isConnected = status === types_1.EntryStatus.Connected;
            // If the least-recently connected node re-establishes its
            // connected status, drop the pending node.
            if (index === 0 && isConnected) {
                delete this.pending;
            }
            // Reinsert the node with the desired status
            switch (this.add(node.value, status)) {
                case types_1.InsertResult.Inserted: {
                    if (notModified) {
                        return types_1.UpdateResult.NotModified;
                    }
                    else if (!wasConnected && isConnected) {
                        return types_1.UpdateResult.UpdatedAndPromoted;
                    }
                    else {
                        return types_1.UpdateResult.Updated;
                    }
                }
                default:
                    throw new Error("Unreachable");
            }
        }
        else if (this.pending?.value.nodeId === id) {
            this.pending.status = status;
            return types_1.UpdateResult.UpdatedPending;
        }
        else {
            return types_1.UpdateResult.FailedKeyNonExistant;
        }
    }
    /**
     * Attempt to add an entry as a "pending" entry
     *
     * This will trigger a "pendingEviction" event with the entry which should be updated
     * and a callback to `applyPending` to evict the first disconnected entry, should one exist at the time.
     */
    addPending(value, status) {
        if (!this.pending && this.firstConnectedIndex !== 0) {
            this.pending = { value, status };
            const first = this.nodes[0];
            this.emit("pendingEviction", first.value);
            this.pendingTimeoutId = setTimeout(this.applyPending, this.pendingTimeout);
            return true;
        }
        return false;
    }
    /**
     * Get an entry from the bucket, if it exists
     */
    get(id) {
        const entry = this.nodes.find((entry) => entry.value.nodeId === id);
        if (entry) {
            return entry;
        }
        return undefined;
    }
    /**
     * Get an entry from the bucket if it exists
     * Also check the pending entry
     *
     * Return an entry with an additional property marking if the entry was the pending entry
     */
    getWithPending(id) {
        const bucketEntry = this.get(id);
        if (bucketEntry) {
            return { pending: false, ...bucketEntry };
        }
        if (this.pending && this.pending.value.nodeId === id) {
            return { pending: true, ...this.pending };
        }
        return undefined;
    }
    /**
     * Return the value of an entry if it exists in the bucket
     */
    getValue(id) {
        const entry = this.get(id);
        if (entry) {
            return entry.value;
        }
        return undefined;
    }
    /**
     * Get a value from the bucket by index
     */
    getValueByIndex(index) {
        if (index >= this.nodes.length) {
            throw new Error(`Invalid index in bucket: ${index}`);
        }
        return this.nodes[index].value;
    }
    /**
     * Remove a value from the bucket by index
     */
    removeByIndex(index) {
        if (index >= this.nodes.length) {
            throw new Error(`Invalid index in bucket: ${index}`);
        }
        // Remove the entry
        const entry = this.nodes.splice(index, 1)[0];
        // Update firstConnectedIndex
        switch (entry.status) {
            case types_1.EntryStatus.Connected: {
                if (this.firstConnectedIndex === index && index === this.nodes.length) {
                    // It was the last connected node.
                    delete this.firstConnectedIndex;
                }
                break;
            }
            case types_1.EntryStatus.Disconnected: {
                this.firstConnectedIndex =
                    this.firstConnectedIndex === undefined ? this.firstConnectedIndex : this.firstConnectedIndex - 1;
            }
        }
        return entry;
    }
    /**
     * Remove a value from the bucket by NodeId
     */
    removeById(id) {
        const index = this.nodes.findIndex((entry) => entry.value.nodeId === id);
        if (index === -1) {
            return undefined;
        }
        return this.removeByIndex(index);
    }
    /**
     * Remove an ENR from the bucket
     */
    remove(value) {
        return this.removeById(value.nodeId);
    }
    /**
     * Return the bucket values as an array
     */
    values() {
        return this.nodes.map((entry) => entry.value);
    }
    /**
     * Return the raw nodes as an array
     */
    rawValues() {
        return this.nodes;
    }
}
exports.Bucket = Bucket;
