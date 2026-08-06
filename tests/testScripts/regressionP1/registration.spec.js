const { test, expect } = require('@playwright/test');
const { website } = require('../../pages/website');
const { Signin } = require('../../pages/signIn');
const { Mailinator } = require('../../utils/helper/mailinator');
const { ProfilePage } = require('../../pages/profilePage');
const { generateTestUser } = require('../../utils/testData');

// This test creates a brand new account, so it must not reuse the shared logged-in
// storage state the other tests rely on — start every run from a clean, signed-out session.
test.use({ storageState: { cookies: [], origins: [] } });

test('Register a new Synctag account via Email OTP', async ({ page, context }) => {
    const homePage = new website(page);
    const signIn = new Signin(page);
    const profilePage = new ProfilePage(page);
    const user = generateTestUser();

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
        await signIn.enterEmailAndSendOTP(user.email);
    });

    let otp;
    await test.step('Retrieve OTP from Mailinator public inbox', async () => {
        const mailinatorPage = await context.newPage();
        const mailinator = new Mailinator(mailinatorPage);
        otp = await mailinator.getSynctagOTP(user.inboxName);
        await mailinatorPage.close();
    });

    await test.step('Enter OTP and verify', async () => {
        await page.bringToFront();
        await signIn.enterEmailOTP(otp);
        await signIn.clickVerifyOTP();
        await signIn.verifyRegistrationPage();
    });

    await test.step('Complete workspace registration with random details', async () => {
        await signIn.completeWorkspaceRegistration(user.firstName, user.lastName);
        await signIn.selectCountryCode(user.country.name, user.country.dataValue);
        await signIn.enterPhoneNumber(user.phoneNumber);
        await signIn.acceptTermsAndConditions();
        await signIn.clickCompleteRegistration();
    });

    await test.step('Verify the new account was created', async () => {
        await profilePage.verifyChooseTheme(user.firstName, user.lastName);
        await profilePage.clickThemeApply();
    });
});
