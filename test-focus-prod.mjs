const token = 'IkrQudtneLTJ7Ojz1ZzViyM9Q5GF2ddz';
const endpoint = 'https://api.focusnfe.com.br/v2/nfce';
const ref = 'nota-teste-' + Date.now();

const payload = {
  natureza_operacao: 'VENDA DE MERCADORIA',
  data_emissao: new Date().toISOString(),
  tipo_documento: '1',
  finalidade_emissao: '1',
  consumidor_final: '1',
  presenca_comprador: '1',
  cnpj_emitente: '40714062000180',
  nome_emitente: 'MAICON DOS SANTOS DA SILVA LTDA',
  nome_fantasia_emitente: 'MAICON DOS SANTOS DA SILVA',
  inscricao_estadual_emitente: '123456789', // We need real IE if SEFAZ requires it! But Focus will tell us in the error.
  logradouro_emitente: 'RUA TESTE',
  numero_emitente: '123',
  bairro_emitente: 'CENTRO',
  municipio_emitente: 'SÃO PAULO', // We need correct city/UF
  uf_emitente: 'SP',
  cep_emitente: '01001000',
  regime_tributario: '1',
  itens: [{
    numero_item: 1,
    codigo_produto: 'SERV001',
    descricao: 'CORTE TESTE SISTEMA',
    ncm: '00000000',
    cfop: '5102',
    unidade_comercial: 'UN',
    quantidade_comercial: '1.0000',
    valor_unitario_comercial: '1.0000000000',
    valor_bruto: '1.00',
    unidade_tributavel: 'UN',
    quantidade_tributavel: '1.0000',
    valor_unitario_tributavel: '1.0000000000',
    origem: '0',
    icms_situacao_tributaria: '102',
    valor_desconto: '0.00',
    inclui_no_total: '1'
  }],
  formas_pagamento: [{
    forma_pagamento: '01',
    valor_pagamento: '1.00'
  }],
  valor_produtos: '1.00',
  valor_nota: '1.00'
};

async function testFocus() {
  console.log('Enviando NFC-e para Focus NFe em PRODUCAO...');
  const res = await fetch(endpoint + '?ref=' + ref, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(token + ':').toString('base64'),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  const data = await res.json();
  console.log('Status HTTP:', res.status);
  console.log('Resposta da Focus:', JSON.stringify(data, null, 2));
}

testFocus();
