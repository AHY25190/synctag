const { expect } = require('@playwright/test');

exports.ProfilePage = class ProfilePage {

    /**
     * @param {import('@playwright/test').Page} page
     */

    constructor(page) {
        this.page = page;
    }

    // Verify Choose your theme section is displayed while creating new account
    async verifyChooseTheme(firstName, lastName){
        const tagName = `$${firstName}-${lastName}`.toLowerCase();
        await expect(this.page.locator("h2.synctag-global-modal__title")).toHaveText("Choose Your Profile Theme");
        await expect(this.page.locator("h1.tsm-pp-name")).toHaveText(tagName);
        await expect(this.page.locator("p.tsm-pp-display-name")).toHaveText(`${firstName} ${lastName}`);
    }

    // Click Apply button in choose your theme section
    async clickThemeApply(){
        await this.page.locator("div.tsm-actions>button").click();
    }




}