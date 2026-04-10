const https = require('https');

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
  const r = await runSQL(`SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobid;`);
  let jobs;
  try { jobs = JSON.parse(r.body); } catch { console.log(r.body); return; }

  console.log('=== CRON JOBS ATIVOS ===');
  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.log('Nenhum job encontrado.');
    return;
  }

  jobs.forEach(j => console.log(`[${j.jobid}] "${j.jobname}" | ${j.schedule} | ativo: ${j.active}`));

  // Se tiver mais de 1 job com mesmo nome, remover duplicatas (manter o mais recente)
  const mesmoNome = jobs.filter(j => j.jobname === 'check-lembretes-every-5min');
  if (mesmoNome.length > 1) {
    console.log(`\n⚠️ Duplicata detectada (${mesmoNome.length}x)! Removendo mais antigo...`);
    // Remove todos exceto o último (maior jobid)
    const paraRemover = mesmoNome.slice(0, -1);
    for (const job of paraRemover) {
      const rd = await runSQL(`SELECT cron.unschedule(${job.jobid});`);
      console.log(`  Removido jobid ${job.jobid}: ` + rd.body.substring(0, 80));
    }
    // Listar resultado final
    const rf = await runSQL(`SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobid;`);
    console.log('\n=== RESULTADO FINAL ===');
    try {
      JSON.parse(rf.body).forEach(j => console.log(`[${j.jobid}] "${j.jobname}" | ${j.schedule} | ativo: ${j.active}`));
    } catch { console.log(rf.body); }
  } else {
    console.log('\n✅ Sem duplicatas. Tudo certo!');
  }
})();
