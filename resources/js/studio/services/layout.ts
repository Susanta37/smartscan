import type { Layout, Photo, SheetSettings } from '../types';
export const mmToPx = (mm: number, dpi: number) =>
    Math.round((mm / 25.4) * dpi);
export function arrange(photos: Photo[], settings: SheetSettings): Layout {
    const width = settings.landscape
        ? Math.max(settings.width, settings.height)
        : Math.min(settings.width, settings.height);
    const height = settings.landscape
        ? Math.min(settings.width, settings.height)
        : Math.max(settings.width, settings.height);
    const result: Layout = {
        pages: [],
        width,
        height,
        columns: 0,
        rows: 0,
        utilization: 0,
        error: '',
    };
    if (!photos.length) return result;
    const availableWidth = width - settings.left - settings.right;
    const availableHeight = height - settings.top - settings.bottom;
    let page: Layout['pages'][number] = [],
        x = settings.left,
        y = settings.top,
        rowHeight = 0,
        col = 0,
        row = 1,
        area = 0;
    for (const photo of photos) {
        const { width: w, height: h, copies } = photo.edit;
        if (!(w > 0 && h > 0) || w > availableWidth || h > availableHeight) {
            result.error =
                'A photo is larger than the printable area. Reduce its size, margins, or choose a larger paper.';
            return result;
        }
        for (let copy = 0; copy < copies; copy++) {
            if (
                x + w > width - settings.right + 0.001 ||
                (settings.columns > 0 && col >= settings.columns)
            ) {
                x = settings.left;
                y += rowHeight + settings.gapY;
                rowHeight = 0;
                col = 0;
                row++;
            }
            if (
                y + h > height - settings.bottom + 0.001 ||
                (settings.rows > 0 && row > settings.rows)
            ) {
                result.pages.push(page);
                page = [];
                x = settings.left;
                y = settings.top;
                rowHeight = 0;
                col = 0;
                row = 1;
            }
            const key = `${photo.id}-${copy}`;
            const offset = settings.offsets[key] || { x: 0, y: 0 };
            const px = Math.max(
                settings.left,
                Math.min(width - settings.right - w, x + offset.x),
            );
            const py = Math.max(
                settings.top,
                Math.min(height - settings.bottom - h, y + offset.y),
            );
            if (
                page.some(
                    (p) =>
                        px < p.x + p.width - 0.01 &&
                        px + w > p.x + 0.01 &&
                        py < p.y + p.height - 0.01 &&
                        py + h > p.y + 0.01,
                )
            )
                result.error =
                    'Manual positions overlap. Use Auto arrange or move the photos apart.';
            page.push({ key, photo, x: px, y: py, width: w, height: h });
            area += w * h;
            x += w + settings.gapX;
            rowHeight = Math.max(rowHeight, h);
            col++;
            result.columns = Math.max(result.columns, col);
            result.rows = Math.max(result.rows, row);
        }
    }
    if (page.length) result.pages.push(page);
    result.utilization = (area / (result.pages.length * width * height)) * 100;
    return result;
}
