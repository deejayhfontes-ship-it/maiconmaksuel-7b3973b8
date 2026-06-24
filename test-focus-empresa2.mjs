const token = 'SoYfaJslu75CtgVIDKIotk5QkCeM7qH9';
const endpoint = 'https://api.focusnfe.com.br/v2/empresas?cnpj=40714062000180';

async function testFocus() {
  console.log('Buscando detalhes da empresa na Focus NFe...');
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(token + ':').toString('base64'),
    }
  });
  
  const text = await res.text();
  console.log('Status HTTP:', res.status);
  try {
    console.log('Resposta da Focus:', JSON.stringify(JSON.parse(text), null, 2));
  } catch(e) {
    console.log('Resposta da Focus (texto):', text);
  }
}

testFocus();
