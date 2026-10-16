const { test } = require('@playwright/test');
const { GlobalTags } = require('../../../pages/globalTags');
const { Signin } = require('../../../pages/signIn');

test('Create and update a monetized Global API tag', async ({ page }) => {
    const globalTags = new GlobalTags(page);
    const signIn = new Signin(page);
    const trigger = `gApiTag${Date.now()}`;

    await signIn.verifySignedIn('johnfigerro@gmail.com');
    await globalTags.open();
    await globalTags.verifyPageOpened();

    await test.step('Fill out and save a monetized API tag', async () => {
        await globalTags.clickCreateGlobalTag();
        await globalTags.createApiTag(trigger, 'Regression Global API tag', 'GET', 'https://jsonplaceholder.typicode.com/todos/1', 1);
    });

    await test.step('Pay the mandatory Trigger Name Cost via Razorpay (test mode)', async () => {
        await globalTags.completeTriggerNameCostCheckout();
    });

    await test.step('Verify the tag was created', async () => {
        await globalTags.verifyTagCreated(trigger, 'API');
    });

    await test.step('Edit the tag', async () => {
        await globalTags.editApiTag(trigger, 'Regression Global API tag (edited)', 'https://jsonplaceholder.typicode.com/todos/2');
    });

    await test.step('Verify the tag was updated', async () => {
        await globalTags.verifyTagUpdated(trigger, 'Regression Global API tag (edited)');
    });
});
