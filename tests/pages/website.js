const { expect } = require('@playwright/test');

exports.website = class website {

    /**
     * @param {import('@playwright/test').Page} page
     */

    constructor(page) {
        this.page = page;
    }

    // Verifying Website is opened sucessfully
    async verifyWebite(){
        await expect(this.page.locator("#webapp-root a.site-header__brand img.brand-mark").nth(0)).toBeVisible();
    }

    // Click Get Started for free button
    async clickSignin(){
        await this.page.locator("a.site-header__signin").click();
    }

}