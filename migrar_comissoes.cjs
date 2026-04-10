const https = require('https');
const fs = require('fs');

const PAT = 'sbp_d0c8db58f9799b7309cc1a2b52ea6c0d4cbd8590';
const PROJECT = 'hhzvjsrsoyhjzeiuxpep';

function runSQL(sql) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ query: sql });
    const opts = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT}/database/query`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + PAT,
        'Content-Length': Buffer.byteLength(payload),
      }
    };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    req.write(payload);
    req.end();
  });
}

(async () => {
  const r1 = await runSQL('SELECT COUNT(*) as total FROM comissoes;');
  const r2 = await runSQL('SELECT COUNT(*) as total FROM comissoes_registro;');
  const r3 = await runSQL("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'comissoes' ORDER BY ordinal_position;");

  let log = '';
  log += 'comissoes: ' + r1.body + '\n';
  log += 'comissoes_registro: ' + r2.body + '\n';
  log += 'colunas_comissoes: ' + r3.body + '\n';
  
  process.stdout.write(log);
  fs.writeFileSync('resultado2.txt', log, 'ascii');
})();
