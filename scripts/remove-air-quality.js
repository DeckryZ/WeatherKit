(() => {
    try {
        const input = $response.body;
        if (!(input instanceof Uint8Array) || input.byteLength < 8) {
            $done({});
            return;
        }

        const body = new Uint8Array(input);
        const view = new DataView(body.buffer, body.byteOffset, body.byteLength);

        const readUint16 = offset => {
            if (offset < 0 || offset + 2 > body.byteLength) throw new Error("FlatBuffer uint16 out of bounds");
            return view.getUint16(offset, true);
        };
        const readUint32 = offset => {
            if (offset < 0 || offset + 4 > body.byteLength) throw new Error("FlatBuffer uint32 out of bounds");
            return view.getUint32(offset, true);
        };
        const readInt32 = offset => {
            if (offset < 0 || offset + 4 > body.byteLength) throw new Error("FlatBuffer int32 out of bounds");
            return view.getInt32(offset, true);
        };
        const fieldEntry = (table, slot) => {
            const vtableDistance = readInt32(table);
            if (vtableDistance <= 0) throw new Error("Invalid FlatBuffer vtable distance");
            const vtable = table - vtableDistance;
            const vtableLength = readUint16(vtable);
            const entry = vtable + 4 + slot * 2;
            if (entry + 2 > vtable + vtableLength) return 0;
            return entry;
        };

        const weather = readUint32(0);
        if (weather < 4 || weather >= body.byteLength) throw new Error("Invalid Weather root table");

        // WK2.Weather slot 0 = airQuality. Clearing its vtable entry removes
        // only that optional child table; every other byte remains untouched.
        const airQualityEntry = fieldEntry(weather, 0);
        if (airQualityEntry === 0 || readUint16(airQualityEntry) === 0) {
            $done({});
            return;
        }

        body[airQualityEntry] = 0;
        body[airQualityEntry + 1] = 0;
        $done({ body });
    } catch (_) {
        // Fail safe: preserve the original WeatherKit response.
        $done({});
    }
})();
