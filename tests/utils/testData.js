const FIRST_NAMES = ['John', 'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Taylor'];

// { name, iso: country code used to search the dropdown, dataValue: option's data-value attribute }
const COUNTRIES = [
    { name: 'United States', dataValue: 'US' },
    { name: 'United Kingdom', dataValue: 'GB' },
    { name: 'Australia', dataValue: 'AU' },
    { name: 'Canada', dataValue: 'CA' },
    { name: 'Singapore', dataValue: 'SG' },
    { name: 'Germany', dataValue: 'DE' },
];

function randomFrom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function randomPhoneNumber() {
    const firstDigit = 6 + Math.floor(Math.random() * 4); // 6-9, mobile-style leading digit
    let rest = '';
    for (let i = 0; i < 9; i++) {
        rest += Math.floor(Math.random() * 10);
    }
    return `${firstDigit}${rest}`;
}

// Random 3-4 digit number, appended to names to keep each run's tag/display name unique
function randomDigits() {
    const length = Math.random() < 0.5 ? 3 : 4;
    const min = 10 ** (length - 1);
    const max = 10 ** length;
    return String(min + Math.floor(Math.random() * (max - min)));
}

// Builds a fresh, random registration payload, including a unique mailinator inbox/email
exports.generateTestUser = function generateTestUser() {
    const inboxName = `synctagqa${Date.now()}${Math.floor(Math.random() * 1000)}`;
    return {
        firstName: `${randomFrom(FIRST_NAMES)}${randomDigits()}`,
        lastName: `${randomFrom(LAST_NAMES)}${randomDigits()}`,
        inboxName,
        email: `${inboxName}@mailinator.com`,
        country: randomFrom(COUNTRIES),
        phoneNumber: randomPhoneNumber(),
    };
};
