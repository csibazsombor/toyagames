(function () {
    const VERSION = "1.2"; // Update version when files change
    const QUERY = `v=${VERSION}`;

    /**
     * Adds/updates version param on a URL
     */
    function addVersion(url) {
        const u = new URL(url, location.origin);

        // If already has ?v= parameter → update it
        if (u.searchParams.has('v')) {
            u.searchParams.set('v', VERSION);
        } else {
            u.searchParams.append('v', VERSION);
        }

        return u.toString();
    }

    /**
     * Update all matching elements of given selector and attribute
     */
    function update(selector, attr) {
        document.querySelectorAll(selector).forEach(el => {
            const oldValue = el.getAttribute(attr);

            if (!oldValue) return;
            if (oldValue.includes(QUERY)) return; // already updated

            el.setAttribute(attr, addVersion(oldValue));
        });
    }

    // Update standard assets
    update('link[rel="stylesheet"]', 'href');
    update('script[src]', 'src');
    update('img[src]', 'src');

    // Optional: update fonts + other assets
    update('link[href*=".woff"], link[href*=".woff2"], link[href*=".ttf"]', 'href');
    update('[data-cache]', 'src'); // custom attribute for manual targeting
})();
