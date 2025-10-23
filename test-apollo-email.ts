/**
 * Test script to fetch a specific Apollo person and verify email revelation
 *
 * Usage: npx tsx test-apollo-email.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

const APOLLO_API_KEY = process.env.APOLLO_API_KEY!;
const PERSON_ID = '66f6bde593fdfd0001c57501';

async function testApolloEmailRevelation() {
  console.log('🔍 Testing Apollo Email Revelation');
  console.log('=====================================\n');
  console.log(`Person ID: ${PERSON_ID}\n`);

  try {
    // Method 1: People Match endpoint (for enriching by email)
    console.log('📧 Method 1: People Match (by email)');
    console.log('-------------------------------------');

    const matchUrl = `https://api.apollo.io/v1/people/match`;
    const matchBody = {
      id: PERSON_ID,
      reveal_email: true,
      reveal_personal_emails: true,
    };

    console.log('Request:', JSON.stringify(matchBody, null, 2));

    const matchResponse = await fetch(matchUrl, {
      method: 'POST',
      headers: {
        'X-Api-Key': APOLLO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(matchBody),
    });

    const matchData = await matchResponse.json();

    console.log('\nResponse Status:', matchResponse.status);
    console.log('\nFull Response:', JSON.stringify(matchData, null, 2));

    if (matchData.person) {
      const person = matchData.person;
      console.log('\n✅ Extracted Email Data:');
      console.log('  email:', person.email);
      console.log('  personal_emails:', person.personal_emails);
      console.log('  email_status:', person.email_status);
      console.log('  contact_email_status:', person.contact_email_status);

      // Check if email is still locked
      if (person.email?.includes('email_not_unlocked')) {
        console.log('\n⚠️  Email is still locked!');
        console.log('   Possible reasons:');
        console.log('   1. Out of credits');
        console.log('   2. Plan doesn\'t support email revelation');
        console.log('   3. Email is not available for this contact');
      } else {
        console.log('\n✅ Email successfully revealed!');
      }
    }

    console.log('\n\n');

    // Method 2: Enrich endpoint (alternative method)
    console.log('📧 Method 2: Enrich endpoint');
    console.log('-------------------------------------');

    const enrichUrl = `https://api.apollo.io/v1/people/enrich`;
    const enrichBody = {
      id: PERSON_ID,
      reveal_email: true,
      reveal_personal_emails: true,
    };

    console.log('Request:', JSON.stringify(enrichBody, null, 2));

    const enrichResponse = await fetch(enrichUrl, {
      method: 'POST',
      headers: {
        'X-Api-Key': APOLLO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enrichBody),
    });

    const enrichData = await enrichResponse.json();

    console.log('\nResponse Status:', enrichResponse.status);
    console.log('\nFull Response:', JSON.stringify(enrichData, null, 2));

    if (enrichData.person) {
      const person = enrichData.person;
      console.log('\n✅ Extracted Email Data:');
      console.log('  email:', person.email);
      console.log('  personal_emails:', person.personal_emails);
      console.log('  email_status:', person.email_status);
      console.log('  contact_email_status:', person.contact_email_status);

      // Check if email is still locked
      if (person.email?.includes('email_not_unlocked')) {
        console.log('\n⚠️  Email is still locked!');
        console.log('   Possible reasons:');
        console.log('   1. Out of credits');
        console.log('   2. Plan doesn\'t support email revelation');
        console.log('   3. Email is not available for this contact');
      } else {
        console.log('\n✅ Email successfully revealed!');
      }
    }

    console.log('\n\n');

    // Method 3: Bulk enrichment (what we use in production)
    console.log('📧 Method 3: Bulk Enrichment');
    console.log('-------------------------------------');

    const bulkUrl = `https://api.apollo.io/api/v1/people/bulk_match`;
    const bulkBody = {
      reveal_personal_emails: true,
      reveal_phone_number: false, // Don't reveal phone to avoid webhook
      details: [
        {
          id: PERSON_ID,
        }
      ],
    };

    console.log('Request:', JSON.stringify(bulkBody, null, 2));

    const bulkResponse = await fetch(bulkUrl, {
      method: 'POST',
      headers: {
        'X-Api-Key': APOLLO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bulkBody),
    });

    const bulkData = await bulkResponse.json();

    console.log('\nResponse Status:', bulkResponse.status);
    console.log('\nFull Response:', JSON.stringify(bulkData, null, 2));

    if (bulkData.matches && bulkData.matches.length > 0) {
      const match = bulkData.matches[0];
      console.log('\n✅ Extracted Email Data:');
      console.log('  email:', match.email);
      console.log('  personal_emails:', match.personal_emails);
      console.log('  email_status:', match.email_status);
      console.log('  contact_email_status:', match.contact_email_status);

      // Check if email is still locked
      if (match.email?.includes('email_not_unlocked')) {
        console.log('\n⚠️  Email is still locked!');
        console.log('   Possible reasons:');
        console.log('   1. Out of credits');
        console.log('   2. Plan doesn\'t support email revelation');
        console.log('   3. Email is not available for this contact');
      } else {
        console.log('\n✅ Email successfully revealed!');
      }
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

testApolloEmailRevelation();
