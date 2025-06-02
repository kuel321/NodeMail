const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const express = require('express');
const cors = require('cors');

require('dotenv').config();


const app = express();
app.use(cors());
const PORT = 3000;

// Reusable function to fetch emails
async function fetchUpdatesEmails() {
    const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
       auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
}

    });

    await client.connect();
    let result = [];

    let lock = await client.getMailboxLock('INBOX');
    try {
        let messages = await client.search({
            gmailRaw: 'category:updates is:unread'
        });

        let recentMessages = messages.slice(-10);

        for await (let message of client.fetch(recentMessages, { envelope: true, source: true })) {
            const parsed = await simpleParser(message.source);
            result.push({
                from: parsed.from.text,
                subject: parsed.subject,
                snippet: parsed.text?.substring(0, 100),
                full_text: parsed.text,
                html: parsed.html
            });
        }
    } finally {
        lock.release();
        await client.logout();
    }

    return result;
}

// API route to trigger fetching
app.get('/check-emails', async (req, res) => {
    try {
        const emails = await fetchUpdatesEmails();
        res.json(emails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch emails' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Email API running on port ${PORT}`);
});