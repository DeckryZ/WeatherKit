/*
 * WeatherKit: force wind map card by suppressing the air-quality map trigger.
 *
 * Discriminator (verified across raw Apple captures, cities Tokyo/Seoul/Lausanne
 * vs Guangzhou/Shenzhen): the client features the air-quality map ONLY when
 * Weather.airQuality.isSignificant == true. Wind/precip cities have it false
 * (omitted from the FlatBuffer vtable). Flipping the inline bool byte 01 -> 00
 * makes a "significant AQ" city read as not-significant, so the client drops the
 * AQ map card and falls back (expected: wind when no active precip).
 *
 * Response is Apple FlatBuffer (application/vnd.apple.flatbuffer;messageType=WK2.Weather).
 * This is a single inline scalar byte edit: no offsets move, length is unchanged.
 * Route: http-response GET, requires-body=1, binary-body-mode=1.
 */
(() => {
    const body = $response.body; // Uint8Array (binary-body-mode=1)
    if (!body || body.length < 8) return $done({});

    const dv = new DataView(body.buffer, body.byteOffset, body.byteLength);
    const u32 = o => dv.getUint32(o, true);
    const i32 = o => dv.getInt32(o, true);
    const u16 = o => dv.getUint16(o, true);

    // Absolute location of a table field's value, or -1 if the field is absent.
    const fieldLoc = (tablePos, slot) => {
        const vt = tablePos - i32(tablePos); // vtable position
        const vtSize = u16(vt);
        if (4 + slot * 2 >= vtSize) return -1;
        const vo = u16(vt + 4 + slot * 2);
        return vo === 0 ? -1 : tablePos + vo;
    };

    try {
        const root = u32(0);
        const aqOff = fieldLoc(root, 0); // Weather.airQuality (slot 0, offset field)
        if (aqOff < 0) return $done({});
        const aqTable = aqOff + u32(aqOff);
        const sigLoc = fieldLoc(aqTable, 3); // AirQuality.isSignificant (slot 3, inline bool)
        if (sigLoc < 0) return $done({}); // already false/absent -> nothing to do
        if (body[sigLoc] === 0) return $done({});

        body[sigLoc] = 0; // true -> false

        // GET has max-age caching; force a re-fetch so the edit is not shadowed by cache.
        const headers = $response.headers || {};
        for (const k of Object.keys(headers)) {
            if (k.toLowerCase() === "cache-control") delete headers[k];
        }
        headers["Cache-Control"] = "no-store";

        return $done({ body, headers });
    } catch (e) {
        return $done({}); // fail safe: never corrupt the page
    }
})();
