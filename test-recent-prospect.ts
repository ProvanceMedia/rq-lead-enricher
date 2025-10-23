import * as dotenv from 'dotenv';
dotenv.config();

const APOLLO_API_KEY = process.env.APOLLO_API_KEY!;
const APOLLO_ID = '60cddfe44137610001e5fc3c';

async function testProspect() {
  console.log('Testing Apollo ID:', APOLLO_ID);
  console.log();

  const url = `https://api.apollo.io/v1/people/match?reveal_email=true&reveal_personal_emails=true&id=${APOLLO_ID}`;
  
  console.log('URL:', url);
  console.log();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Api-Key': APOLLO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  const data = await response.json();

  console.log('Response status:', response.status);
  console.log('Email:', data.person?.email);
  console.log('Personal Emails:', data.person?.personal_emails);
  console.log('Revealed for team:', data.person?.revealed_for_current_team);
  console.log('Email status:', data.person?.email_status);
  console.log();
  
  if (data.person?.email?.includes('email_not_unlocked')) {
    console.log('❌ Email is LOCKED');
  } else {
    console.log('✅ Email revealed:', data.person?.email);
  }
  
  console.log();
  console.log('Full person object:');
  console.log(JSON.stringify(data.person, null, 2));
}

testProspect();
