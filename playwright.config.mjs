import { defineConfig } from '@playwright/test';
export default defineConfig({
    testDir: './tests/studio',
    testMatch: '**/*.spec.mjs',
    fullyParallel: false,
    workers: 1,
    timeout: 60000,
    expect: { timeout: 10000 },
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:8000',
        channel: 'chrome',
        headless: true,
        viewport: { width: 1440, height: 1000 },
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
    },
    webServer: [
        {
            command: 'php artisan serve --host=127.0.0.1 --port=8000',
            url: 'http://localhost:8000',
            reuseExistingServer: !process.env.CI,
        },
        {
            command: 'npm run dev -- --host 127.0.0.1 --port 5174',
            url: 'http://127.0.0.1:5174/@vite/client',
            reuseExistingServer: !process.env.CI,
        },
    ],
});
