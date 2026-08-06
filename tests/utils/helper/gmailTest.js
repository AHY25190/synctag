const Imap = require("imap");
const { simpleParser } = require("mailparser");

const imap = new Imap({
  user: "ydtest22@gmail.com",
  password: "pxod wxjx ckrm zwao",   // Google App Password
  host: "imap.gmail.com",
  port: 993,
  tls: true,
  tlsOptions: {
    rejectUnauthorized: false
  }
});

function openInbox(cb) {
  imap.openBox("INBOX", false, cb);
}

imap.once("ready", function () {

  console.log("Connected to Gmail mailbox");

  openInbox(function (err, box) {

    if (err) throw err;

    imap.search(["ALL"], function (err, results) {

      if (err) throw err;

      if (!results.length) {
        console.log("No emails found");
        return;
      }

      const latestEmail = results.slice(-1);

      const fetch = imap.fetch(latestEmail, { bodies: "" });

      fetch.on("message", function (msg) {

        msg.on("body", function (stream) {

          simpleParser(stream, (err, parsed) => {

            if (err) throw err;

            console.log("\nSubject:", parsed.subject);
            console.log("From:", parsed.from.text);
            console.log("Body:", parsed.text);

            imap.end();

          });

        });

      });

    });

  });

});

imap.once("error", function (err) {
  console.log("Error:", err);
});

imap.once("end", function () {
  console.log("Connection ended");
});

imap.connect();