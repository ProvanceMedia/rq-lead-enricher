/**
 * Check Apollo account credits and email revelation status
 */

import * as dotenv from 'dotenv';
dotenv.config();

const APOLLO_API_KEY = process.env.APOLLO_API_KEY!;

async function checkCredits() {
  console.log('🔍 Checking Apollo Account Credits\n');

  try {
    // Get account info including credits
    const response = await fetch('https://api.apollo.io/v1/auth/health', {
      headers: {
        'X-Api-Key': APOLLO_API_KEY,
      },
    });

    const data = await response.json();
    console.log('Account Info:', JSON.stringify(data, null, 2));

    // Also try to get email credit info
    const creditResponse = await fetch('https://api.apollo.io/v1/email_accounts', {
      headers: {
        'X-Api-Key': APOLLO_API_KEY,
      },
    });

    const creditData = await creditResponse.json();
    console.log('\nEmail Credits:', JSON.stringify(creditData, null, 2));

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

checkCredits();
