import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { PNG } from 'pngjs';
function portrait(name = 'portrait.png', width = 900, height = 1200) {
    const png = new PNG({ width, height });
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            let rgb = [235, 241, 249];
            if (
                ((x - width * 0.5) / (width * 0.18)) ** 2 +
                    ((y - height * 0.36) / (height * 0.18)) ** 2 <
                1
            )
                rgb = [197, 159, 134];
            if (y > height * 0.57 && Math.abs(x - width * 0.5) < width * 0.35)
                rgb = [45, 70, 128];
            png.data[i] = rgb[0];
            png.data[i + 1] = rgb[1];
            png.data[i + 2] = rgb[2];
            png.data[i + 3] = 255;
        }
    return { name, mimeType: 'image/png', buffer: PNG.sync.write(png) };
}

async function upload(page, files = [portrait()]) {
    await page
        .locator('.studio-sidebar')
        .getByRole('button', { name: 'Passport Photo Maker', exact: true })
        .click();
    await page.locator('input[type=file]').first().setInputFiles(files);
    await expect(page.locator('.gallery-grid article')).toHaveCount(
        files.length,
    );
    await expect(page.locator('.studio-notice')).toContainText(
        'imported locally',
    );
}
async function downloadBytes(page, button) {
    const title = await button.innerText();
    const extension = title.includes('PDF')
        ? '.pdf'
        : title.includes('JPEG')
          ? '.jpg'
          : '.png';
    const waiting = page.waitForEvent('download', (download) =>
        download.suggestedFilename().endsWith(extension),
    );
    await button.click();
    const download = await waiting;
    return fs.readFile(await download.path());
}
async function auditInit(page) {
    await page.addInitScript(() => {
        window.__activeUrls = new Set();
        const create = URL.createObjectURL.bind(URL),
            revoke = URL.revokeObjectURL.bind(URL);
        URL.createObjectURL = (blob) => {
            const url = create(blob);
            window.__activeUrls.add(url);
            return url;
        };
        URL.revokeObjectURL = (url) => {
            window.__activeUrls.delete(url);
            revoke(url);
        };
        window.__printCalls = [];
        window.print = function () {
            window.top.__printCalls.push({
                html: document.documentElement.outerHTML,
                images: document.images.length,
            });
            window.dispatchEvent(new Event('afterprint'));
        };
    });
}
test('passport edit, undo/redo, batch layout, accurate PNG/JPEG/PDF, print-only view, privacy cleanup', async ({
    page,
}) => {
    const errors = [],
        imageUploads = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
        if (['POST', 'PUT', 'PATCH'].includes(request.method()))
            imageUploads.push(request.url());
    });
    await auditInit(page);
    await page.goto('/');
    await expect(
        page.getByRole('heading', { name: 'Good work starts here.' }),
    ).toBeVisible();
    await upload(page);
    await expect(page.getByLabel('Width', { exact: true })).toHaveValue('35');
    await expect(page.getByLabel('Height', { exact: true })).toHaveValue('45');
    await page.getByTitle('Rotate right', { exact: true }).click();
    await expect(page.getByLabel('Straighten / rotation')).toHaveValue('90');
    await page.getByTitle('Undo (Ctrl+Z)').click();
    await expect(page.getByLabel('Straighten / rotation')).toHaveValue('0');
    await page.getByTitle('Redo (Ctrl+Shift+Z)').click();
    await expect(page.getByLabel('Straighten / rotation')).toHaveValue('90');
    await page.getByLabel('Brightness').fill('108');
    await page
        .getByRole('button', { name: 'Compare original', exact: true })
        .click();
    await expect(page.locator('.crop-label')).toContainText('ORIGINAL');
    await page.getByRole('button', { name: 'Show edited' }).click();
    await page
        .getByRole('button', { name: 'Conservative enhancement' })
        .click();
    await page.getByTitle('Duplicate photo', { exact: true }).click();
    await expect(page.locator('.gallery-grid article')).toHaveCount(2);
    await page.getByLabel('Number of copies').fill('8');
    await page
        .getByRole('button', { name: 'Arrange on sheet', exact: true })
        .click();
    await expect(page.locator('.sheet-actions')).toContainText(
        '16 copies · 2 sheets',
    );
    await expect(page.locator('.physical-paper .sheet-photo')).toHaveCount(8);
    const pngBytes = await downloadBytes(
        page,
        page.getByRole('button', { name: 'PNG', exact: true }),
    );
    const png = PNG.sync.read(pngBytes);
    expect(png.width).toBe(1800);
    expect(png.height).toBe(1200);
    const densityIndex = pngBytes.indexOf(Buffer.from('pHYs'));
    expect(pngBytes.readUInt32BE(densityIndex + 4)).toBe(11811);
    const jpg = await downloadBytes(
        page,
        page.getByRole('button', { name: 'JPEG', exact: true }),
    );
    expect(jpg[13]).toBe(1);
    expect(jpg.readUInt16BE(14)).toBe(300);
    expect(jpg.readUInt16BE(16)).toBe(300);
    const pdf = await downloadBytes(
        page,
        page.getByRole('button', { name: 'Export PDF', exact: true }),
    );
    const pdfText = pdf.toString('latin1');
    expect(pdfText).toContain('/PrintScaling /None');
    expect(pdfText.match(/\/Type \/Page\b/g)).toHaveLength(2);
    const mediaBox = pdfText.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
    expect(Number(mediaBox[1])).toBeCloseTo(432, 4);
    expect(Number(mediaBox[2])).toBeCloseTo(288, 4);
    await page.getByLabel('Paper size', { exact: true }).selectOption('a4');
    await page.getByRole('button', { name: 'Portrait', exact: true }).click();
    await expect(page.locator('.layout-summary')).toContainText('2480 × 3508');
    await expect(page.locator('.sheet-actions')).toContainText(
        '16 copies · 1 sheets',
    );
    await page
        .getByRole('button', { name: 'Print sheet', exact: true })
        .click();
    await expect(page.getByRole('dialog')).toContainText('210 × 297 mm');
    await page.getByRole('button', { name: 'Open print dialog' }).click();
    await expect
        .poll(() => page.evaluate(() => window.__printCalls.length))
        .toBe(1);
    const print = await page.evaluate(() => window.__printCalls[0]);
    expect(print.images).toBe(1);
    expect(print.html).toContain('size:210mm 297mm');
    expect(print.html).not.toContain('studio-sidebar');
    await page
        .locator('.studio-jobbar')
        .getByRole('button', { name: 'Clear all photos' })
        .click();
    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Clear all photos' })
        .click();
    await expect(page.locator('.gallery-grid article')).toHaveCount(0);
    await expect
        .poll(() => page.evaluate(() => window.__activeUrls.size))
        .toBe(0);
    expect(imageUploads).toEqual([]);
    expect(errors).toEqual([]);
    const storage = await page.evaluate(() =>
        JSON.stringify(
            Object.fromEntries(
                Object.keys(localStorage).map((key) => [
                    key,
                    localStorage.getItem(key),
                ]),
            ),
        ),
    );
    expect(storage).not.toContain('portrait');
    expect(storage).not.toContain('data:image');
    expect(storage).not.toContain('blob:');
});
test('multiple imports, replacement, reorder, selected deletion, natural batch enhancement, validation', async ({
    page,
}) => {
    await page.goto('/');
    await upload(page, [portrait('one.png'), portrait('two.png', 300, 400)]);
    await expect(page.locator('.gallery-name').nth(0)).toContainText('one.png');
    await page.getByTitle('Move earlier', { exact: true }).nth(1).click();
    await expect(page.locator('.gallery-name').nth(0)).toContainText('two.png');
    await page
        .locator('.studio-sidebar')
        .getByRole('button', { name: 'Smart Photo Editor', exact: true })
        .click();
    await page
        .getByRole('button', { name: 'Conservative enhancement', exact: true })
        .click();
    await page
        .getByRole('button', {
            name: 'Apply enhancement to batch',
            exact: true,
        })
        .click();
    await page.locator('.gallery-photo').nth(1).click();
    await expect(page.getByLabel('Brightness')).toHaveValue('104');
    await page.getByTitle('Delete photo', { exact: true }).nth(1).click();
    await expect(page.locator('.gallery-grid article')).toHaveCount(1);
    await page.getByLabel('Brightness').fill('110');
    await expect(page.getByLabel('Brightness')).toHaveValue('110');
    await page.getByTitle('Replace photo', { exact: true }).click();
    await page
        .locator('.photo-gallery input[type=file]')
        .setInputFiles(portrait('replaced.png'));
    await expect(page.locator('.gallery-name')).toContainText('replaced.png');
    await page.getByRole('button', { name: 'Add photos', exact: true }).click();
    await page.locator('.photo-gallery input[type=file]').setInputFiles({
        name: 'corrupt.png',
        mimeType: 'image/png',
        buffer: Buffer.from('not a png'),
    });
    await expect(page.locator('.studio-notice')).toContainText('corrupt.png');
    await expect(page.locator('.gallery-grid article')).toHaveCount(1);
});
test('layout engine: multi-size jobs, capacity, invalid sizing, orientation, overlap protection', async ({
    page,
}) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
        const { arrange, mmToPx } =
            await import('http://127.0.0.1:5174/resources/js/studio/services/layout.ts');
        const { defaultEdit, defaultSheet } =
            await import('http://127.0.0.1:5174/resources/js/studio/config.ts');
        const photo = { id: 'one', edit: { ...defaultEdit, copies: 9 } };
        const landscape = arrange([photo], defaultSheet),
            portrait = arrange([photo], { ...defaultSheet, landscape: false });
        const invalid = arrange(
            [{ ...photo, edit: { ...photo.edit, width: 300 } }],
            defaultSheet,
        );
        const overlap = arrange([photo], {
            ...defaultSheet,
            offsets: { 'one-1': { x: -37, y: 0 } },
        });
        const mixed = arrange(
            [
                photo,
                {
                    id: 'two',
                    edit: { ...defaultEdit, width: 25, height: 35, copies: 3 },
                },
            ],
            defaultSheet,
        );
        return {
            landscape: {
                columns: landscape.columns,
                rows: landscape.rows,
                pages: landscape.pages.map((p) => p.length),
            },
            portrait: portrait.pages.map((p) => p.length),
            invalid: invalid.error,
            overlap: overlap.error,
            mixed: mixed.pages.flat().length,
            a4: [mmToPx(210, 300), mmToPx(297, 300)],
        };
    });
    expect(result.landscape).toEqual({ columns: 4, rows: 2, pages: [8, 1] });
    expect(result.portrait).toEqual([6, 3]);
    expect(result.invalid).toContain('larger');
    expect(result.overlap).toContain('overlap');
    expect(result.mixed).toBe(12);
    expect(result.a4).toEqual([2480, 3508]);
});
test('responsive navigation, settings persistence, inactivity warning and automatic cleanup', async ({
    page,
}) => {
    await auditInit(page);
    await page.goto('/');
    await upload(page);
    await page
        .locator('.studio-sidebar')
        .getByRole('button', { name: 'Settings', exact: true })
        .click();
    await page.getByLabel('Inactivity warning after').selectOption('5');
    await expect
        .poll(() =>
            page.evaluate(
                () =>
                    JSON.parse(localStorage.getItem('smartscan-preferences'))
                        .idle,
            ),
        )
        .toBe(5);
    await page.clock.install();
    await page.clock.fastForward(6 * 60 * 1000);
    await expect(page.getByRole('dialog')).toContainText('Still working');
    await page.clock.fastForward(61 * 1000);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect
        .poll(() => page.evaluate(() => window.__activeUrls.size))
        .toBe(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTitle('Open navigation', { exact: true }).click();
    await page
        .locator('.studio-sidebar')
        .getByRole('button', { name: 'Dashboard', exact: true })
        .click();
    await expect(
        page.getByRole('heading', { name: 'Good work starts here.' }),
    ).toBeVisible();
    const sizes = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
    }));
    expect(sizes.scroll).toBeLessThanOrEqual(sizes.width);
    await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});

