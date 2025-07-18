const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const CREDENTIALS_PATH = path.join(__dirname, '../json\'s/credentials.json');
const TOKEN_PATH = path.join(__dirname, '../json\'s/token.json');

// Acceptable freshness in ms
const FRESHNESS_THRESHOLD = 60 * 1000; // 60 seconds

function getOtpFromGmail() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(CREDENTIALS_PATH)) return reject('❌ credentials.json not found.');

    fs.readFile(CREDENTIALS_PATH, (err, content) => {
      if (err) return reject('❌ Error reading credentials.json');
      authorize(JSON.parse(content));
    });

    function authorize(credentials) {
      const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
      const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

      if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
        oAuth2Client.setCredentials(token);
        retryFetch(oAuth2Client);
      } else {
        getNewToken(oAuth2Client);
      }
    }

    function getNewToken(oAuth2Client) {
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
      });
      console.log('🔐 Authorize this app by visiting:\n', authUrl);
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question('Paste the code from that page here:\n', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
          if (err) return reject('❌ Error retrieving token.');
          oAuth2Client.setCredentials(token);
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
          retryFetch(oAuth2Client);
        });
      });
    }

    async function retryFetch(auth) {
      const maxRetries = 5;
      const delayMs = 4000;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`⏳ Attempt ${attempt} to fetch OTP...`);
        try {
          const { otp, ageMs } = await fetchOtp(auth);
          if (ageMs <= FRESHNESS_THRESHOLD) {
            console.log(`✅ OTP is fresh (age ${Math.floor(ageMs / 1000)}s): ${otp}`);
            return resolve(otp);
          } else {
            console.log(`⚠️ OTP too old (${Math.floor(ageMs / 1000)}s ago). Retrying...`);
          }
        } catch (err) {
          console.warn(`⚠️ Fetch attempt failed: ${err}`);
        }
        await new Promise(res => setTimeout(res, delayMs));
      }

      reject("❌ Failed to fetch a fresh OTP after retries.");
    }

    async function fetchOtp(auth) {
      const gmail = google.gmail({ version: 'v1', auth });

      const res = await gmail.users.messages.list({
        userId: 'me',
        q: 'from:info@orufy.com subject:Otp newer_than:1d',
        maxResults: 1,
      });

      const messageId = res.data.messages?.[0]?.id;
      if (!messageId) throw "❌ No OTP email found.";

      const msg = await gmail.users.messages.get({ userId: 'me', id: messageId });
      const payload = msg.data.payload;
      const internalDate = parseInt(msg.data.internalDate); // UNIX time in ms
      const ageMs = Date.now() - internalDate;

      let rawData = '';
      if (payload.parts) {
        const plain = payload.parts.find(p => p.mimeType === 'text/plain');
        const html = payload.parts.find(p => p.mimeType === 'text/html');
        rawData = plain?.body?.data || html?.body?.data;
      } else {
        rawData = payload.body?.data;
      }

      if (!rawData) throw "❌ Email body not found.";

      const base64 = rawData.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = Buffer.from(base64, 'base64').toString('utf-8');

      const match = decoded.match(/\b[A-Z0-9]{5}\b/);
      if (!match) throw "❌ OTP not found in email.";

      return { otp: match[0], ageMs };
    }
  });
}

module.exports = { getOtpFromGmail };
