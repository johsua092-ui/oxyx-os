const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testKey(keyName, keyValue) {
  if (!keyValue) {
    console.log(`${keyName} is missing.`);
    return;
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${keyValue}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Hi' }] }]
      })
    });
    const status = res.status;
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log(`✅ ${keyName} is VALID! Status: ${status}`);
    } else {
      console.log(`❌ ${keyName} is INVALID! Status: ${status}, Message:`, data.error?.message || res.statusText);
    }
  } catch (err) {
    console.log(`💥 ${keyName} error:`, err.message);
  }
}

async function run() {
  for (let i = 1; i <= 6; i++) {
    const name = `GEMINI_API_KEY_${i}`;
    await testKey(name, process.env[name]);
  }
}

run();
