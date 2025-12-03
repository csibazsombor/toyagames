// ===============================
// AUTO OPTIMIZER – Refresh Website Data
// ===============================
const Optimizer = {
    log: (...msg) => console.log("🔄 Optimizer:", ...msg),

    // Force-refresh all static assets WITHOUT deleting cache/localStorage
    refreshAssets() {
        const stamp = Date.now();

        // Refresh <link rel="stylesheet">
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            if (!link.href) return;
            link.href = this.addStamp(link.href, stamp);
        });

        // Refresh <script src="">
        document.querySelectorAll('script[src]').forEach(script => {
            if (!script.src) return;
            script.src = this.addStamp(script.src, stamp);
        });

        // Refresh <img src="">
        document.querySelectorAll('img[src]').forEach(img => {
            img.src = this.addStamp(img.src, stamp);
        });

        // Refresh <source> (videos, audio)
        document.querySelectorAll('source[src]').forEach(s => {
            s.src = this.addStamp(s.src, stamp);
        });

        // Refresh CSS fonts
        document.querySelectorAll('link[href*="fonts"], link[href*="font"]').forEach(l => {
            l.href = this.addStamp(l.href, stamp);
        });

        this.log("Website assets refreshed ✔");
    },

    // Helper – add ?t=timestamp to force refresh
    addStamp(url, stamp) {
        const noHash = url.split('#')[0];
        const clean = noHash.split('?')[0];
        return `${clean}?t=${stamp}`;
    },

    // Cleanup non-needed IndexedDB (optional)
    async cleanIndexedDB() {
        if (!indexedDB.databases) return; // some browsers don't support
        const dbs = await indexedDB.databases();

        dbs.forEach(db => {
            const name = db.name;
            if (name && !["firebaseLocalStorageDb"].includes(name)) {
                indexedDB.deleteDatabase(name);
                this.log("Deleted indexedDB:", name);
            }
        });
    },

    // MAIN
    async autoOptimize() {
        this.log("Running auto-optimizer...");

        // 1. Refresh all page files without wiping cache
        this.refreshAssets();

        // 2. Optional: Remove unused IndexedDB
        this.cleanIndexedDB();

        this.log("Auto optimization complete ✔");
    }
};

// Run automatically on page load
Optimizer.autoOptimize();