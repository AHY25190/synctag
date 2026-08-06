const { expect } = require('@playwright/test');

exports.SecureTags = class SecureTags {

    /**
     * @param {import('@playwright/test').Page} page
     */

    constructor(page) {
        this.page = page;
    }

    // Go to the Secured Tags section from the sidebar
    async open(){
        await this.page.locator('#tabmenu-vault').click();
    }

    // Verify the Secured Tags page opened without any issues
    async verifyPageOpened(){
        await expect(this.page.locator('.vault-container .tab-header h3')).toHaveText('Secured Tags');
    }

}