test('import and worker cancellation, no stale resources, keyboard layout positioning', async ({
    page,
}) => {
    await auditInit(page);
    await page.addInitScript(() => {
        const decode = Reflect.get(HTMLImageElement.prototype, 'decode');
        HTMLImageElement.prototype.decode = async function () {
            await decode.call(this);
            await new Promise((resolve) => setTimeout(resolve, 180));
        };
    });
    await page.goto('/');
    await page
        .locator('.studio-sidebar')
        .getByRole('button', { name: 'Passport Photo Maker', exact: true })
        .click();
    await page
        .locator('input[type=file]')
        .first()
        .setInputFiles(
            Array.from({ length: 10 }, (_, i) =>
                portrait(`batch-${i}.png`, 200, 300),
            ),
        );
    await expect(page.locator('.studio-notice')).toContainText('Importing');
    await page
        .locator('.studio-notice')
        .getByRole('button', { name: 'Cancel', exact: true })
        .click();
    await expect(page.locator('.studio-notice')).toContainText('cancelled');
    await page
        .locator('.studio-jobbar')
        .getByRole('button', { name: 'End session', exact: true })
        .click();
    if (await page.getByRole('dialog').isVisible())
        await page
            .getByRole('dialog')
            .getByRole('button', { name: 'Clear all photos', exact: true })
            .click();
    await expect
        .poll(() => page.evaluate(() => window.__activeUrls.size))
        .toBe(0);
    await upload(page);
    await page
        .getByRole('button', { name: 'Conservative enhancement' })
        .click();
    await page
        .getByRole('button', { name: 'Arrange on sheet', exact: true })
        .click();
    await page.locator('.sheet-photo').first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.sheet-preview')).not.toContainText('overlap');
    await page.keyboard.press('Shift+ArrowRight');
    await expect(page.locator('.sheet-preview')).toContainText('overlap');
    await expect(
        page.getByRole('button', { name: 'Export PDF', exact: true }),
    ).toBeDisabled();
    await page
        .getByRole('button', { name: 'Auto arrange', exact: true })
        .click();
    await page.getByRole('button', { name: 'Center', exact: true }).click();
    await page
        .getByRole('button', { name: 'Distribute evenly', exact: true })
        .click();
    await expect(
        page.getByRole('button', { name: 'Export PDF', exact: true }),
    ).toBeEnabled();
    await page.evaluate(() => {
        const WorkerConstructor = window.Worker;
        window.Worker = class extends WorkerConstructor {
            postMessage(...args) {
                setTimeout(() => super.postMessage(...args), 500);
            }
        };
    });
    let downloaded = false;
    page.on('download', () => {
        downloaded = true;
    });
    await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
    await expect(page.locator('.studio-notice')).toContainText('Rendering');
    await page
        .locator('.studio-notice')
        .getByRole('button', { name: 'Cancel', exact: true })
        .click();
    await page
        .locator('.studio-jobbar')
        .getByRole('button', { name: 'Clear all photos', exact: true })
        .click();
    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Clear all photos', exact: true })
        .click();
    await expect
        .poll(() => page.evaluate(() => window.__activeUrls.size))
        .toBe(0);
    expect(downloaded).toBe(false);
});

