const Imap = require("imap");
const { simpleParser } = require("mailparser");
const { expect } = require('@playwright/test');

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatImapDate(date) {
  const day = String(date.getDate());
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function getDefaultImapConfig() {
  return {
    user: "johnfigerro@gmail.com",
    password: "pzpi djli pgnn iyrp",
    host: "imap.gmail.com",
    port: Number(993),
    tls: true,
    authTimeout: 30000, // 30 seconds
    connTimeout: 30000,
    tlsOptions: {
      rejectUnauthorized: false
    }
  };
}

function normalizeIncludes(value) {
  return (value || "").toLowerCase();
}

function normalizeTextContent(value) {
  return normalizeIncludes(value).replace(/\s+/g, " ").trim();
}

function addressMatches(addressField, containsValue) {
  if (!containsValue) return true;
  if (!addressField || !Array.isArray(addressField.value)) return false;

  const needles = Array.isArray(containsValue) ? containsValue : [containsValue];
  return needles.every((value) => {
    const needle = normalizeIncludes(value);
    return addressField.value.some((entry) => {
      const address = normalizeIncludes(entry.address);
      const name = normalizeIncludes(entry.name);
      return address.includes(needle) || name.includes(needle);
    });
  });
}

function textMatches(text, containsValue) {
  if (!containsValue) return true;
  const haystack = normalizeTextContent(text);
  const needles = Array.isArray(containsValue) ? containsValue : [containsValue];
  return needles.every((value) => haystack.includes(normalizeTextContent(value)));
}

function messageMatches(parsed, filters) {
  const { subjectContains, bodyContains, fromContains, toContains } = filters;
  return (
    textMatches(parsed.subject, subjectContains) &&
    textMatches(parsed.text, bodyContains) &&
    addressMatches(parsed.from, fromContains) &&
    addressMatches(parsed.to, toContains)
  );
}

function parseMessage(stream) {
  return new Promise((resolve, reject) => {
    simpleParser(stream, (parseErr, parsed) => {
      if (parseErr) {
        reject(parseErr);
        return;
      }

      resolve(parsed);
    });
  });
}

function isAfterDate(mailDate, dateNow) {
  if (!(dateNow instanceof Date)) return true;
  if (!mailDate) return false;
  return new Date(mailDate).getTime() >= dateNow.getTime();
}

function fetchLatestMatchingEmailOnce(options) {
  const {
    imapConfig,
    mailbox = "INBOX",
    since,
    dateNow,
    unseenOnly = false,
    maxFetch = 10,
    subjectContains,
    bodyContains,
    fromContains,
    toContains
  } = options;

  return new Promise((resolve, reject) => {
    const client = new Imap(imapConfig);
    let settled = false;
    const parseTasks = [];

    const safeResolve = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const safeReject = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    client.once("ready", () => {
      client.openBox(mailbox, true, (openErr) => {
        if (openErr) {
          client.end();
          safeReject(openErr);
          return;
        }

        const criteria = [];
        if (unseenOnly) criteria.push("UNSEEN");
        else criteria.push("ALL");
        if (since instanceof Date) criteria.push(["SINCE", formatImapDate(since)]);

        client.search(criteria, (searchErr, results) => {
          if (searchErr) {
            client.end();
            safeReject(searchErr);
            return;
          }

          if (!results || results.length === 0) {
            client.end();
            safeResolve(null);
            return;
          }

          const uids = results.slice(-maxFetch);
          const fetch = client.fetch(uids, { bodies: "" });

          fetch.on("message", (msg) => {
            msg.on("body", (stream) => {
              parseTasks.push(parseMessage(stream));
            });
          });

          fetch.once("error", (fetchErr) => {
            client.end();
            safeReject(fetchErr);
          });

          fetch.once("end", async () => {
            try {
              const parsedEmails = await Promise.all(parseTasks);
              const matches = parsedEmails
                .filter((mail) => isAfterDate(mail.date, dateNow))
                .filter((mail) =>
                  messageMatches(mail, { subjectContains, bodyContains, fromContains, toContains })
                )
                .sort((a, b) => {
                  const aTime = a.date ? new Date(a.date).getTime() : 0;
                  const bTime = b.date ? new Date(b.date).getTime() : 0;
                  return bTime - aTime;
                });

              client.end();
              safeResolve(matches[0] || null);
            } catch (parseErr) {
              client.end();
              safeReject(parseErr);
            }
          });
        });
      });
    });

    client.once("error", (error) => {
      safeReject(error);
    });

    client.connect();
  });
}

async function waitForLatestEmail(options = {}) {
  const {
    dateNow,
    timeoutMs = 60000,
    pollIntervalMs = 10000,
    mailReceived = true,
    since = dateNow instanceof Date ? dateNow : new Date(Date.now() - 60 * 1000),
    imapConfig = getDefaultImapConfig()
  } = options;

  if (!imapConfig.user || !imapConfig.password) {
    throw new Error("Missing IMAP credentials. Set GMAIL_IMAP_USER and GMAIL_IMAP_PASSWORD.");
  }

  const started = Date.now();
  while (Date.now() - started <= timeoutMs) {
    let mail = null;

    try {
      mail = await fetchLatestMatchingEmailOnce({
        ...options,
        since,
        dateNow,
        imapConfig
      });
    } catch (err) {
      console.warn("IMAP connection failed, retrying...", err.message);
    }
    if (mail) return mail;
    await sleep(pollIntervalMs);
  }

  if (mailReceived) {
    await expect.soft(
      mailReceived,
      `Expected to receive an email matching criteria within ${timeoutMs} ms, but did not.`
    ).toBeTruthy();
  } else {
    console.warn(`No matching email received within ${timeoutMs} ms`);
  }

  return null;
}

module.exports = {
  fetchLatestMatchingEmailOnce,
  waitForLatestEmail
};
