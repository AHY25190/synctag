const { expect } = require('@playwright/test');
exports.Mailinator = class Mailinator {

    /**
     * @param {import('@playwright/test').Page} page
     */

    constructor(page) {
        this.page = page;
    }

    // Open the public inbox for the given inbox name (part of the mailinator.com address before the @)
    async openPublicInbox(inboxName) {
        await this.page.goto(`https://www.mailinator.com/v4/public/inboxes.jsp?to=${inboxName}`);
        await expect(this.page.locator("table.table-striped>tbody>tr")).toBeVisible();
    }

    // Poll the public inbox until the Synctag verification email arrives and return the 6-digit OTP
    async getSynctagOTP(inboxName, { timeout = 600000, interval = 15000 } = {}) {
        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
            await this.openPublicInbox(inboxName);
            const bodyText = await this.page.locator('body').innerText();
            const match = bodyText.match(/verification code is (\d{6})/i);
            if (match) {
                return match[1];
            }
            await this.page.waitForTimeout(interval);
        }
        throw new Error(`OTP email not received for inbox "${inboxName}" within ${timeout}ms`);
    }
}
