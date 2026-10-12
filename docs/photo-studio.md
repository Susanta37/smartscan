# SmartScan Photo Studio

The studio is available at `/` inside the existing Laravel / Inertia / React application. Authentication and account settings from the starter remain available on their existing routes. No photo backend or image storage has been added.

## Running locally

With the project's PHP dependencies, `.env`, application key, and SQLite database already set up:

```powershell
npm install
php artisan serve --host=127.0.0.1 --port=8000
```

In another terminal:

```powershell
npm run dev
```

Open `http://localhost:8000`. The app has Passport Photo Maker, Smart Photo Editor, and Print Sheet Designer, sharing an in-memory photo session. Dashboard, session job summaries, settings, and planned tools are also available.

For a production build, stop the Vite development server, run `npm run build`, and serve Laravel normally. Do not deploy `public/hot`; it points Laravel to a development server. Serve over HTTPS for secure browser APIs. Vite Plus and its Vite alias must use matching versions.

## Operator workflow

1. Choose a workspace and import JPG, PNG, or WebP files (up to 40 photos, 25 MB each, and 40 megapixels per source).
2. Choose the photo preset or custom physical dimensions. Adjust crop ratio, zoom, position, rotation, flips, and enhancement. Original decoding honors EXIF orientation in supported browsers. Undo/redo is per photo, with up to 50 edit snapshots.
3. Set copies per photo. Use the gallery to select, reorder, replace, duplicate, or remove photos. Apply enhancement to the batch when appropriate.
4. Arrange on the selected paper. Dimensions and margins are millimeters; output pixels are derived from DPI. Rows/columns set to zero are automatic. Overflow creates additional pages. Drag photos or focus a photo and press arrow keys to position it (Shift moves by 2 mm). Align the grid or distribute matching-size photos evenly. Overlapping or oversized layouts block sheet output.
5. Review print preview and source-resolution warnings. Export PDF, PNG, or JPEG, or open the print dialog. Image exports write the selected DPI into PNG pHYs / JPEG JFIF metadata; PDFs use explicit physical page sizes with PrintScaling set to None. Each image-export page downloads separately; the browser may request permission for multiple downloads. PDF contains all pages in one file.
6. Choose matching paper, Actual Size / 100%, and disable fit-to-page in the printer driver. Printer margins and borderless support can affect output. Test a print with a ruler. The browser can request printing but cannot confirm successful physical printing or select/list installed printers.
7. Clear all photos or end the session. Application-held photo URLs, previews, history, temporary print frames, exports, and workers are released. Anonymous recent-job summaries remain in page memory until cleared or reloaded.

The 4 × 6-inch smart-editor workflow defaults to portrait, zero-margin paper so a full-size 4 × 6 photo fits. Confirm your printer supports those margins; use a larger paper or smaller photo if needed.

## Privacy and processing

- Photos, decoded images, crop edits, thumbnails, and undo history exist only in browser memory. No upload endpoint is called.
- Only non-sensitive default paper, DPI, and inactivity settings are saved in `smartscan-preferences`. There is no photo use of localStorage, IndexedDB, caches, or a service worker.
- Laravel Boost's browser log forwarding is disabled in `config/boost.php` to prevent console/error telemetry from leaving the workstation. Customer processing does not log photo data.
- An inactivity warning appears after the configured interval, followed by cleanup after a 60-second grace period. Import and sheet-generation cancellation invalidate the active operation. Print-resolution pixel adjustments use a local Web Worker where available; repeated copies reuse one rendered photo per sheet.
- Browser memory cleanup does not guarantee forensic erasure. Downloads, browser-managed download records, printer queues, and physical prints remain outside application control.
- Background color fills uncovered/transparent canvas areas. Background removal/replacement is unavailable until a suitable local segmentation engine is configured. Nothing is uploaded to enable it.
- Face detection uses the browser's optional FaceDetector API. When unavailable or no face is found, manual cropping remains available. The operator must review suggested crops.
- Presets describe print sizes, backgrounds, DPI, and positioning guidance. They never guarantee acceptance by a government or issuing authority. Rules must be checked with that authority.
- Output rasters are limited to 40 megapixels to bound memory use. Lower DPI or choose smaller paper if this limit is exceeded. Enhancements are conventional pixel adjustments; there is no generative identity editing.

## Structure

- `resources/js/studio/config.ts`: tool registry, paper sizes, configurable photo presets, and defaults.
- `resources/js/studio/components/`: dashboard, uploader, gallery, crop preview, editing panels, sheet canvas/settings, controls, and accessible dialogs.
- `resources/js/studio/hooks/usePhotoSession.ts`: import validation/cancellation, selection, batch actions, history, and original URL lifecycle.
- `resources/js/studio/services/`: physical packing, Canvas rendering, natural pixel adjustment, density metadata, PDF/image export, browser printing, and temporary-resource cleanup.
- `resources/js/studio/workers/enhancement.ts`: high-resolution pixel processing.
- `resources/css/studio.css`: responsive studio interface.

## Verification

```powershell
npm run check
npm run types:check
npm run build
npm run test:studio
php artisan test --compact
```

Playwright uses installed Chrome by default and starts/reuses Laravel on port 8000 and Vite on port 5174. Set up the normal Laravel `.env` and database first. Browser tests use generated synthetic portrait fixtures so no customer photographs enter test artifacts. Tests inspect pixel sizes, physical PDF page boxes, output density, layout capacity, natural batch enhancement, undo/redo, import errors, URL cleanup, network requests, inactivity cleanup, and mobile navigation. The print test intercepts the browser print function to verify the dedicated print view; a real printer and driver still require manual calibration.
