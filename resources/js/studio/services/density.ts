// Canvas encoders default to 96 DPI. Write the selected physical density explicitly.
function crc32(bytes: Uint8Array): number {
    let crc = 0xffffffff;
    for (const byte of bytes) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++)
            crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
}
export async function withDpi(blob: Blob, dpi: number): Promise<Blob> {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (blob.type === 'image/jpeg') {
        // Insert JFIF APP0 before the browser's existing APP segments.
        const app = new Uint8Array([
            0xff,
            0xe0,
            0,
            16,
            74,
            70,
            73,
            70,
            0,
            1,
            2,
            1,
            dpi >>> 8,
            dpi & 255,
            dpi >>> 8,
            dpi & 255,
            0,
            0,
        ]);
        // Update an existing JFIF header rather than leave conflicting density fields.
        if (
            bytes[2] === 0xff &&
            bytes[3] === 0xe0 &&
            bytes[6] === 74 &&
            bytes[7] === 70
        ) {
            bytes[13] = 1;
            bytes[14] = dpi >>> 8;
            bytes[15] = dpi & 255;
            bytes[16] = dpi >>> 8;
            bytes[17] = dpi & 255;
            return new Blob([bytes], { type: blob.type });
        }
        return new Blob([bytes.slice(0, 2), app, bytes.slice(2)], {
            type: blob.type,
        });
    }
    if (blob.type === 'image/png') {
        const chunk = new Uint8Array(21),
            view = new DataView(chunk.buffer),
            ppm = Math.round(dpi / 0.0254);
        view.setUint32(0, 9);
        chunk.set([112, 72, 89, 115], 4);
        view.setUint32(8, ppm);
        view.setUint32(12, ppm);
        chunk[16] = 1;
        view.setUint32(17, crc32(chunk.slice(4, 17)));
        const parts: Uint8Array<ArrayBuffer>[] = [bytes.slice(0, 33), chunk];
        let offset = 33;
        while (offset + 12 <= bytes.length) {
            const length =
                new DataView(bytes.buffer, offset, 4).getUint32(0) + 12;
            if (length > bytes.length - offset)
                throw new Error('Invalid PNG chunk.');
            if (
                !(
                    bytes[offset + 4] === 112 &&
                    bytes[offset + 5] === 72 &&
                    bytes[offset + 6] === 89 &&
                    bytes[offset + 7] === 115
                )
            )
                parts.push(bytes.slice(offset, offset + length));
            offset += length;
        }
        return new Blob(parts, { type: blob.type });
    }
    return blob;
}
