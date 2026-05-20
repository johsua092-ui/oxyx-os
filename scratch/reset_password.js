// Quick script to reset password via Firebase Admin SDK
// Run: node scratch/reset_password.js

const admin = require('firebase-admin');

// Initialize with service account
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function resetPassword() {
  const email = 'johsua092@gmail.com';
  const newPassword = 'OxyxOwner2026!'; // Temporary password — change after login!
  
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, { password: newPassword });
    console.log(`✅ Password reset for ${email}`);
    console.log(`New password: ${newPassword}`);
    console.log('⚠️  Change this password after login!');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

resetPassword();
