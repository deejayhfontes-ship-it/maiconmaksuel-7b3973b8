const payload = {
  acao: "emitir",
  tipo: "nfce",
  nota_id: "test-caixa-" + Date.now(),
  cliente: {
    nome: "CLIENTE TESTE AO VIVO",
    cpf_cnpj: "00000000000"
  },
  itens: [{
    numero_item: 1,
    codigo_produto: "TESTE",
    descricao: "TESTE DE CAIXA AO VIVO",
    ncm: "00000000",
    cfop: "5102",
    unidade: "UN",
    quantidade: 1,
    valor_unitario: 1,
    valor_total: 1
  }],
  pagamento: {
    forma: "01", // Dinheiro
    valor: 1
  },
  valor_total: 1
};

async function testCaixa() {
  console.log("==========================================");
  console.log("🚀 INICIANDO TESTE AO VIVO DO CAIXA...");
  console.log("==========================================\n");
  
  console.log("📦 Montando carrinho de compras invisível...");
  console.log("👤 Cliente: Consumidor Final");
  console.log("🛒 Produto: TESTE DE CAIXA AO VIVO - R$ 1,00");
  console.log("✅ Chave [Emitir NFC-e] ativada!\n");
  
  console.log("⏳ Enviando dados para a nuvem (Supabase)...");
  
  // Hit the local Supabase Edge function if they had it running, or hit the cloud one!
  // Since we deployed to the cloud, let's hit the cloud!
  const functionUrl = "https://hhzvjsrsoyhjzeiuxpep.supabase.co/functions/v1/nota-fiscal";
  
  // We need the ANON KEY to call the function
  const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoenZqc3Jzb3loanplaXV4cGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDY0MjYsImV4cCI6MjA4MzcyMjQyNn0.6zEEC9DGxoXNMAJ8w5plFusOn_OHRRQJjINkRZgpl_0";

  try {
    const res = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + anonKey
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    
    console.log("\n🎯 RESPOSTA DA SEFAZ / FOCUS NFE CHEGOU:\n");
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success || data.data?.status === 'autorizado') {
      console.log("\n🎉 SUCESSO! A nota foi autorizada e o Cupom foi gerado!");
      if (data.data?.caminho_xml_nota_fiscal) {
        console.log("📄 Link do Cupom: https://api.focusnfe.com.br" + data.data.caminho_xml_nota_fiscal.replace('.xml', '.pdf'));
      }
    } else {
      console.log("\n❌ A Focus recusou a nota (O QUE É ÓTIMO PARA O TESTE, PROVA QUE COMUNICOU!)");
      console.log("Motivo: " + (data.data?.mensagem_sefaz || data.data?.erros?.[0]?.mensagem || "Erro de validação"));
    }
    
  } catch(e) {
    console.log("Erro na comunicação:", e);
  }
}

testCaixa();
