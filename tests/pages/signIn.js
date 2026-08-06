const {expect} = require('@playwright/test');

exports.Signin = class SignIn{

    /**
     * @param {import('@playwright/test').Page} page
     */

    constructor(page) {
        this.page = page;
    }

    // Verify Signin Page is opened
    async verifySignIn(){
        await expect(this.page.locator("h4.MuiTypography-root")).toHaveText("Sign in to Synctag");
    }

    // Go to the Email tab of the Signin section
    async clickEmailTab(){
        await this.page.locator("p.MuiTypography-root").filter({hasText:'Email'}).click();
    }

    // Enter Email Address and send the OTP
    async enterEmailAndSendOTP(emailAddress){
        await this.page.getByPlaceholder("Enter email address").fill(emailAddress);
        await this.page.locator("button>span").filter({hasText: 'Send Verification Code'}).click();
    }

    // Enter Email OTP
    async enterEmailOTP(emailOTP){
        await expect(this.page.locator("h4.MuiTypography-root")).toHaveText("Verify your access");
        await this.page.getByLabel("Verification Code").fill(emailOTP);
    }

    // Click Verify OTP Button
    async clickVerifyOTP(){
        await this.page.locator("span.auth-btn-label").filter({hasText: 'Verify Code'}).click();
    }

    // Verify the workspace registration page is opened
    async verifyRegistrationPage(){
        await expect(this.page.locator("h4.MuiTypography-root")).toHaveText("Complete your workspace");
    }

    // Enter the workspace registration details (email is pre-filled/disabled from the OTP step)
    async completeWorkspaceRegistration(firstName, lastName){
        await this.page.getByPlaceholder("Enter your first name").fill(firstName);
        await this.page.getByPlaceholder("Enter your last name").fill(lastName);
    }

    // Select Country Code by searching for the country name and picking its option
    async selectCountryCode(countryName, dataValue){
        await this.page.locator("div[role='combobox']").click();
        await this.page.getByPlaceholder("Search country code...").fill(countryName);
        await this.page.locator(`li[role='option'][data-value='${dataValue}']`).click();
    }

    // Enter Phone Number
    async enterPhoneNumber(phoneNumber){
        await this.page.getByPlaceholder("Enter the phone number").fill(phoneNumber);
    }

    // Accept the Terms of Service and Privacy Policy
    async acceptTermsAndConditions(){
        await this.page.locator("input[type='checkbox']").click();
    }

    // Click Complete Registration button
    async clickCompleteRegistration(){
        await this.page.locator("span.auth-btn-label").filter({hasText: 'Complete Registration'}).click();
    }

}
