const { test } = require('@playwright/test');
const { MyTags } = require('../../pages/myTags');

test('My Tags page opens, and a tag can be created and deleted', async ({ page }) => {
    const myTags = new MyTags(page);
    const trigger = `smoketest${Date.now()}`;

    await test.step('Open My Tags', async () => {
        await page.goto('/tags');
        await myTags.verifyPageOpened();
    });

    await test.step('Create a new tag', async () => {
        await myTags.clickNewTag();
        await myTags.createTag(trigger, 'Smoke test tag description', 'Smoke test tag content');
        await myTags.verifyTagCreated(trigger);
    });

    await test.step('Delete the tag', async () => {
        await myTags.deleteTag(trigger);
        await myTags.verifyTagDeleted(trigger);
    });
});
