(function() {
    var version = '1.0';  // Change this version number whenever you make updates

    // List of files to update
    var filesToCacheBust = [
        'CSS/style.css',
        'CSS/fonts.css',
        'FONTS',
    ];

    // Function to append version query string to URLs
    function cacheBust(url) {
        return url + '?v=' + version;
    }

    // Update link tags for CSS
    var linkTags = document.querySelectorAll('link[rel="stylesheet"]');
    linkTags.forEach(function(link) {
        link.href = cacheBust(link.href);
    });

    // Update script tags for JavaScript
    var scriptTags = document.querySelectorAll('script[src]');
    scriptTags.forEach(function(script) {
        script.src = cacheBust(script.src);
    });

    // Update other specific files
    filesToCacheBust.forEach(function(file) {
        var elements = document.querySelectorAll('[src="' + file + '"], [href="' + file + '"]');
        elements.forEach(function(element) {
            if (element.src) {
                element.src = cacheBust(element.src);
            }
            if (element.href) {
                element.href = cacheBust(element.href);
            }
        });
    });
})();