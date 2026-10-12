import type { Edit } from '../types';
export function enhancePixels(pixels: ImageData, e: Edit): ImageData {
    const { data, width, height } = pixels;
    const source = e.sharpness || e.noise ? new Uint8ClampedArray(data) : null;
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4,
                luminance = (data[i] + data[i + 1] + data[i + 2]) / 765;
            for (let c = 0; c < 3; c++) {
                let value =
                    data[i + c] +
                    e.shadows * (1 - luminance) ** 2 * 0.6 +
                    e.highlights * luminance ** 2 * 0.6;
                if (
                    source &&
                    x > 0 &&
                    y > 0 &&
                    x < width - 1 &&
                    y < height - 1
                ) {
                    const average =
                        (source[i - 4 + c] +
                            source[i + 4 + c] +
                            source[i - width * 4 + c] +
                            source[i + width * 4 + c]) /
                        4;
                    value += ((source[i + c] - average) * e.sharpness) / 50;
                    value =
                        value * (1 - e.noise / 150) + (average * e.noise) / 150;
                }
                data[i + c] = Math.max(0, Math.min(255, value));
            }
        }
    return pixels;
}
