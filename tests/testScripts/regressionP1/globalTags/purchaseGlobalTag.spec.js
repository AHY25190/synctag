const { test } = require('../../../fixtures/extensionFixture');
const { GlobalTags, RAZORPAY_TEST_CARDS } = require('../../../pages/globalTags');
const { Signin } = require('../../../pages/signIn');

// Razorpay's checkout runs against its real (test mode) infrastructure, including live
// anti-fraud checks, so this test can be flakier than the rest of the suite - retry before
// treating a failure here as a real regression.
test('Purchase a Global tag from the Marketplace via Razorpay (test mode)', async ({ page }) => {
    const globalTags = new GlobalTags(page);
    const signIn = new Signin(page);

    await signIn.verifySignedIn('johnfigerro@gmail.com');
    await globalTags.open();
    await globalTags.verifyPageOpened();

    let cheapest;
    await test.step('Find the cheapest purchasable tag in the Marketplace', async () => {
        cheapest = await globalTags.findCheapestPurchasableTag();
    });

    await test.step('Buy the tag with a Razorpay test card', async () => {
        await globalTags.clickBuyForTrigger(cheapest.trigger);
        await globalTags.payWithTestCard(RAZORPAY_TEST_CARDS.oneTime);
    });

    await test.step('Verify the tag now shows as purchased', async () => {
        await globalTags.verifyTagPurchased(cheapest.trigger);
    });
});
