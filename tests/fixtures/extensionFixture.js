const os = require('os');
const fs = require('fs');
const path = require('path');
const base = require('@playwright/test');

const EXTENSION_PATH = path.join(__dirname, '../utils/Synctag Extenstion/dist');
const STORAGE_STATE_PATH = path.join(__dirname, '../../storageState.json');
const SITE_ORIGIN = 'https://devextension.synctag.com';

// A test fixture that launches a persistent Chromium context with the real Synctag
// extension loaded (unpacked), signed in as the same account the other tests share.
exports.test = base.test.extend({
    context: async ({}, use, testInfo) => {
        const userDataDir = path.join(os.tmpdir(), `synctag-ext-${testInfo.workerIndex}-${Date.now()}`);
        const context = await base.chromium.launchPersistentContext(userDataDir, {
            headless: false,
            baseURL: `${SITE_ORIGIN}/`,
            args: [
                `--disable-extensions-except=${EXTENSION_PATH}`,
                `--load-extension=${EXTENSION_PATH}`,
            ],
        });

        // Persistent contexts don't honor the storageState launch option, so the shared
        // logged-in session is applied manually: cookies up front, then localStorage
        // once a page on the site origin exists to hold it.
        const storageState = JSON.parse(fs.readFileSync(STORAGE_STATE_PATH, 'utf-8'));
        await context.addCookies(storageState.cookies);

        const siteOrigin = storageState.origins.find(o => o.origin === SITE_ORIGIN);
        if (siteOrigin) {
            const page = context.pages()[0] || await context.newPage();
            await page.goto('/tags', { waitUntil: 'domcontentloaded' });
            await page.evaluate((items) => {
                for (const item of items) {
                    localStorage.setItem(item.name, item.value);
                }
            }, siteOrigin.localStorage);
            await page.reload({ waitUntil: 'domcontentloaded' });
        }

        await use(context);
        await context.close();
        fs.rmSync(userDataDir, { recursive: true, force: true });
    },

    page: async ({ context }, use) => {
        const page = context.pages()[0] || await context.newPage();
        await use(page);
    },

    extensionId: async ({ context }, use) => {
        let [serviceWorker] = context.serviceWorkers().filter(sw => sw.url().includes('/background/'));
        if (!serviceWorker) {
            serviceWorker = await context.waitForEvent('serviceworker', {
                predicate: sw => sw.url().includes('/background/'),
            });
        }
        await use(serviceWorker.url().split('/')[2]);
    },
});

exports.expect = base.expect;
