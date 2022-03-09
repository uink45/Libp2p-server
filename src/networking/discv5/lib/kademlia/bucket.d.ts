import { ENR, NodeId } from "../enr";
import { BucketEventEmitter, EntryStatus, IEntry, IEntryFull, InsertResult, UpdateResult } from "./types";
declare const Bucket_base: new () => BucketEventEmitter;
export declare class Bucket extends Bucket_base {
    /**
     * Entries ordered from least-recently connected to most-recently connected
     */
    private nodes;
    /**
     * The position (index) in `nodes`
     * Since the entries in `nodes` are ordered from least-recently connected to
     * most-recently connected, all entries above this index are also considered
     * connected, i.e. the range `[0, firstConnectedIndex)` marks the sub-list of entries
     * that are considered disconnected and the range
     * `[firstConnectedIndex, MAX_NODES_PER_BUCKET)` marks sub-list of entries that are
     * considered connected.
     *
     * `undefined` indicates that there are no connected entries in the bucket, i.e.
     * the bucket is either empty, or contains only entries for peers that are
     * considered disconnected.
     */
    private firstConnectedIndex?;
    /**
     * A node that is pending to be inserted into a full bucket, should the
     * least-recently connected (and currently disconnected) node not be
     * marked as connected within `pendingTimeout`.
     */
    private pending;
    /**
     * The timeout window before a new pending node is eligible for insertion,
     * if the least-recently connected node is not updated as being connected
     * in the meantime.
     */
    private pendingTimeout;
    private pendingTimeoutId;
    constructor(pendingTimeout: number);
    /**
     * Remove all entries, including any pending entry
     */
    clear(): void;
    /**
     * The number of entries in the bucket
     */
    size(): number;
    /**
     * Returns true when there are no entries in the bucket
     */
    isEmpty(): boolean;
    /**
     * Attempt to add an ENR with a status to the bucket
     *
     * If this entry's status is connected, the bucket is full, and there are disconnected entries in the bucket,
     * set this new entry as a pending entry
     */
    add(value: ENR, status: EntryStatus): InsertResult;
    /**
     * Updates the value of the node referred to by the given key, if it is in the bucket.
     * If the node is not in the bucket, returns an update result indicating the outcome.
     * NOTE: This does not update the position of the node in the table.
     */
    updateValue(value: ENR): UpdateResult;
    /**
     * Updates the status of the node referred to by the given key, if it is in the bucket.
     * If the node is not in the bucket, returns an update result indicating the outcome.
     */
    updateStatus(id: NodeId, status: EntryStatus): UpdateResult;
    /**
     * Attempt to add an entry as a "pending" entry
     *
     * This will trigger a "pendingEviction" event with the entry which should be updated
     * and a callback to `applyPending` to evict the first disconnected entry, should one exist at the time.
     */
    addPending(value: ENR, status: EntryStatus): boolean;
    applyPending: () => void;
    /**
     * Get an entry from the bucket, if it exists
     */
    get(id: NodeId): IEntry<ENR> | undefined;
    /**
     * Get an entry from the bucket if it exists
     * Also check the pending entry
     *
     * Return an entry with an additional property marking if the entry was the pending entry
     */
    getWithPending(id: NodeId): IEntryFull<ENR> | undefined;
    /**
     * Return the value of an entry if it exists in the bucket
     */
    getValue(id: NodeId): ENR | undefined;
    /**
     * Get a value from the bucket by index
     */
    getValueByIndex(index: number): ENR;
    /**
     * Remove a value from the bucket by index
     */
    removeByIndex(index: number): IEntry<ENR>;
    /**
     * Remove a value from the bucket by NodeId
     */
    removeById(id: NodeId): IEntry<ENR> | undefined;
    /**
     * Remove an ENR from the bucket
     */
    remove(value: ENR): IEntry<ENR> | undefined;
    /**
     * Return the bucket values as an array
     */
    values(): ENR[];
    /**
     * Return the raw nodes as an array
     */
    rawValues(): IEntry<ENR>[];
}
export {};
