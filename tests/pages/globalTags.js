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

// Invitation code required to create Marketplace tags (asked the first time Marketplace is picked)
const INVITATION_CODE = 'FREE';

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
        await expect(this.page.locator('.tab-header h3')).toHaveText('Marketplace');
    }

    // Go to the Marketplace (browse tags shared by other users) from the sidebar
    async goToMarketplace(){
        await this.open();
    }

    // Go to a section of the Tag Library holding this account's Marketplace tags:
    // 'My Listings' (tags it created) or 'Purchased' (tags it bought)
    async goToMyGlobalTags(section){
        await this.page.locator('#tabmenu-macros').click();
        await this.page.getByRole('tablist', { name: 'Tag sections' }).getByRole('tab', { name: section }).click();
    }

    // Start creating a Global (Marketplace) tag: My Tags > New Tag, then pick Marketplace as
    // the tag kind. If the account is asked for an invitation code, apply the FREE code.
    async clickCreateGlobalTag(){
        await this.page.locator('#tabmenu-macros').click();
        await this.page.locator('button.synctag-btn-primary', { hasText: 'New Tag' }).click();
        await this.page.getByRole('tablist', { name: 'Tag kind' }).getByRole('tab', { name: 'Marketplace' }).click();

        const invitationInput = this.page.getByPlaceholder('Enter invitation code');
        const invitationAsked = await invitationInput.waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
        if (invitationAsked) {
            await invitationInput.fill(INVITATION_CODE);
            await this.page.getByRole('button', { name: /apply code/i }).click();
            await this.page.getByRole('button', { name: /got it/i }).click();
        }
    }

    // Pick the tag's Marketplace categories (1-3 required) in the Select categories dialog
    async selectCategories(categories = ['Technology']){
        await this.page.locator('#macro-categories').click();
        const dialog = this.page.locator('.synctag-global-modal.show').filter({ hasText: 'Select categories' });
        for (const category of categories) {
            await dialog.getByText(category, { exact: true }).click();
        }
        await dialog.getByRole('button', { name: /apply/i }).click();
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
        await this.selectCategories();
    }

    // Switch the tag from Free to Monetize and set its sell price (INR). Only the buyer
    // pays this price later - the creator never goes through checkout for their own tag.
    async setMonetized(price){
        await this.page.locator('label.monetize-option', { hasText: 'Monetize' }).click();
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
    // With the FREE invitation applied, saving instead shows a "Use a free global tag" dialog
    // and the tag is created without any payment.
    async completeTriggerNameCostCheckout(){
        const createForFree = this.page.getByRole('button', { name: /create for free/i });
        const confirmPayment = this.page.getByText('Confirm Payment');
        await expect(createForFree.or(confirmPayment)).toBeVisible(TIMEOUT);
        if (await createForFree.isVisible()) {
            // The server rate-limits Marketplace tag creation per account (HTTP 429 with a
            // Retry-After of many hours), and the app then silently stays on the Create Tag page.
            // Fail fast with a clear reason instead of a "tag not found" timeout later on.
            const rateLimited = this.page.waitForResponse(response =>
                response.url().includes('/api/gateway')
                && response.request().method() === 'POST'
                && response.status() === 429, TIMEOUT).catch(() => null);
            const created = this.page.waitForURL(url => !url.pathname.includes('/create'), TIMEOUT).then(() => null).catch(() => null);
            await createForFree.click();

            const limitedResponse = await Promise.race([created, rateLimited]);
            if (limitedResponse) {
                await this.page.waitForTimeout(2000);
                if (this.page.url().includes('/create')) {
                    const retryAfter = Number(limitedResponse.headers()['retry-after']);
                    const retryHint = Number.isFinite(retryAfter)
                        ? ` Retry after about ${(retryAfter / 3600).toFixed(1)} hours.`
                        : '';
                    throw new Error(`Marketplace tag creation was rate-limited by the server (HTTP 429), so the tag was not created.${retryHint}`);
                }
            }
            return;
        }
        await expect(confirmPayment).toBeVisible(TIMEOUT);
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
        await this.page.getByRole('listbox', { name: 'Select API method' }).getByRole('option', { name: method, exact: true }).click();
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
    // The Marketplace is paginated (20 tags a page), so this scans up to maxPages pages.
    async findCheapestPurchasableTag(maxPages = 10){
        await this.goToMarketplace();
        await this.verifyPageOpened();

        const allCards = this.page.locator('.macro-card.global-macro');
        const cards = allCards.filter({
            has: this.page.getByRole('button', { name: 'Buy' }),
        });
        await expect(allCards.first()).toBeVisible(TIMEOUT);

        let cheapest = null;
        for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
            const count = await cards.count();
            for (let i = 0; i < count; i++) {
                const card = cards.nth(i);
                const priceText = await card.locator('.macro-footer-purchase span').first().innerText();
                const price = Number(priceText.replace(/[^\d.]/g, ''));
                if (Number.isFinite(price) && (!cheapest || price < cheapest.price)) {
                    const triggerText = await card.locator('.macro-trigger-value').innerText();
                    cheapest = { price, trigger: triggerText.replace(/^\$/, '') };
                }
            }

            const nextButton = this.page.getByRole('button', { name: 'Next' });
            if (await nextButton.isDisabled()) {
                break;
            }
            const firstTrigger = await allCards.first().locator('.macro-trigger-value').innerText();
            await nextButton.click();
            await expect(allCards.first().locator('.macro-trigger-value')).not.toHaveText(firstTrigger, TIMEOUT);
        }

        if (!cheapest) {
            throw new Error('No purchasable Global Tag was found in the Marketplace.');
        }
        return cheapest;
    }

    // Click Buy on a specific tag (by trigger) from the Marketplace, opening the Razorpay checkout.
    // Searches for the trigger first, since the tag may not be on the first Marketplace page.
    async clickBuyForTrigger(trigger){
        await this.goToMarketplace();
        await this.page.getByPlaceholder('Search by name, trigger, tag, category or group...').fill(trigger);
        const card = this.page.locator('.macro-card.global-macro').filter({ hasText: `$${trigger}` });
        await card.getByRole('button', { name: 'Buy' }).click();
        await this.page.getByRole('button', { name: /continue to payment/i }).click();
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
        // Continue normally brings up Razorpay's "save this card?" prompt (dismissed with Maybe
        // later) or opens the bank-simulation popup directly. Razorpay sometimes ignores the
        // first Continue click, so click it again if neither shows up.
        let bankWindow = null;
        const popupPromise = this.page.waitForEvent('popup', TIMEOUT).then(p => (bankWindow = p)).catch(() => null);
        const continueButton = frame.getByRole('button', { name: 'Continue' });
        const maybeLater = frame.getByRole('button', { name: 'Maybe later' });
        for (let attempt = 1; attempt <= 3 && !bankWindow; attempt++) {
            await continueButton.click();
            const promptShown = await maybeLater.waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
            if (promptShown) {
                await maybeLater.click();
                break;
            }
        }

        // Approve the payment in Razorpay's test-mode bank simulation
        await popupPromise;
        if (bankWindow) {
            await bankWindow.locator('button.success').click();
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
        await expect(this.page.getByRole('heading', { name: 'Payment complete' })).toBeVisible(TIMEOUT);
        await this.page.getByRole('button', { name: 'Stay here' }).click();
        await this.goToMyGlobalTags('Purchased');
        const card = this.page.locator('.macro-card').filter({ hasText: `$${trigger}` });
        await expect(card).toBeVisible(TIMEOUT);
        await expect(card.getByText('Purchased')).toBeVisible(TIMEOUT);
    }

    // Verify a newly created tag is visible under My Global Tags, optionally checking the
    // type badge (Text, AI, API, File, ...) shown on the card
    async verifyTagCreated(trigger, type){
        await this.goToMyGlobalTags('My Listings');
        const card = this.page.locator('.macro-card').filter({ hasText: `$${trigger}` });
        await expect(card).toBeVisible(TIMEOUT);
        if (type) {
            await expect(card.locator('.macro-type')).toHaveText(new RegExp(type, 'i'), TIMEOUT);
        }
    }

    // ---- Editing a created tag (Marketplace tags can be updated but not deleted) ----

    // Open a tag's editor from its card under My Listings
    async openTagEditor(trigger){
        await this.goToMyGlobalTags('My Listings');
        await this.page.locator('.macro-card').filter({ hasText: `$${trigger}` }).locator('h3.macro-name').click();
        await expect(this.page.locator('h2')).toHaveText('Edit Tag', TIMEOUT);
    }

    // Apply an edit and click Update; the app returns to My Listings once the update is saved
    async editAndSave(trigger, description, applyEdit){
        await this.openTagEditor(trigger);
        await applyEdit();
        await this.saveTag(trigger, description);
        await expect(this.page).not.toHaveURL(/\/tags\/edit\//, TIMEOUT);
    }

    // Update a Text tag's description and content, then save
    async editTextTag(trigger, description, content){
        await this.editAndSave(trigger, description, async () => {
            await this.page.locator('#macro-name').fill(description);
            await this.page.locator('#macro-body-editor .ql-editor').click();
            await this.page.keyboard.press('Control+A');
            await this.page.keyboard.type(content);
            await this.clearSelection();
        });
    }

    // Update an AI tag's description and prompt data, then save
    async editAiTag(trigger, description, promptData){
        await this.editAndSave(trigger, description, async () => {
            await this.page.locator('#macro-name').fill(description);
            await this.page.locator('#macro-prompt-data-editor').fill(promptData);
        });
    }

    // Update an API tag's description and URL, re-run the test call, then save
    async editApiTag(trigger, description, url){
        await this.editAndSave(trigger, description, async () => {
            await this.page.locator('#macro-name').fill(description);
            await this.page.locator('#api-url').fill(url);
            await this.page.locator('#api-test-btn').click();
            await expect(this.page.locator('#api-response-preview')).toContainText('200 OK', TIMEOUT);
        });
    }

    // Update a File tag's description and attach another file, then save
    async editFileTag(trigger, description, filePath){
        await this.editAndSave(trigger, description, async () => {
            await this.page.locator('#macro-name').fill(description);
            await this.page.locator('#filetag-file-input-inline').setInputFiles(filePath);
        });
    }

    // Verify a tag's card under My Listings shows its updated description
    async verifyTagUpdated(trigger, description){
        await this.goToMyGlobalTags('My Listings');
        const card = this.page.locator('.macro-card').filter({ hasText: `$${trigger}` });
        await expect(card.locator('h3.macro-name')).toHaveText(description, TIMEOUT);
    }

}
