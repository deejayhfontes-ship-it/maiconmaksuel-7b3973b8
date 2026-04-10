const https = require('https');

const REF = 'hhzvjsrsoyhjzeiuxpep';
const MANAGEMENT_TOKEN = 'sbp_a1efd6232e48db3c84484cb743171c29cf1800fd'; 

const query = `
  SELECT trigger_schema, trigger_name, event_manipulation, action_statement
  FROM information_schema.triggers
  WHERE event_object_table = 'agendamentos';
`;

const req = https.request(
  'https://api.supabase.com/v1/projects/' + REF + '/query',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + MANAGEMENT_TOKEN,
    }
  },
  (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        console.log(JSON.stringify(JSON.parse(data), null, 2));
      } catch(e) {
        console.log(data);
      }
    });
  }
);

req.on('error', (e) => {
  console.error(e);
});

req.write(JSON.stringify({ query: query }));
req.end();
