/*
 * WeatherKit: force wind/precip map card by removing the air-quality dataset.
 *
 * Finding (raw Apple captures): the client features the air-quality map only for
 * locations whose Weather response CONTAINS an airQuality dataset with
 * isSignificant=1 (Guangzhou/Shenzhen). Locations with no airQuality dataset
 * (Hong Kong/Kowloon/Macau when air is clean, Stockholm) never show the AQ map
 * and fall back to wind/precip. Flipping isSignificant alone did NOT drop the AQ
 * card, so the client keys off the dataset's presence, not the bool.
 *
 * This zeroes the root vtable slot for airQuality (field id 0), so
 * Weather.airQuality() returns null and the client behaves as a no-AQ city.
 * Zeroing a 2-byte vtable voffset entry moves no data and changes no lengths:
 * the airQuality bytes are simply orphaned. Fail-safe: pass through untouched
 * on any anomaly.
 *
 * Response is Apple FlatBuffer (application/vnd.apple.flatbuffer;messageType=WK2.Weather).
 * Route: http-response GET, requires-body=1, binary-body-mode=1.
 */
(() => {
    const body = $response.body; // Uint8Array (binary-body-mode=1)
    if (!body || body.length < 8) return $done({});

    const dv = new DataView(body.buffer, body.byteOffset, body.byteLength);
    const u32 = o => dv.getUint32(o, true);
    const i32 = o => dv.getInt32(o, true);
    const u16 = o => dv.getUint16(o, true);

    try {
        const root = u32(0);
        const vt = root - i32(root); // root table's vtable
        const vtSize = u16(vt);
        if (vtSize < 6) return $done({}); // no field 0 slot
        const slot0Entry = vt + 4; // voffset entry for field id 0 (airQuality)
        if (u16(slot0Entry) === 0) return $done({}); // airQuality already absent

        // Zero the 2-byte voffset -> Weather.airQuality() becomes null.
        dv.setUint16(slot0Entry, 0, true);

        // GET has max-age caching; force a re-fetch so the edit is not shadowed.
        const headers = $response.headers || {};
        for (const k of Object.keys(headers)) {
            if (k.toLowerCase() === "cache-control") delete headers[k];
        }
        headers["Cache-Control"] = "no-store";

        return $done({ body, headers });
    } catch (e) {
        return $done({}); // never corrupt the page
    }
})();
