import { BaseDatastore } from "datastore-core";
import LevelDatastore from "datastore-level";
import { Key, KeyQuery, Query, Options, Pair } from "interface-datastore";
/**
 * Before libp2p 0.35, peerstore stays in memory and periodically write to db after n dirty items
 * This has a memory issue because all peer data stays in memory and loaded at startup time
 * This is written for libp2p >=0.35, we maintain the same mechanism but with bounded data structure
 * This datastore includes a memory datastore and fallback to db datastore
 * Use an in-memory datastore with last accessed time and _maxMemoryItems, on start it's empty (lazy load)
 * - get: Search in-memory datastore first, if not found search from db.
 *     - If found from db, add back to the in-memory datastore
 *     - Update lastAccessedMs
 * - put: move oldest items from memory to db if there are more than _maxMemoryItems items in memory
 *     -  update memory datastore, only update db datastore if there are at least _threshold dirty items
 *     -  Update lastAccessedMs
 */
export declare class Eth2PeerDataStore extends BaseDatastore {
    private _dbDatastore;
    private _memoryDatastore;
    /** Same to PersistentPeerStore of the old libp2p implementation */
    private _dirtyItems;
    /** If there are more dirty items than threshold, commit data to db */
    private _threshold;
    /** If there are more memory items than this, prune oldest ones from memory and move to db */
    private _maxMemoryItems;
    constructor(dbDatastore: LevelDatastore | string, { threshold, maxMemoryItems }?: {
        threshold?: number | undefined;
        maxMemoryItems?: number | undefined;
    });
    open(): Promise<void>;
    close(): Promise<void>;
    put(key: Key, val: Uint8Array): Promise<void>;
    /**
     * Same interface to put with "fromDb" option, if this item is updated back from db
     * Move oldest items from memory data store to db if it's over this._maxMemoryItems
     */
    _put(key: Key, val: Uint8Array, fromDb?: boolean): Promise<void>;
    /**
     * Check memory datastore - update lastAccessedMs, then db datastore
     * If found in db datastore then update back the memory datastore
     * This throws error if not found
     * see https://github.com/ipfs/js-datastore-level/blob/38f44058dd6be858e757a1c90b8edb31590ec0bc/src/index.js#L102
     */
    get(key: Key): Promise<Uint8Array>;
    has(key: Key): Promise<boolean>;
    delete(key: Key): Promise<void>;
    _all(q: Query, options?: Options): AsyncIterable<Pair>;
    _allKeys(q: KeyQuery, options?: Options): AsyncIterable<Key>;
    private _addDirtyItem;
    private _commitData;
    /**
     * Prune from memory and move to db
     */
    private pruneMemoryDatastore;
}
//# sourceMappingURL=datastore.d.ts.map