(() => {
    const headers = {};
    const source = $request.headers || {};

    Object.keys(source).forEach(key => {
        if (key.toLowerCase() !== "geocountrycode") headers[key] = source[key];
    });

    // Test whether Weather.app's map-card selection follows this region hint.
    headers.geocountrycode = "JP";
    $done({ headers });
})();
