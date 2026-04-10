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
  console.log('== DIAGNOSTICO DIVIDAS INCONSISTENTES ==\n');

  const r = await runSQL(`
    SELECT 
      d.id AS divida_id,
      c.nome AS cliente,
      d.valor_original,
      d.saldo,
      d.status AS status_divida,
      d.observacoes,
      a.status AS status_atendimento
    FROM dividas d
    JOIN atendimentos a ON a.id = d.atendimento_id
    LEFT JOIN clientes c ON c.id = d.cliente_id
    WHERE d.status IN ('aberta', 'parcial')
      AND a.status IN ('finalizado', 'fechado')
      AND EXISTS (
        SELECT 1 FROM pagamentos p
        WHERE p.atendimento_id = a.id
          AND p.forma_pagamento != 'fiado'
      )
    ORDER BY d.created_at DESC;
  `);

  if (r.status !== 201) {
    console.log('Erro HTTP', r.status, ':', r.body);
    return;
  }

  let parsed;
  try { parsed = JSON.parse(r.body); } catch { console.log('Parse error:', r.body); return; }

  if (!Array.isArray(parsed)) {
    console.log('Resposta inesperada:', r.body);
    return;
  }

  console.log(`Total de dividas inconsistentes: ${parsed.length}\n`);

  if (parsed.length === 0) {
    console.log('NENHUMA divida inconsistente. Banco esta limpo!');
    return;
  }

  parsed.forEach((row, i) => {
    console.log(`[${i+1}]`);
    console.log(`  Cliente:           ${row.cliente || 'N/A'}`);
    console.log(`  Status Divida:     ${row.status_divida}`);
    console.log(`  Status Atend.:     ${row.status_atendimento}`);
    console.log(`  Valor Original:    R$ ${row.valor_original}`);
    console.log(`  Saldo:             R$ ${row.saldo}`);
    console.log(`  Observacoes:       ${row.observacoes || '-'}`);
    console.log(`  ID Divida:         ${row.divida_id}`);
    console.log('');
  });

  // Se houver inconsistencias, aplica a correcao automaticamente
  if (parsed.length > 0) {
    console.log('\nAplicando correcao...');
    const fixResult = await runSQL(`
      UPDATE dividas
      SET 
        status = 'quitada',
        saldo = 0,
        valor_pago = valor_original,
        updated_at = now()
      WHERE id IN (
        SELECT DISTINCT d.id
        FROM dividas d
        JOIN atendimentos a ON a.id = d.atendimento_id
        WHERE d.status IN ('aberta', 'parcial')
          AND a.status IN ('finalizado', 'fechado')
          AND EXISTS (
            SELECT 1 FROM pagamentos p
            WHERE p.atendimento_id = a.id
              AND p.forma_pagamento != 'fiado'
          )
      );
    `);
    
    if (fixResult.status === 201) {
      console.log(`✅ Correcao aplicada! ${parsed.length} divida(s) marcada(s) como quitada.`);
    } else {
      console.log('Erro na correcao:', fixResult.status, fixResult.body);
    }
  }
})();
