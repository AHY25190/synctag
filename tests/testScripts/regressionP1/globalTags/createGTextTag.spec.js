const { test } = require('@playwright/test');
const { GlobalTags } = require('../../../pages/globalTags');
const { Signin } = require('../../../pages/signIn');

test('Create a monetized Global Text tag and pay its Trigger Name Cost via Razorpay (test mode)', async ({ page }) => {
    const globalTags = new GlobalTags(page);
    const signIn = new Signin(page);
    const trigger = `gTextTag${Date.now()}`;

    await signIn.verifySignedIn('johnfigerro@gmail.com');
    await globalTags.open();
    await globalTags.verifyPageOpened();

    await test.step('Fill out and save a monetized Text tag', async () => {
        await globalTags.clickCreateGlobalTag();
        await globalTags.createTextTag(trigger, 'Regression Global Text tag', 'This is a Global Text tag created by regression automation.', 1);
    });

    await test.step('Pay the mandatory Trigger Name Cost via Razorpay (test mode)', async () => {
        await globalTags.completeTriggerNameCostCheckout();
    });

    await test.step('Verify the tag was created', async () => {
        await globalTags.verifyTagCreated(trigger, 'Text');
    });
});
