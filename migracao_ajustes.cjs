const https = require('https');

const PAT = 'sbp_3da33030a786befd8d78f3edf9384b67e56a2934';
const PROJECT_REF = 'hhzvjsrsoyhjzeiuxpep';

const SQL = `
-- Adicionando valor_variavel na tabela de servicos (por padrao false)
ALTER TABLE public.servicos 
ADD COLUMN IF NOT EXISTS valor_variavel boolean DEFAULT false;

-- Adicionando os controles de ajustes nos itens das comandas (serviços)
ALTER TABLE public.atendimento_servicos
ADD COLUMN IF NOT EXISTS tipo_ajuste text CHECK (tipo_ajuste IN ('desconto', 'acrescimo', NULL)),
ADD COLUMN IF NOT EXISTS modo_ajuste text CHECK (modo_ajuste IN ('valor', 'porcentagem', NULL)),
ADD COLUMN IF NOT EXISTS valor_ajuste decimal(10,2);

-- Adicionando os controles de ajustes nos itens das comandas (produtos)
ALTER TABLE public.atendimento_produtos
ADD COLUMN IF NOT EXISTS tipo_ajuste text CHECK (tipo_ajuste IN ('desconto', 'acrescimo', NULL)),
ADD COLUMN IF NOT EXISTS modo_ajuste text CHECK (modo_ajuste IN ('valor', 'porcentagem', NULL)),
ADD COLUMN IF NOT EXISTS valor_ajuste decimal(10,2);
`;

const data = JSON.stringify({ query: SQL });

const options = {
    hostname: 'api.supabase.com',
    path: `/v1/projects/${PROJECT_REF}/database/query`,
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
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
        if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('✅ SUCESSO: Migração de colunas executadas no Supabase!');
        } else {
            console.log('❌ FALHA na execução.');
        }
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(data);
req.end();
