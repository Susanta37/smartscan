import type { Photo } from '../types';
import { mmToPx } from './layout';
import { enhancePixels } from './enhancePixels';
import { trackTemporary } from './privacy';
export function drawPhoto(
    photo: Photo,
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    original = false,
    deferEnhancement = false,
) {
    if (width * height > 40_000_000)
        throw new Error(
            'Output exceeds 40 megapixels. Reduce photo dimensions or DPI.',
        );
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const ctx = canvas.getContext('2d');
    if (!ctx)
        throw new Error('Canvas processing is unavailable in this browser.');
    const e = photo.edit;
    ctx.fillStyle = e.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const radians = (e.rotation * Math.PI) / 180;
    const bw =
        Math.abs(photo.width * Math.cos(radians)) +
        Math.abs(photo.height * Math.sin(radians));
    const bh =
        Math.abs(photo.width * Math.sin(radians)) +
        Math.abs(photo.height * Math.cos(radians));
    const scale = Math.max(width / bw, height / bh) * e.zoom;
    ctx.save();
    ctx.translate(width / 2 + e.x * width, height / 2 + e.y * height);
    ctx.rotate(radians);
    ctx.scale(e.flipX ? -scale : scale, e.flipY ? -scale : scale);
    if (!original)
        ctx.filter = `brightness(${e.brightness * 2 ** e.exposure}%) contrast(${e.contrast}%) saturate(${e.saturation}%)`;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(photo.image, -photo.width / 2, -photo.height / 2);
    ctx.restore();
    if (
        !original &&
        !deferEnhancement &&
        (e.highlights || e.shadows || e.sharpness || e.noise)
    ) {
        ctx.putImageData(
            enhancePixels(
                ctx.getImageData(0, 0, canvas.width, canvas.height),
                e,
            ),
            0,
            0,
        );
    }
}
export function resolutionWarning(photo: Photo, dpi: number) {
    const radians = (photo.edit.rotation * Math.PI) / 180;
    const bw =
        Math.abs(photo.width * Math.cos(radians)) +
        Math.abs(photo.height * Math.sin(radians));
    const bh =
        Math.abs(photo.width * Math.sin(radians)) +
        Math.abs(photo.height * Math.cos(radians));
    const effectiveDpi =
        (Math.min(bw / photo.edit.width, bh / photo.edit.height) * 25.4) /
        photo.edit.zoom;
    return effectiveDpi < dpi
        ? `Source resolution is about ${Math.round(effectiveDpi)} DPI for this crop; ${dpi} DPI is requested.`
        : '';
}
export async function suggestFace(
    photo: Photo,
): Promise<{ x: number; y: number; zoom: number } | null> {
    type Detector = {
        detect: (image: HTMLImageElement) => Promise<
            {
                boundingBox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
            }[]
        >;
    };
    const Constructor = (
        window as unknown as {
            FaceDetector?: new (options: { fastMode: boolean }) => Detector;
        }
    ).FaceDetector;
    if (!Constructor) return null;
    const faces = await new Constructor({ fastMode: true }).detect(photo.image);
    if (!faces.length) return null;
    const face = faces.sort(
        (a, b) => b.boundingBox.width - a.boundingBox.width,
    )[0].boundingBox;
    const scale = Math.max(
        photo.edit.width / photo.width,
        photo.edit.height / photo.height,
    );
    const zoom = Math.max(
        1,
        Math.min(4, (photo.edit.height * 0.55) / (face.height * scale)),
    );
    return {
        zoom,
        x:
            (-(face.x + face.width / 2 - photo.width / 2) * scale * zoom) /
            photo.edit.width,
        y:
            (-(face.y + face.height * 0.6 - photo.height / 2) * scale * zoom) /
            photo.edit.height,
    };
}
export async function photoCanvas(photo: Photo, dpi: number) {
    const canvas = document.createElement('canvas');
    try {
        await drawPhotoAsync(
            photo,
            canvas,
            mmToPx(photo.edit.width, dpi),
            mmToPx(photo.edit.height, dpi),
        );
        return canvas;
    } catch (error) {
        canvas.width = canvas.height = 0;
        throw error;
    }
}

// Print-resolution pixel enhancement runs off the main thread; small previews use the same algorithm locally.
export async function drawPhotoAsync(
    photo: Photo,
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
) {
    drawPhoto(photo, canvas, width, height, false, true);
    const e = photo.edit;
    if (!(e.highlights || e.shadows || e.sharpness || e.noise)) return;
    const ctx = canvas.getContext('2d')!;
    if (typeof Worker === 'undefined') {
        ctx.putImageData(
            enhancePixels(
                ctx.getImageData(0, 0, canvas.width, canvas.height),
                e,
            ),
            0,
            0,
        );
        return;
    }
    await new Promise<void>((resolve, reject) => {
        let worker: Worker, bootstrap: string | undefined;
        if (import.meta.env.DEV) {
            // Laravel and Vite use different origins during development.
            // A local blob bootstrap can import the CORS-enabled Vite module.
            const url = new URL('../workers/enhancement.ts', import.meta.url);
            url.search = '?worker_file&type=module';
            bootstrap = URL.createObjectURL(
                new Blob([`import ${JSON.stringify(url.href)};`], {
                    type: 'text/javascript',
                }),
            );
            try {
                worker = new Worker(bootstrap, { type: 'module' });
            } catch (error) {
                URL.revokeObjectURL(bootstrap);
                throw error;
            }
        } else {
            worker = new Worker(
                new URL('../workers/enhancement.ts', import.meta.url),
                { type: 'module' },
            );
        }
        let finished = false;
        const cleanup = trackTemporary(() => {
            worker.terminate();
            if (bootstrap) URL.revokeObjectURL(bootstrap);
            if (!finished) reject(new Error('Processing cancelled.'));
        });
        worker.onmessage = (event: MessageEvent<ImageData>) => {
            finished = true;
            ctx.putImageData(event.data, 0, 0);
            cleanup();
            resolve();
        };
        worker.onerror = () => {
            finished = true;
            cleanup();
            reject(
                new Error(
                    'Local enhancement worker failed. Reset enhancement and try again.',
                ),
            );
        };
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        worker.postMessage({ pixels, edit: e }, [pixels.data.buffer]);
    });
}
