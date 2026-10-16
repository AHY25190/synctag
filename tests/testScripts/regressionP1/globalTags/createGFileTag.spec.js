const path = require('path');
const { test } = require('@playwright/test');
const { GlobalTags } = require('../../../pages/globalTags');
const { Signin } = require('../../../pages/signIn');

const FILE_TAG_PATH = path.join(__dirname, '../../../utils/uploadfiles/testPdf.pdf');

test('Create a monetized Global File tag and pay its Trigger Name Cost via Razorpay (test mode)', async ({ page }) => {
    const globalTags = new GlobalTags(page);
    const signIn = new Signin(page);
    const trigger = `gFileTag${Date.now()}`;

    await signIn.verifySignedIn('johnfigerro@gmail.com');
    await globalTags.open();
    await globalTags.verifyPageOpened();

    await test.step('Fill out and save a monetized File tag', async () => {
        await globalTags.clickCreateGlobalTag();
        await globalTags.createFileTag(trigger, 'Regression Global File tag', FILE_TAG_PATH, 1);
    });

    await test.step('Pay the mandatory Trigger Name Cost via Razorpay (test mode)', async () => {
        await globalTags.completeTriggerNameCostCheckout();
    });

    await test.step('Verify the tag was created', async () => {
        await globalTags.verifyTagCreated(trigger, 'File');
    });
});
