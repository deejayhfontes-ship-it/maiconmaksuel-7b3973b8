const https = require('https');
const PAT = 'sbp_fa1caa394d87a55ff5562900ee78bdec8fee5951';
const PROJECT_REF = 'hhzvjsrsoyhjzeiuxpep';

const SQL = `
ALTER TABLE comunicacao_templates_prontos ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'lembrete';
ALTER TABLE comunicacao_templates_prontos ADD COLUMN IF NOT EXISTS estilo text DEFAULT 'moderno';
NOTIFY pgrst, 'reload schema';
`;

const data = JSON.stringify({ query: SQL });

const options = {
    hostname: 'api.supabase.com',
    path: '/v1/projects/' + PROJECT_REF + '/database/query',
    method: 'POST',
    headers: {
        'Authorization': 'Bearer ' + PAT,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'Mozilla/5.0'
    }
};

const req = https.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
        responseData += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', responseData);
    });
});

req.on('error', (e) => {
  console.error(e);
});

req.write(data);
req.end();