test('EXIF orientation and individual photo export preserve physical size', async ({
    page,
}) => {
    await auditInit(page);
    await page.goto('/');
    const fixture = portrait('exif-source.png', 300, 400);
    const jpg = await page.evaluate(async (base64) => {
        const image = new Image();
        image.src = 'data:image/png;base64,' + base64;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 400;
        canvas.getContext('2d').drawImage(image, 0, 0);
        return canvas.toDataURL('image/jpeg').split(',')[1];
    }, fixture.buffer.toString('base64'));
    const bytes = Buffer.from(jpg, 'base64');
    const exif = Buffer.from([
        0xff, 0xe1, 0, 34, 69, 120, 105, 102, 0, 0, 73, 73, 42, 0, 8, 0, 0, 0,
        1, 0, 0x12, 1, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0,
    ]);
    await upload(page, [
        {
            name: 'oriented.jpg',
            mimeType: 'image/jpeg',
            buffer: Buffer.concat([
                bytes.subarray(0, 2),
                exif,
                bytes.subarray(2),
            ]),
        },
    ]);
    await expect(page.locator('.editor-preview .preview-foot')).toContainText(
        '400 × 300 px',
    );
    const output = await downloadBytes(
        page,
        page.getByRole('button', { name: 'Download photo', exact: true }),
    );
    const png = PNG.sync.read(output);
    expect(png.width).toBe(413);
    expect(png.height).toBe(531);
    expect(output.readUInt32BE(output.indexOf(Buffer.from('pHYs')) + 4)).toBe(
        11811,
    );
    await page
        .getByRole('button', { name: 'Print current photo', exact: true })
        .click();
    await expect(page.getByRole('dialog')).toContainText('152.4 × 101.6 mm');
    await expect(page.getByRole('dialog').locator('.sheet-photo')).toHaveCount(
        1,
    );
    await page
        .getByRole('button', { name: 'Open print dialog', exact: true })
        .click();
    await expect
        .poll(() => page.evaluate(() => window.__printCalls.length))
        .toBe(1);
});

