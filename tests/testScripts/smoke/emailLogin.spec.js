const path = require('path');
const { test, expect } = require('@playwright/test');
const { website } = require('../../pages/website');
const { Signin } = require('../../pages/signIn');
const { waitForLatestEmail } = require('../../utils/helper/gmailHelper');

// Fixed, already-registered account. Accounts on this app can't be deleted, so login
// smoke tests reuse this one account instead of registering a new one every run.
const TEST_EMAIL = 'johnfigerro@gmail.com';
const STORAGE_STATE_PATH = path.join(__dirname, '../../../storageState.json');

// This test performs the login itself, so it must start from a clean, signed-out session
// rather than the shared logged-in storage state it produces for the other tests to reuse.
test.use({ storageState: { cookies: [], origins: [] } });

test('Log in to an existing Synctag account via Email OTP', async ({ page }) => {
    const homePage = new website(page);
    const signIn = new Signin(page);
    const requestTime = new Date();

    await test.step('Open Synctag website', async () => {
        await page.goto('/');
        await homePage.verifyWebite();
    });

    await test.step('Click Get Started for free', async () => {
        await homePage.clickGetStarted();
        await signIn.verifySignIn();
    });

    await test.step('Go to Email tab and send OTP', async () => {
        await signIn.clickEmailTab();
        await signIn.enterEmailAndSendOTP(TEST_EMAIL);
    });

    let otp;
    await test.step('Retrieve OTP from Gmail inbox', async () => {
        const mail = await waitForLatestEmail({
            dateNow: requestTime,
            fromContains: 'synctag.com',
            subjectContains: 'verification code',
        });
        const match = mail && mail.subject.match(/verification code is (\d{6})/i);
        if (!match) {
            throw new Error(`Could not find a 6-digit OTP in the received email subject: "${mail && mail.subject}"`);
        }
        otp = match[1];
    });

    await test.step('Enter OTP and verify', async () => {
        await signIn.enterEmailOTP(otp);
        await signIn.clickVerifyOTP();
    });

    await test.step('Verify successful login', async () => {
        await expect(page).toHaveURL(/\/tags/);
        await expect(page.getByRole('heading', { name: 'Tag Library' })).toBeVisible();
    });

    await test.step('Save logged-in session for reuse by other tests', async () => {
        await page.context().storageState({ path: STORAGE_STATE_PATH });
    });
});
