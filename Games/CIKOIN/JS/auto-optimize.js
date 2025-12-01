// ===============================
// AUTO OPTIMIZER for Web Games/PWA
// ===============================
const Optimizer = {
    STORAGE_PREFIX: ["appVersion"],

    log: (...msg) => console.log("🧹 Optimizer:", ...msg),

    // Safe storage cleanup
    cleanLocalStorage() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (!this.STORAGE_PREFIX.some(p => key.includes(p))) {
                    localStorage.removeItem(key);
                    this.log("Removed LS:", key);
                }
            });
        } catch (err) { console.warn("LS cleanup failed:", err); }
    },

    // Optimize cache by deleting unknown/old caches
    async cleanCaches(validCache = null) {
        if (!('caches' in window)) return;

        const names = await caches.keys();
        for (const name of names) {
            if (!validCache || name !== validCache) {
                await caches.delete(name);
                this.log("Removed Cache:", name);
            }
        }
    },

    // Cleanup IndexedDB garbage
    async cleanIndexedDB() {
        if (!indexedDB.databases) return;
        const dbs = await indexedDB.databases();
        dbs.forEach(db => {
            const name = db.name;
            if (name && !["firebaseLocalStorageDb"].includes(name)) {
                indexedDB.deleteDatabase(name);
                this.log("Deleted IndexedDB:", name);
            }
        });
    },

    async fullCleanup(validCache = null) {
        this.log("Starting FULL cleanup...");

        localStorage.clear();
        sessionStorage.clear();

        await this.cleanCaches(validCache);
        await this.cleanIndexedDB();

        this.log("FULL cleanup done! ✔️");
    },

    // Run periodic auto-optimizations every load
    async autoOptimize(validCache = null) {
        this.log("Running auto optimizer...");

        this.cleanLocalStorage();
        await this.cleanCaches(validCache);

        this.log("Auto optimization complete! ✔️");
    }
};

// Auto run once per page load
Optimizer.autoOptimize(); 
