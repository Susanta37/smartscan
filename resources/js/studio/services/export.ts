import type { jsPDF } from 'jspdf';
import type { Layout, Photo, SheetSettings } from '../types';
import { drawPhotoAsync, photoCanvas } from './image';
import { mmToPx } from './layout';
import { trackTemporary } from './privacy';
import { withDpi } from './density';
export async function sheetCanvas(
    page: Layout['pages'][number],
    layout: Layout,
    settings: SheetSettings,
) {
    const canvas = document.createElement('canvas');
    canvas.width = mmToPx(layout.width, settings.dpi);
    canvas.height = mmToPx(layout.height, settings.dpi);
    if (canvas.width * canvas.height > 40_000_000)
        throw new Error(
            'Output exceeds 40 megapixels. Reduce paper size or DPI.',
        );
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported.');
    ctx.fillStyle = settings.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = settings.dpi / 25.4;
    const rendered = new Map<string, HTMLCanvasElement>();
    try {
        for (const p of page) {
            let image = rendered.get(p.photo.id);
            if (!image) {
                image = document.createElement('canvas');
                rendered.set(p.photo.id, image);
                await drawPhotoAsync(
                    p.photo,
                    image,
                    mmToPx(p.width, settings.dpi),
                    mmToPx(p.height, settings.dpi),
                );
            }
            ctx.drawImage(
                image,
                p.x * scale,
                p.y * scale,
                p.width * scale,
                p.height * scale,
            );
            ctx.strokeStyle = '#888';
            ctx.lineWidth = Math.max(1, 0.1 * scale);
            if (settings.border)
                ctx.strokeRect(
                    p.x * scale,
                    p.y * scale,
                    p.width * scale,
                    p.height * scale,
                );
            if (settings.marks) {
                for (const [x, y, dx, dy] of [
                    [p.x, p.y, -1, -1],
                    [p.x + p.width, p.y, 1, -1],
                    [p.x, p.y + p.height, -1, 1],
                    [p.x + p.width, p.y + p.height, 1, 1],
                ]) {
                    ctx.beginPath();
                    ctx.moveTo((x + dx * 0.3) * scale, y * scale);
                    ctx.lineTo((x + dx * 1.2) * scale, y * scale);
                    ctx.moveTo(x * scale, (y + dy * 0.3) * scale);
                    ctx.lineTo(x * scale, (y + dy * 1.2) * scale);
                    ctx.stroke();
                }
            }
        }
        return canvas;
    } catch (error) {
        canvas.width = canvas.height = 0;
        throw error;
    } finally {
        for (const image of rendered.values()) image.width = image.height = 0;
    }
}
const yieldFrame = () => new Promise((resolve) => setTimeout(resolve, 0));
function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob),
        a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    const cleanup = trackTemporary(() => URL.revokeObjectURL(url));
    setTimeout(cleanup, 1000);
}
export async function exportSheet(
    layout: Layout,
    settings: SheetSettings,
    format: 'pdf' | 'png' | 'jpeg',
    onProgress: (text: string) => void,
    cancelled: () => boolean,
) {
    if (!layout.pages.length || layout.error)
        throw new Error(layout.error || 'Import a photo first.');
    let pdf: jsPDF | null = null;
    if (format === 'pdf') {
        const { jsPDF: PDF } = await import('jspdf');
        if (cancelled()) return;
        pdf = new PDF({
            unit: 'mm',
            format: [layout.width, layout.height],
            orientation:
                layout.width > layout.height ? 'landscape' : 'portrait',
            compress: true,
        });
    }
    pdf?.viewerPreferences({ PrintScaling: 'None' });
    for (let index = 0; index < layout.pages.length; index++) {
        onProgress(`Rendering page ${index + 1} of ${layout.pages.length}`);
        await yieldFrame();
        if (cancelled()) return;
        const canvas = await sheetCanvas(layout.pages[index], layout, settings);
        try {
            if (pdf) {
                if (index)
                    pdf.addPage(
                        [layout.width, layout.height],
                        layout.width > layout.height ? 'landscape' : 'portrait',
                    );
                pdf.addImage(
                    canvas,
                    'JPEG',
                    0,
                    0,
                    layout.width,
                    layout.height,
                    undefined,
                    'FAST',
                );
            } else {
                const blob = await new Promise<Blob>((resolve, reject) =>
                    canvas.toBlob(
                        (b) =>
                            b
                                ? resolve(b)
                                : reject(new Error('Image export failed.')),
                        `image/${format}`,
                        0.98,
                    ),
                );
                const output = await withDpi(blob, settings.dpi);
                if (!cancelled())
                    download(
                        output,
                        `smartscan-sheet-${index + 1}.${format === 'jpeg' ? 'jpg' : 'png'}`,
                    );
            }
        } finally {
            canvas.width = canvas.height = 0;
        }
    }
    if (pdf && !cancelled())
        download(pdf.output('blob'), 'smartscan-print-sheet.pdf');
}
export async function exportPhoto(
    photo: Photo,
    dpi: number,
    cancelled: () => boolean = () => false,
) {
    const canvas = await photoCanvas(photo, dpi);
    try {
        const blob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(
                (b) => (b ? resolve(b) : reject(new Error('Export failed.'))),
                'image/png',
            ),
        );
        const output = await withDpi(blob, dpi);
        if (!cancelled()) download(output, 'smartscan-photo.png');
    } finally {
        canvas.width = canvas.height = 0;
    }
}
export async function printSheet(
    layout: Layout,
    settings: SheetSettings,
    cancelled: () => boolean,
) {
    if (!layout.pages.length || layout.error)
        throw new Error(layout.error || 'Import a photo first.');
    const frame = document.createElement('iframe');
    frame.title = 'Print-only photo sheet';
    frame.style.cssText =
        'position:fixed;width:1px;height:1px;bottom:0;left:0;border:0';
    document.body.append(frame);
    const doc = frame.contentDocument;
    if (!doc) {
        frame.remove();
        throw new Error('Unable to open print view.');
    }
    const urls: string[] = [];
    const cleanup = trackTemporary(() => {
        for (const url of urls) URL.revokeObjectURL(url);
        frame.remove();
    });
    try {
        doc.open();
        doc.write(
            `<!doctype html><html><head><title>SmartScan print sheet</title><style>@page{size:${layout.width}mm ${layout.height}mm;margin:0}*{box-sizing:border-box}body{margin:0}img{display:block;width:${layout.width}mm;height:${layout.height}mm;break-after:page;page-break-after:always}img:last-child{break-after:auto;page-break-after:auto}</style></head><body></body></html>`,
        );
        doc.close();
        for (const page of layout.pages) {
            await yieldFrame();
            if (cancelled()) {
                cleanup();
                return;
            }
            const canvas = await sheetCanvas(page, layout, settings);
            const blob = await new Promise<Blob>((resolve, reject) =>
                canvas.toBlob(
                    (b) =>
                        b
                            ? resolve(b)
                            : reject(new Error('Print preparation failed.')),
                    'image/png',
                ),
            );
            canvas.width = canvas.height = 0;
            if (cancelled()) {
                cleanup();
                return;
            }
            const url = URL.createObjectURL(blob);
            urls.push(url);
            const image = doc.createElement('img');
            image.src = url;
            doc.body.append(image);
            await image.decode();
        }
        if (cancelled()) {
            cleanup();
            return;
        }
        frame.contentWindow?.addEventListener('afterprint', cleanup, {
            once: true,
        });
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        // Fallback for browsers that do not fire afterprint on frames.
        setTimeout(cleanup, 60_000);
    } catch (error) {
        cleanup();
        throw error;
    }
}
