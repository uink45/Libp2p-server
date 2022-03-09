import { Bucket } from "./bucket";
import { EntryStatus, IEntryFull, BucketEventEmitter, IEntry, InsertResult } from "./types";
import { NodeId, ENR } from "../enr";
import { UpdateResult } from ".";
declare const KademliaRoutingTable_base: new () => BucketEventEmitter;
/**
 * A Kademlia routing table, for storing ENRs based on their NodeIds
 *
 * ENRs are assigned to buckets based on their distance to the local NodeId
 * Each entry maintains a 'status', either connected or disconnected
 * Each bucket maintains a pending entry which may either
 * take the place of the oldest disconnected entry in the bucket
 * or be dropped after a timeout.
 */
export declare class KademliaRoutingTable extends KademliaRoutingTable_base {
    localId: NodeId;
    buckets: Bucket[];
    /**
     * Create a new routing table.
     *
     * @param localId the ID of the local node
     * @param k the size of each bucket (k value)
     */
    constructor(localId: NodeId);
    get size(): number;
    isEmpty(): boolean;
    clear(): void;
    /**
     * Removes a node from the routing table.
     *
     * Returns the entry if it existed.
     */
    removeById(id: NodeId): IEntry<ENR> | undefined;
    /**
     * Removes a node from the routing table.
     *
     * Returns the entry if it existed.
     */
    remove(value: ENR): IEntry<ENR> | undefined;
    /**
     * Updates a node's status if it exists in the table.
     */
    updateStatus(id: NodeId, status: EntryStatus): UpdateResult;
    /**
     * Updates a node's value if it exists in the table.
     *
     * Optionally the connection state can be modified.
     */
    update(value: ENR, status?: EntryStatus): UpdateResult;
    /**
     * Attempts to insert or update
     */
    insertOrUpdate(value: ENR, status: EntryStatus): InsertResult;
    /**
     * Gets the ENR if stored, does not include pending values
     */
    getValue(id: NodeId): ENR | undefined;
    /**
     * Gets the IEntryFull if stored, includes pending values
     */
    getWithPending(id: NodeId): IEntryFull<ENR> | undefined;
    nearest(id: NodeId, limit: number): ENR[];
    valuesOfDistance(value: number): ENR[];
    values(): ENR[];
    rawValues(): IEntry<ENR>[];
    random(): ENR | undefined;
    private bucketForValue;
    private bucketForId;
}
export {};
