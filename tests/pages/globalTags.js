const { expect } = require('@playwright/test');
const { stripTypeScriptTypes } = require('node:module');

// Some of these assertions run alongside heavier tests (persistent extension contexts),
// so they get a longer timeout to stay reliable under that extra resource contention.
const TIMEOUT = { timeout: 60000 };

// Razorpay (test mode) rejects a plain one-time test card for recurring/e-mandate charges
// ("This card is not eligible for recurring payments"), so the mandatory yearly Trigger
// Name Cost - charged on every Global Tag - needs its own recurring-capable test card.
// Numbers per https://razorpay.com/docs/payments/payments/test-card-details/.
const RAZORPAY_TEST_CARDS = {
    oneTime: { number: '4100280000001007', expiry: '1230', cvv: '123' },
    recurring: { number: '4718609108204366', expiry: '1230', cvv: '123' },
};
exports.RAZORPAY_TEST_CARDS = RAZORPAY_TEST_CARDS;

exports.GlobalTags = class GlobalTags {

    /**
     * @param {import('@playwright/test').Page} page
     */

    constructor(page) {
        this.page = page;
    }

    // Go to the Global Tags section from the sidebar
    async open(){
        await this.page.locator('#tabmenu-global-macros').click();
    }

    // Verify the Global Tags page opened without any issues
    async verifyPageOpened(){
        await expect(this.page.locator('.tab-header h3')).toHaveText('Global Tags');
    }

    // Switch to the Marketplace tab (browse tags shared by other users)
    async goToMarketplace(){
        await this.page.getByRole('tab', { name: 'Marketplace' }).click();
    }

    // Switch to the My Global Tags tab (tags this account created or purchased)
    async goToMyGlobalTags(){
        await this.page.getByRole('tab', { name: 'My Global Tags' }).click();
    }

    // Click the Create Global Tag button to start creating a tag
    async clickCreateGlobalTag(){
        await this.page.locator('button.synctag-btn-primary', { hasText: 'Create Global Tag' }).click();
    }

    // Switch the Create Tag form to a given type: Text, Form, AI, API, File, Authenticator or Browser
    async selectTagType(type){
        await this.page.locator('label.type-selector-label', { hasText: type }).click();
    }

    // Clear any lingering text selection. Filling inputs (and Ctrl+A in the rich-text
    // editor) can leave a selection that survives the SPA's client-side navigation and
    // re-triggers the extension's floating text-selection bubble on a later page,
    // intercepting clicks there.
    async clearSelection(){
        await this.page.evaluate(() => window.getSelection().removeAllRanges());
    }

    // Fill the Trigger and Description fields shared by every tag type
    async fillTriggerAndDescription(trigger, description){
        const triggerInput = this.page.locator('#macro-alias');
        const descriptionInput = this.page.locator('#macro-name');

        await triggerInput.fill(trigger);
        // exact: true - the Trigger Name Cost panel also shows a similarly-worded
        // "Trigger is available for global use" message once pricing is calculated.
        await expect(this.page.getByText('Trigger is available', { exact: true })).toBeVisible(TIMEOUT);
        await descriptionInput.fill(description);
    }

    // Switch the tag from Free to Monetize and set its sell price (INR). Only the buyer
    // pays this price later - the creator never goes through checkout for their own tag.
    async setMonetized(price){
        await this.page.locator('input[name="sellType"][value="monetize"]').click();
        await this.page.locator('#public-tag-price').fill(String(price));
    }

    // Save the tag, re-filling Trigger/Description first if a late async check reset them
    async saveTag(trigger, description){
        const triggerInput = this.page.locator('#macro-alias');
        const descriptionInput = this.page.locator('#macro-name');

        for (let attempt = 0; attempt < 3; attempt++) {
            const [triggerValue, descriptionValue] = await Promise.all([
                triggerInput.inputValue(),
                descriptionInput.inputValue(),
            ]);
            if (triggerValue === trigger && descriptionValue === description) {
                break;
            }
            if (triggerValue !== trigger) {
                await triggerInput.fill(trigger);
            }
            if (descriptionValue !== description) {
                await descriptionInput.fill(description);
            }
            await this.page.waitForTimeout(500);
        }
        await this.clearSelection();
        await this.page.locator('#tageditor-save').click();
    }

    // Every Global Tag trigger carries a mandatory yearly "Trigger Name Cost", charged via
    // Razorpay. Saving pops a "Confirm Payment" dialog for it; call this right after saveTag()
    // to complete that charge with a recurring-capable test card so the tag itself gets saved.
    async completeTriggerNameCostCheckout(){
        await expect(this.page.getByText('Confirm Payment')).toBeVisible(TIMEOUT);
        const proceedButton = this.page.getByRole('button', { name: 'PROCEED' });
        await expect(proceedButton).toBeVisible(TIMEOUT);
        await proceedButton.click();

        await this.payWithRecurringTestCard();
    }

    // Create a Text tag with rich-text content, optionally monetized at the given INR price
    async createTextTag(trigger, description, content, price){
        await this.fillTriggerAndDescription(trigger, description);
        if (price) await this.setMonetized(price);
        await this.page.locator('#macro-body-editor .ql-editor').click();
        await this.page.keyboard.type(content);
        await this.saveTag(trigger, description);
    }

    // Create an AI tag with a prompt template, optionally monetized at the given INR price
    async createAiTag(trigger, description, promptData, price){
        await this.fillTriggerAndDescription(trigger, description);
        await this.selectTagType('AI');
        if (price) await this.setMonetized(price);
        await this.page.locator('#macro-prompt-data-editor').fill(promptData);
        await this.saveTag(trigger, description);
    }

    // Create an API tag by calling a real endpoint and saving the tested response,
    // optionally monetized at the given INR price
    async createApiTag(trigger, description, method, url, price){
        await this.fillTriggerAndDescription(trigger, description);
        await this.selectTagType('API');
        if (price) await this.setMonetized(price);
        await this.page.locator('#api-method').click();
        await this.page.locator('.api-method-option', { hasText: method }).click();
        await this.page.locator('#api-url').fill(url);
        await this.page.locator('#api-test-btn').click();
        await expect(this.page.locator('#api-response-preview')).toContainText('200 OK', TIMEOUT);
        await this.saveTag(trigger, description);
    }

    // Create a File tag by uploading a file from disk, optionally monetized at the given INR price
    async createFileTag(trigger, description, filePath, price){
        await this.fillTriggerAndDescription(trigger, description);
        await this.selectTagType('File');
        if (price) await this.setMonetized(price);
        await this.page.locator('#filetag-file-input-inline').setInputFiles(filePath);
        await this.saveTag(trigger, description);
    }

    // ---- Marketplace purchase flow (Razorpay, test mode) ----

    // Scan the Marketplace for the cheapest tag that still needs to be purchased (locked,
    // priced above zero) and return its trigger and price. A user's own tags never show up
    // here, so this always targets a tag owned by someone else.
    async findCheapestPurchasableTag(){
        await this.goToMarketplace();
        await this.verifyPageOpened();

        const cards = this.page.locator('.macro-card.global-macro').filter({
            has: this.page.getByRole('button', { name: 'Buy' }),
        });
        const count = await cards.count();

        let cheapest = null;
        for (let i = 0; i < count; i++) {
            const card = cards.nth(i);
            const priceText = await card.locator('.macro-footer-purchase span').first().innerText();
            const price = Number(priceText.replace(/[^\d.]/g, ''));
            if (Number.isFinite(price) && (!cheapest || price < cheapest.price)) {
                const triggerText = await card.locator('.macro-trigger-value').innerText();
                cheapest = { price, trigger: triggerText.replace(/^\$/, ''), card };
            }
        }

        if (!cheapest) {
            throw new Error('No purchasable Global Tag was found in the Marketplace.');
        }
        return cheapest;
    }

    // Click Buy on a specific tag (by trigger) from the Marketplace, opening the Razorpay checkout
    async clickBuyForTrigger(trigger){
        await this.goToMarketplace();
        const card = this.page.locator('.macro-card.global-macro').filter({ hasText: `$${trigger}` });
        await card.getByRole('button', { name: 'Buy' }).click();
    }

    // Complete the Razorpay (test mode) checkout with a new one-time test card (Marketplace
    // purchases only). Razorpay's checkout is a third-party iframe (api.razorpay.com), so
    // this waits for it to be attached before interacting with it. For the recurring/
    // e-mandate Trigger Name Cost charge, use payWithRecurringTestCard() instead - a
    // one-time card is rejected for that.
    async payWithTestCard(card = RAZORPAY_TEST_CARDS.oneTime){
        const findFrame = () => this.page.frames().find(f => f.url().includes('api.razorpay.com/v1/checkout'));
        await expect.poll(() => Boolean(findFrame()), TIMEOUT).toBe(true);
        let frame = findFrame();

        await frame.locator('#nav-sidebar [data-testid="card"]').first().click();
        await frame.getByText('Add a new card', { exact: false }).click();
        await frame.locator('input[name="card.number"]').fill(card.number);
        await frame.locator('input[name="card.expiry"]').fill(card.expiry);
        await frame.locator('input[name="card.cvv"]').fill(card.cvv);
        await frame.getByRole('button', { name: 'Continue' }).click();

        // Razorpay may offer to save the new card for future payments - dismiss it if it appears
        await this.page.waitForTimeout(4000);
        frame = findFrame();
        if (frame) {
            const maybeLater = frame.getByRole('button', { name: 'Maybe later' });
            if (await maybeLater.count() > 0) {
                await maybeLater.click();
            }
        }
    }

    // Complete the Razorpay (test mode) checkout for the recurring/e-mandate Trigger Name
    // Cost charge with the recurring-capable test card. Unlike a one-time card purchase,
    // this goes through an extra "pay and save card" confirmation, then a bank-simulation
    // step (popup or inline in the checkout iframe) approved via its Success button.
    async payWithRecurringTestCard(){
        const card = RAZORPAY_TEST_CARDS.recurring;
        const findFrame = () => this.page.frames().find(f => f.url().includes('api.razorpay.com/v1/checkout'));
        await expect.poll(() => Boolean(findFrame()), TIMEOUT).toBe(true);
        let frame = findFrame();

        await frame.locator('#nav-sidebar [data-testid="card"]').first().click();
        await frame.getByText('Add a new card', { exact: false }).click();
        await frame.locator('input[name="card.number"]').fill(card.number);
        await frame.locator('input[name="card.expiry"]').fill(card.expiry);
        await frame.locator('input[name="card.cvv"]').fill(card.cvv);
        await this.page.waitForTimeout(2000);
        await frame.getByRole('button', { name: 'Continue' }).click();
        await this.page.waitForTimeout(2000);

        await frame.locator("button[name='pay_and_save_card']").click();
        await this.page.waitForTimeout(2000);

        // The bank-simulation step sometimes opens as a popup and sometimes renders
        // inline in the checkout iframe instead - handle whichever one shows up.
        const popupPromise = this.page.waitForEvent('popup', { timeout: 10000 }).catch(() => null);
        await frame.locator('button.flex.appearance-none.items-center.text-left.text-base').click();
        const newWindow = await popupPromise;

        if (newWindow) {
            await newWindow.locator('button.success').click();
        } else {
            await frame.locator('button.success').click();
        }
        await this.page.waitForTimeout(2000);

        // Razorpay may offer to save the new card for future payments - dismiss it if it appears
        await this.page.waitForTimeout(4000);
        frame = findFrame();
        if (frame) {
            const maybeLater = frame.getByRole('button', { name: 'Maybe later' });
            if (await maybeLater.count() > 0) {
                await maybeLater.click();
            }
        }
    }

    // Verify a purchased tag now shows as unlocked ("Purchased") under My Global Tags
    async verifyTagPurchased(trigger){
        await this.goToMyGlobalTags();
        const card = this.page.locator('.macro-card').filter({ hasText: `$${trigger}` });
        await expect(card).toBeVisible(TIMEOUT);
        await expect(card.getByText('Purchased')).toBeVisible(TIMEOUT);
    }

    // Verify a newly created tag is visible under My Global Tags, optionally checking the
    // type badge (Text, AI, API, File, ...) shown on the card
    async verifyTagCreated(trigger, type){
        await this.goToMyGlobalTags();
        const card = this.page.locator('.macro-card').filter({ hasText: `$${trigger}` });
        await expect(card).toBeVisible(TIMEOUT);
        if (type) {
            await expect(card.locator('.macro-type')).toHaveText(new RegExp(type, 'i'), TIMEOUT);
        }
    }

}
