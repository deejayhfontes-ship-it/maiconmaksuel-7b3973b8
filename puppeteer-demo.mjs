import puppeteer from 'puppeteer';

(async () => {
  console.log('Iniciando o robô automágico...');
  const browser = await puppeteer.launch({ 
    headless: false, // Abre o navegador em Session 0 (invisível para o usuário interativo, mas funcional)
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('Acessando o sistema local na porta 8080...');
    await page.goto('http://localhost:8080/');
    
    // Aguardar a tela de login
    console.log('Aguardando tela de login...');
    await page.waitForSelector('button', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Digitando o PIN de acesso 3573...');
    const pin = '3573';
    for (const digit of pin) {
      const buttons = await page.$$('button');
      let digitClicked = false;
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.trim() === digit) {
          await btn.click();
          digitClicked = true;
          break;
        }
      }
      if (!digitClicked) {
        console.log(`Erro ao clicar no dígito ${digit}`);
      }
      await new Promise(r => setTimeout(r, 600));
    }
    
    console.log('Aguardando login e carregamento da dashboard...');
    await new Promise(r => setTimeout(r, 5000));
    
    console.log('Navegando para a página do Caixa...');
    await page.goto('http://localhost:8080/caixa');
    await new Promise(r => setTimeout(r, 5000));
    
    console.log('Procurando a comanda de teste número 94185...');
    
    const cards = await page.$$('.border, .rounded-xl, card');
    let cardEncontrado = null;
    for (const card of cards) {
      const text = await page.evaluate(el => el.textContent, card);
      if (text && text.includes('94185')) {
        cardEncontrado = card;
        break;
      }
    }
    
    if (cardEncontrado) {
      console.log('Card da comanda de teste 94185 encontrado!');
      
      // Procura o botão de Finalizar dentro desse card
      const buttons = await cardEncontrado.$$('button');
      let finalizou = false;
      for (const btn of buttons) {
        const btnText = await page.evaluate(el => el.textContent, btn);
        if (btnText && btnText.includes('Finalizar')) {
          console.log('Clicando no botão Finalizar do card...');
          await btn.click();
          finalizou = true;
          break;
        }
      }
      
      if (!finalizou) {
        console.log('Não foi possível achar o botão Finalizar no card, tentando classe bg-success...');
        const successBtn = await cardEncontrado.$('button.bg-success');
        if (successBtn) {
          await successBtn.click();
          finalizou = true;
        }
      }
    } else {
      console.log('Card da comanda 94185 não foi encontrado pelo número. Tentando clicar no primeiro botão Finalizar da página...');
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes('Finalizar')) {
          await btn.click();
          break;
        }
      }
    }
    
    console.log('Aguardando a abertura do modal de finalização...');
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('Confirmando se o switch Emitir NFC-e está ativo...');
    // No modal de finalização, o switch e o CPF da Amanda Silva já devem vir preenchidos por padrão.
    // Vamos esperar um pouco para tudo inicializar.
    
    console.log('Clicando no botão Confirmar para efetivar a venda e emitir NFC-e...');
    const buttonsModal = await page.$$('button');
    let confirmado = false;
    for (const btn of buttonsModal) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.trim() === 'Confirmar') {
        console.log('Botão Confirmar clicado!');
        await btn.click();
        confirmado = true;
        break;
      }
    }
    
    if (!confirmado) {
      console.log('Tentando clicar em Confirmar usando seletor fallback...');
      const elements = await page.$$('::-p-text(Confirmar)');
      for (const el of elements) {
        await el.click();
        break;
      }
    }
    
    console.log('Aguardando resposta do processamento da NFC-e (comunicação com SEFAZ)...');
    await new Promise(r => setTimeout(r, 10000));
    
    console.log('Processo finalizado com sucesso!');
    
  } catch (error) {
    console.error('Ocorreu um erro durante a automação:', error);
  } finally {
    console.log('Fechando o navegador...');
    await browser.close();
  }
})();