test('smart editor standalone import fits 4x6 output, face detection gracefully falls back', async ({
    page,
}) => {
    await page.goto('/');
    await page
        .locator('.studio-sidebar')
        .getByRole('button', { name: 'Smart Photo Editor', exact: true })
        .click();
    await page
        .locator('input[type=file]')
        .first()
        .setInputFiles(portrait('print.png'));
    await expect(page.locator('.gallery-grid article')).toHaveCount(1);
    await page
        .getByRole('button', { name: 'Suggest face crop', exact: true })
        .click();
    await expect(page.locator('.studio-notice')).toContainText(
        /manual crop|Manual cropping/i,
    );
    await page
        .getByLabel('Crop aspect ratio', { exact: true })
        .selectOption('free');
    await page
        .getByLabel('Photo preset', { exact: true })
        .selectOption('print');
    await page
        .getByRole('button', { name: 'Arrange on sheet', exact: true })
        .click();
    await expect(page.locator('.sheet-actions')).toContainText(
        '1 copies · 1 sheets',
    );
    await expect(page.locator('.sheet-preview')).not.toContainText('larger');
    await expect(
        page.getByRole('button', { name: 'Export PDF', exact: true }),
    ).toBeEnabled();
    await page.screenshot({
        path: 'test-results/sheet-preview.png',
        fullPage: true,
    });
});

test('compiled production enhancement worker processes pixels locally', async ({
    page,
}) => {
    const assets = await fs.readdir('public/build/assets');
    const filename = assets.find((name) => /^enhancement-.*\.js$/.test(name));
    expect(filename).toBeTruthy();
    await page.goto('/');
    const result = await page.evaluate(async (filename) => {
        const worker = new Worker('/build/assets/' + filename, {
            type: 'module',
        });
        try {
            const pixels = new ImageData(
                new Uint8ClampedArray([
                    100, 100, 100, 255, 100, 100, 100, 255, 100, 100, 100, 255,
                    100, 100, 100, 255,
                ]),
                2,
                2,
            );
            return await new Promise((resolve, reject) => {
                worker.onerror = () =>
                    reject(new Error('Compiled worker failed to load.'));
                worker.onmessage = (event) =>
                    resolve(Array.from(event.data.data));
                worker.postMessage(
                    {
                        pixels,
                        edit: {
                            highlights: 0,
                            shadows: 50,
                            sharpness: 0,
                            noise: 0,
                        },
                    },
                    [pixels.data.buffer],
                );
            });
        } finally {
            worker.terminate();
        }
    }, filename);
    expect(result.slice(0, 4)).toEqual([111, 111, 111, 255]);
});
