/**
 * Test if URLSearchParams is building the URL correctly
 */

const params: Record<string, any> = {
  reveal_email: true,
  reveal_personal_emails: true,
  reveal_phone_number: true,
  webhook_url: 'https://monkfish-app-8jphr.ondigitalocean.app/api/webhooks/apollo-enrichment',
  id: '54abd78d7468692a6b4fd310',
};

console.log('Testing URLSearchParams...\n');

const queryParams = new URLSearchParams();
Object.keys(params).forEach(key => {
  if (params[key] !== undefined) {
    queryParams.append(key, String(params[key]));
  }
});

const fullUrl = `/people/match?${queryParams.toString()}`;

console.log('Generated URL:', fullUrl);
console.log('\nExpected format:');
console.log('/people/match?reveal_email=true&reveal_personal_emails=true&reveal_phone_number=true&webhook_url=...');

console.log('\nFull URL with base:');
console.log('https://api.apollo.io/v1' + fullUrl);
