const { expect } = require('@playwright/test');
const path = require('path');
const { waitForLatestEmail } = require('../utils/helper/gmailHelper');
const { website } = require('../pages/website');

const STORAGE_STATE_PATH = path.join(__dirname, '../../storageState.json');

exports.Signin = class SignIn {

    /**
     * @param {import('@playwright/test').Page} page
     */

    constructor(page) {
        this.page = page;
        this.mail = waitForLatestEmail;
        this.website = new website(page);
    }

    // Verify Signin Page is opened
    async verifySignIn() {
        await expect(this.page.locator("h1.auth-card__title")).toHaveText("Sign in to Synctag");
    }

    // Go to the Email tab of the Signin section
    async clickEmailTab() {
        await this.page.locator("button.auth-method__option").filter({ hasText: 'Email' }).click();
    }

    // Enter Email Address and send the OTP
    async enterEmailAndSendOTP(emailAddress) {
        await this.page.getByPlaceholder("Enter email address").fill(emailAddress);
        await this.page.locator("button.auth-submit").filter({ hasText: 'Send Verification Code' }).click();
    }

    // Enter Email OTP
    async enterEmailOTP(emailOTP) {
        await expect(this.page.locator("h1.auth-card__title")).toHaveText("Verify your access");
        await this.page.locator("input#auth-otp").fill(emailOTP);
    }

    // Click Verify OTP Button
    async clickVerifyOTP() {
        await this.page.locator("button.auth-submit").filter({ hasText: 'Verify Code' }).click();
    }

    // Verify the workspace registration page is opened
    async verifyRegistrationPage() {
        await expect(this.page.locator("h1.auth-card__title")).toHaveText("Complete your workspace");
    }

    // Enter the workspace registration details (email is pre-filled/disabled from the OTP step)
    async completeWorkspaceRegistration(firstName, lastName) {
        await this.page.locator("input#auth-first-name").fill(firstName);
        await this.page.locator("input#auth-last-name").fill(lastName);
    }

    // Select Country Code by searching for the country name and picking its option
    async selectCountryCode(countryName, dataValue) {
        await this.page.locator("div.auth-phone-row>div>div>button").click();
        await this.page.getByPlaceholder("Search country or code").fill(countryName);
        await this.page.locator(`//button/span[text()='${dataValue}']`).click();
    }

    // Enter Phone Number
    async enterPhoneNumber(phoneNumber) {
        await this.page.locator("input#auth-details-phone").fill(phoneNumber);
    }

    // Accept the Terms of Service and Privacy Policy
    async acceptTermsAndConditions() {
        await this.page.locator("input#auth-terms").click();
    }

    // Click Complete Registration button
    async clickCompleteRegistration() {
        await this.page.locator("button[type='submit']").filter({ hasText: 'Complete Registration' }).click();
        await expect(this.page.locator("a.site-header__signin").filter({hasText:'Dashboard'})).toBeVisible();
    }

    // Verify user is signed in. If the session has expired,
    // sign in again and save a fresh storage state.
    async verifySignedIn(testEmail) {
        await this.page.goto('/discover');

        const discoverPage = this.page
            .locator("input.dc-landing-input");

        // Auto-retrying assertion instead of isVisible(), which doesn't wait for the element to appear
        const alreadySignedIn = await expect(discoverPage)
            .toBeVisible({ timeout: 8000 })
            .then(() => true)
            .catch(() => false);

        if (alreadySignedIn) {
            return;
        }

        // Session expired - sign in again
        await this.page.goto("/");
        await this.website.clickSignin();

        const requestTime = new Date();

        await this.clickEmailTab();
        await this.enterEmailAndSendOTP(testEmail);

        const mail = await this.mail({
            dateNow: requestTime,
            fromContains: "synctag.com",
            subjectContains: "verification code",
        });

        const match = mail?.subject?.match(/verification code is (\d{6})/i);

        if (!match) {
            throw new Error(
                `Could not find a 6-digit OTP in email subject: "${mail?.subject}"`
            );
        }

        const otp = match[1];

        await this.enterEmailOTP(otp);
        await this.clickVerifyOTP();

        // Verify login succeeded
        await expect(discoverPage).toBeVisible();

        // Save authenticated session
        await this.page.context().storageState({
            path: STORAGE_STATE_PATH,
        });
    }
}
