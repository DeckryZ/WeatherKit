(() => {
    const headers = {};
    const source = $request.headers || {};

    Object.keys(source).forEach(key => {
        if (key.toLowerCase() !== "geocountrycode") headers[key] = source[key];
    });

    // Test whether Weather.app's map-card selection follows Japan region hints.
    headers.geocountrycode = "JP";

    const result = { headers };
    const url = $request.url || "";

    if (/\/api\/v2\/weather\//.test(url) && /([?&])country=/.test(url)) {
        result.url = url.replace(/([?&])country=[^&]*/, "$1country=JP");
    }

    $done(result);
})();
