"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Eth2PeerDataStore = void 0;
const datastore_core_1 = require("datastore-core");
const datastore_level_1 = __importDefault(require("datastore-level"));
const interface_datastore_1 = require("interface-datastore");
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
class Eth2PeerDataStore extends datastore_core_1.BaseDatastore {
    constructor(dbDatastore, { threshold = 5, maxMemoryItems = 50 } = {}) {
        super();
        /** Same to PersistentPeerStore of the old libp2p implementation */
        this._dirtyItems = new Set();
        if (threshold <= 0 || maxMemoryItems <= 0) {
            throw Error(`Invalid threshold ${threshold} or maxMemoryItems ${maxMemoryItems}`);
        }
        if (threshold > maxMemoryItems) {
            throw Error(`Threshold ${threshold} should be at most maxMemoryItems ${maxMemoryItems}`);
        }
        this._dbDatastore = typeof dbDatastore === "string" ? new datastore_level_1.default(dbDatastore) : dbDatastore;
        this._memoryDatastore = new Map();
        this._threshold = threshold;
        this._maxMemoryItems = maxMemoryItems;
    }
    async open() {
        return this._dbDatastore.open();
    }
    async close() {
        return this._dbDatastore.close();
    }
    async put(key, val) {
        return this._put(key, val, false);
    }
    /**
     * Same interface to put with "fromDb" option, if this item is updated back from db
     * Move oldest items from memory data store to db if it's over this._maxMemoryItems
     */
    async _put(key, val, fromDb = false) {
        while (this._memoryDatastore.size >= this._maxMemoryItems) {
            // it's likely this is called only 1 time
            await this.pruneMemoryDatastore();
        }
        const keyStr = key.toString();
        const memoryItem = this._memoryDatastore.get(keyStr);
        if (memoryItem) {
            // update existing
            memoryItem.lastAccessedMs = Date.now();
            memoryItem.data = val;
        }
        else {
            // new
            this._memoryDatastore.set(keyStr, { data: val, lastAccessedMs: Date.now() });
        }
        if (!fromDb)
            await this._addDirtyItem(keyStr);
    }
    /**
     * Check memory datastore - update lastAccessedMs, then db datastore
     * If found in db datastore then update back the memory datastore
     * This throws error if not found
     * see https://github.com/ipfs/js-datastore-level/blob/38f44058dd6be858e757a1c90b8edb31590ec0bc/src/index.js#L102
     */
    async get(key) {
        const keyStr = key.toString();
        const memoryItem = this._memoryDatastore.get(keyStr);
        if (memoryItem) {
            memoryItem.lastAccessedMs = Date.now();
            return memoryItem.data;
        }
        // this throws error if not found
        const dbValue = await this._dbDatastore.get(key);
        // don't call this._memoryDatastore.set directly
        // we want to get through prune() logic with fromDb as true
        await this._put(key, dbValue, true);
        return dbValue;
    }
    async has(key) {
        try {
            await this.get(key);
        }
        catch (err) {
            // this is the same to how js-datastore-level handles notFound error
            // https://github.com/ipfs/js-datastore-level/blob/38f44058dd6be858e757a1c90b8edb31590ec0bc/src/index.js#L121
            if (err.notFound)
                return false;
            throw err;
        }
        return true;
    }
    async delete(key) {
        this._memoryDatastore.delete(key.toString());
        await this._dbDatastore.delete(key);
    }
    async *_all(q, options) {
        for (const [key, value] of this._memoryDatastore.entries()) {
            yield {
                key: new interface_datastore_1.Key(key),
                value: value.data,
            };
        }
        yield* this._dbDatastore.query(q, options);
    }
    async *_allKeys(q, options) {
        for (const key of this._memoryDatastore.keys()) {
            yield new interface_datastore_1.Key(key);
        }
        yield* this._dbDatastore.queryKeys(q, options);
    }
    async _addDirtyItem(keyStr) {
        this._dirtyItems.add(keyStr);
        if (this._dirtyItems.size >= this._threshold) {
            try {
                await this._commitData();
                // eslint-disable-next-line no-empty
            }
            catch (e) { }
        }
    }
    async _commitData() {
        const batch = this._dbDatastore.batch();
        for (const keyStr of this._dirtyItems) {
            const memoryItem = this._memoryDatastore.get(keyStr);
            if (memoryItem) {
                batch.put(new interface_datastore_1.Key(keyStr), memoryItem.data);
            }
        }
        await batch.commit();
        this._dirtyItems.clear();
    }
    /**
     * Prune from memory and move to db
     */
    async pruneMemoryDatastore() {
        let oldestAccessedMs = Date.now() + 1000;
        let oldestKey = undefined;
        let oldestValue = undefined;
        for (const [key, value] of this._memoryDatastore) {
            if (value.lastAccessedMs < oldestAccessedMs) {
                oldestAccessedMs = value.lastAccessedMs;
                oldestKey = key;
                oldestValue = value.data;
            }
        }
        if (oldestKey && oldestValue) {
            await this._dbDatastore.put(new interface_datastore_1.Key(oldestKey), oldestValue);
            this._memoryDatastore.delete(oldestKey);
        }
    }
}
exports.Eth2PeerDataStore = Eth2PeerDataStore;
//# sourceMappingURL=datastore.js.map