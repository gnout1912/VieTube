/**
 * Time-aware LRU Cache Implementation
 */
export declare class Cache<T> {
    maxEntries: number;
    readonly maxAge?: number | undefined;
    private readonly _ttl;
    private _map;
    /**
     * @param maxEntries - The maximum number of entries before the cache starts flushing out the old items
     * @param maxAge - The maximum life of a cached items in seconds
     */
    constructor(maxEntries?: number, maxAge?: number | undefined);
    /**
     * @returns the total number of cache entries, including expired ones
     */
    get size(): number;
    /**
     * Cache keys iterator
     * @returns an iterator of all keys in a cache
     */
    keys(): IterableIterator<string>;
    /**
     * Remove expired entries
     * @returns array of actual keys
     */
    prune(): string[];
    clear(): void;
    /**
     * Get an item from the cache
     * @param key - The key to look up
     * @returns The cached value or undefined if it is not found or expired
     */
    get(key: string): T | undefined;
    /**
     * Check if the item exists and has not expired
     * @param key - The key to look up
     */
    has(key: string): boolean;
    /**
     * Add the new key and value to the cache
     * @param key - The key to store the value under
     * @param value - The value to be stored in the cache
     * @returns The value that was set
     */
    set(key: string, value: T): T;
    /**
     * Delete the key from the cache
     * @param key - The key of the item to remove from the cache
     */
    delete(key: string): boolean;
}
