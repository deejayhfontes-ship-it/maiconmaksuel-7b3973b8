const https = require('https');
const fs = require('fs');
const path = require('path');

const PAT = 'sbp_d0c8db58f9799b7309cc1a2b52ea6c0d4cbd8590';
const PROJECT = 'hhzvjsrsoyhjzeiuxpep';

const funcCode = fs.readFileSync(
  path.join(__dirname, 'supabase/functions/whatsapp-send/index.ts'),
  'utf8'
);

// Montar multipart/form-data manualmente
const boundary = '----FormBoundary' + Date.now();
const CRLF = '\r\n';

let body = '';
body += `--${boundary}${CRLF}`;
body += `Content-Disposition: form-data; name="metadata"${CRLF}`;
body += `Content-Type: application/json${CRLF}${CRLF}`;
body += JSON.stringify({ name: 'whatsapp-send', verify_jwt: true, entrypoint_path: 'index.ts' });
body += `${CRLF}`;
body += `--${boundary}${CRLF}`;
body += `Content-Disposition: form-data; name="file"; filename="index.ts"${CRLF}`;
body += `Content-Type: application/typescript${CRLF}${CRLF}`;
body += funcCode;
body += `${CRLF}--${boundary}--${CRLF}`;

const bodyBuf = Buffer.from(body, 'utf8');

const opts = {
  hostname: 'api.supabase.com',
  path: `/v1/projects/${PROJECT}/functions/whatsapp-send`,
  method: 'PATCH',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Authorization': 'Bearer ' + PAT,
    'Content-Length': bodyBuf.length,
  }
};

console.log('Deploy whatsapp-send via multipart...');
const req = https.request(opts, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log('Status HTTP:', res.statusCode);
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ Edge function whatsapp-send atualizada com sucesso!');
      try { console.log(JSON.parse(data)); } catch { console.log(data); }
    } else {
      console.log('Resposta:', data.substring(0, 500));
      // Tentar POST (criar)
      console.log('\nTentando POST...');
      const opts2 = { ...opts, path: `/v1/projects/${PROJECT}/functions`, method: 'POST' };
      const req2 = https.request(opts2, (res2) => {
        let d2 = '';
        res2.on('data', d => d2 += d);
        res2.on('end', () => {
          console.log('POST Status:', res2.statusCode);
          console.log('POST Resposta:', d2.substring(0, 500));
        });
      });
      req2.on('error', e => console.error(e.message));
      req2.write(bodyBuf);
      req2.end();
    }
  });
});
req.on('error', e => console.error('Erro:', e.message));
req.write(bodyBuf);
req.end();
