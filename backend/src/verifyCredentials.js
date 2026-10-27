import { getAccessToken } from './paypalClient.js';
import dotenv from 'dotenv';
dotenv.config();

console.log('==============================================');
console.log('  PayPal Sandbox Credentials Verifier');
console.log('==============================================');
console.log(`Environment: ${process.env.PAYPAL_ENVIRONMENT || 'sandbox'}`);
console.log(`Client ID:   ${process.env.PAYPAL_CLIENT_ID ? process.env.PAYPAL_CLIENT_ID.substring(0, 8) + '...' : 'NOT SET'}`);
console.log('Testing authentication against api-m.sandbox.paypal.com...\n');

try {
  const token = await getAccessToken();
  console.log('✅ SUCCESS! Authentication successful!');
  console.log(`Access Token acquired (length: ${token.length})`);
  console.log('Your PayPal Sandbox credentials are valid and ready to process payments.\n');
  process.exit(0);
} catch (err) {
  console.error('❌ AUTHENTICATION FAILED:');
  console.error(err.message);
  console.log('\n👉 Instructions to fix:');
  console.log('1. Go to https://developer.paypal.com/dashboard/applications/sandbox');
  console.log('2. Copy your Sandbox Client ID and Client Secret');
  console.log('3. Paste them into backend/.env:');
  console.log('   PAYPAL_CLIENT_ID=...');
  console.log('   PAYPAL_CLIENT_SECRET=...\n');
  process.exit(1);
}
