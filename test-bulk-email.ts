/**
 * Test bulk enrichment endpoint to verify reveal_email parameter
 *
 * Usage: npx tsx test-bulk-email.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

const APOLLO_API_KEY = process.env.APOLLO_API_KEY!;
const PERSON_ID = '66f6bde593fdfd0001c57501';

async function testBulkEnrichment() {
  console.log('🔍 Testing Apollo Bulk Enrichment');
  console.log('=====================================\n');

  try {
    const url = `https://api.apollo.io/api/v1/people/bulk_match`;

    // Test 1: WITHOUT reveal_email
    console.log('Test 1: WITHOUT reveal_email parameter');
    console.log('---------------------------------------');
    const body1 = {
      details: [
        {
          id: PERSON_ID,
        }
      ],
    };

    console.log('Request body:', JSON.stringify(body1, null, 2));

    const response1 = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Api-Key': APOLLO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body1),
    });

    const data1 = await response1.json();

    if (data1.matches && data1.matches.length > 0) {
      const match = data1.matches[0];
      console.log('\nResult:');
      console.log('  email:', match.email);
      console.log('  personal_emails:', match.personal_emails);

      if (match.email?.includes('email_not_unlocked')) {
        console.log('  ❌ Email is LOCKED (as expected without reveal_email)');
      } else {
        console.log('  ✅ Email revealed');
      }
    }

    console.log('\n\n');

    // Test 2: WITH reveal_email as query parameter
    console.log('Test 2: WITH reveal_email as query parameter');
    console.log('---------------------------------------------');

    const url2 = `${url}?reveal_email=true`;

    console.log('URL:', url2);
    console.log('Request body:', JSON.stringify(body1, null, 2));

    const response2 = await fetch(url2, {
      method: 'POST',
      headers: {
        'X-Api-Key': APOLLO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body1),
    });

    const data2 = await response2.json();

    if (data2.matches && data2.matches.length > 0) {
      const match = data2.matches[0];
      console.log('\nResult:');
      console.log('  email:', match.email);
      console.log('  personal_emails:', match.personal_emails);

      if (match.email?.includes('email_not_unlocked')) {
        console.log('  ❌ Email is still LOCKED');
      } else {
        console.log('  ✅ Email revealed!');
      }
    }

    console.log('\n\n');

    // Test 3: WITH reveal_email in request body
    console.log('Test 3: WITH reveal_email in request body');
    console.log('------------------------------------------');

    const body3 = {
      reveal_email: true,
      details: [
        {
          id: PERSON_ID,
        }
      ],
    };

    console.log('Request body:', JSON.stringify(body3, null, 2));

    const response3 = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Api-Key': APOLLO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body3),
    });

    const data3 = await response3.json();

    if (data3.matches && data3.matches.length > 0) {
      const match = data3.matches[0];
      console.log('\nResult:');
      console.log('  email:', match.email);
      console.log('  personal_emails:', match.personal_emails);

      if (match.email?.includes('email_not_unlocked')) {
        console.log('  ❌ Email is still LOCKED');
      } else {
        console.log('  ✅ Email revealed!');
      }
    }

    console.log('\n\n');

    // Test 4: Check our current code's approach
    console.log('Test 4: Current code approach (params in axios config)');
    console.log('-------------------------------------------------------');
    console.log('This is how our ApolloService sends it via axios params');
    console.log('URL would be built as: /people/bulk_match?reveal_email=true&reveal_personal_emails=true');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

testBulkEnrichment();
