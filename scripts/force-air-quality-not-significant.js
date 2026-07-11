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
        const fieldAddress = (table, slot) => {
            const vtableDistance = readInt32(table);
            if (vtableDistance <= 0) throw new Error("Invalid FlatBuffer vtable distance");
            const vtable = table - vtableDistance;
            const vtableLength = readUint16(vtable);
            const entry = vtable + 4 + slot * 2;
            if (entry + 2 > vtable + vtableLength) return 0;
            const relativeOffset = readUint16(entry);
            if (relativeOffset === 0) return 0;
            const address = table + relativeOffset;
            if (address >= body.byteLength) throw new Error("FlatBuffer field out of bounds");
            return address;
        };
        const childTable = (table, slot) => {
            const address = fieldAddress(table, slot);
            if (address === 0) return 0;
            const child = address + readUint32(address);
            if (child >= body.byteLength) throw new Error("FlatBuffer child table out of bounds");
            return child;
        };

        const weather = readUint32(0);
        if (weather < 4 || weather >= body.byteLength) throw new Error("Invalid Weather root table");

        // WK2.Weather slot 0 = airQuality; WK2.AirQuality slot 3 = isSignificant.
        const airQuality = childTable(weather, 0);
        if (airQuality === 0) {
            $done({});
            return;
        }

        const isSignificant = fieldAddress(airQuality, 3);
        if (isSignificant === 0 || body[isSignificant] === 0) {
            $done({});
            return;
        }

        body[isSignificant] = 0;
        $done({ body });
    } catch (_) {
        // Fail safe: preserve the original WeatherKit response.
        $done({});
    }
})();
