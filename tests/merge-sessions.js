const fs = require('fs');
const path = require('path');

const orufySession = JSON.parse(fs.readFileSync(path.join(__dirname, '../json\'s/beta-orufy-session.json'), 'utf-8'));
const gmailSession = JSON.parse(fs.readFileSync(path.join(__dirname, '../json\'s/gmail-session.json'), 'utf-8'));

// Merge cookies
const combinedCookies = [...orufySession.cookies, ...gmailSession.cookies];

// Merge origins/localStorage
const combinedOrigins = [...orufySession.origins, ...gmailSession.origins];

// Final merged session
const merged = {
  cookies: combinedCookies,
  origins: combinedOrigins
};

fs.writeFileSync(path.join(__dirname, '../json\'s/combined-session.json'), JSON.stringify(merged, null, 2));
console.log('✅ Merged session saved as combined-session.json');
