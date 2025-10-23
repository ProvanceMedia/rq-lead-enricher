/**
 * Test Luigi's email revelation
 */

import * as dotenv from 'dotenv';
dotenv.config();

const APOLLO_API_KEY = process.env.APOLLO_API_KEY!;
const LUIGI_ID = '60ab9de938be6800013b26da';

async function testLuigi() {
  console.log('Testing Luigi Sani email revelation\n');

  // Test with query params
  const response = await fetch('https://api.apollo.io/v1/people/match?reveal_email=true&reveal_personal_emails=true&id=' + LUIGI_ID, {
    method: 'POST',
    headers: {
      'X-Api-Key': APOLLO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      first_name: 'Luigi',
      last_name: 'Sani',
      organization_name: 'Harrods',
    }),
  });

  const data = await response.json();

  console.log('Response:');
  console.log('  Email:', data.person?.email);
  console.log('  Personal Emails:', data.person?.personal_emails);
  console.log('  Revealed for team:', data.person?.revealed_for_current_team);
  console.log('  Email status:', data.person?.email_status);

  if (data.person?.email?.includes('email_not_unlocked')) {
    console.log('\n❌ Email is LOCKED');
    console.log('This email cannot be revealed (out of credits or plan limitation)');
  } else {
    console.log('\n✅ Email revealed:', data.person?.email);
  }
}

testLuigi();
