/**
 * Test Beatrice's email revelation with different endpoints
 */

import * as dotenv from 'dotenv';
dotenv.config();

const APOLLO_API_KEY = process.env.APOLLO_API_KEY!;
const BEATRICE_ID = '54abd78d7468692a6b4fd310';

async function testBeatrice() {
  console.log('Testing Beatrice Coultre email revelation\n');

  // Test 1: /people/match endpoint
  console.log('1. Testing /people/match endpoint');
  console.log('==================================');
  try {
    const response = await fetch('https://api.apollo.io/v1/people/match?reveal_email=true&reveal_personal_emails=true&id=' + BEATRICE_ID, {
      method: 'POST',
      headers: {
        'X-Api-Key': APOLLO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: 'Beatrice',
        last_name: 'Coultre',
      }),
    });

    const data = await response.json();
    console.log('Email:', data.person?.email);
    console.log('Personal Emails:', data.person?.personal_emails);
    console.log('Revealed for team:', data.person?.revealed_for_current_team);
    console.log('\n');
  } catch (e) {
    console.error('Error:', e);
  }

  // Test 2: /people/enrich endpoint
  console.log('2. Testing /people/enrich endpoint');
  console.log('==================================');
  try {
    const response = await fetch('https://api.apollo.io/v1/people/enrich?reveal_email=true&reveal_personal_emails=true', {
      method: 'POST',
      headers: {
        'X-Api-Key': APOLLO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: BEATRICE_ID,
      }),
    });

    const data = await response.json();
    console.log('Email:', data.person?.email);
    console.log('Personal Emails:', data.person?.personal_emails);
    console.log('Revealed for team:', data.person?.revealed_for_current_team);
    console.log('\n');
  } catch (e) {
    console.error('Error:', e);
  }

  // Test 3: Get from People Search (already revealed emails show here)
  console.log('3. Testing /people/search endpoint');
  console.log('==================================');
  try {
    const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'X-Api-Key': APOLLO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q_organization_name: 'Spacegoods',
        per_page: 10,
      }),
    });

    const data = await response.json();
    const beatrice = data.people?.find((p: any) => p.id === BEATRICE_ID);
    if (beatrice) {
      console.log('Found in search!');
      console.log('Email:', beatrice.email);
      console.log('Personal Emails:', beatrice.personal_emails);
    } else {
      console.log('Not found in search results');
      console.log('Total results:', data.people?.length || 0);
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

testBeatrice();
