import { chromium } from 'playwright';

(async () => {
  console.log('Iniciando o navegador para demonstração ao vivo...');
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 600, 
    args: ['--start-maximized']
  });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();
  
  try {
    console.log('Acessando o sistema...');
    await page.goto('http://localhost:8080/');
    
    await page.waitForSelector('button:has-text("1")');
    
    console.log('Digitando o PIN 3573...');
    const pin = '3573';
    for (const digit of pin) {
      await page.getByRole('button', { name: digit, exact: true }).click();
    }
    
    // A tela de Login tem um botão com a class de "w-full h-12" que é o submit
    // Podemos tentar clicar por força bruta se ele ainda estiver na página de login
    try {
        const submitButton = page.getByRole('button', { name: 'Verificando' }).or(page.getByText('Entrar', { exact: false }));
        // Only click if we are not navigating away already
        if (page.url() === 'http://localhost:8080/' || page.url() === 'http://localhost:8080/login') {
            await submitButton.first().click({ force: true, timeout: 2000 });
        }
    } catch(e) {}
    
    console.log('Aguardando carregamento da dashboard...');
    await page.waitForTimeout(4000); // Wait explicitly to allow the login to process
    
    console.log('Indo para o Caixa...');
    await page.goto('http://localhost:8080/caixa');
    
    console.log('Pronto! O navegador está aberto no Caixa.');
    console.log('Você pode finalizar uma comanda para testar a emissão de nota.');
    
    await page.waitForTimeout(180000);
    
  } catch (error) {
    console.error('Ocorreu um erro na demonstração:', error);
  } finally {
    console.log('Fechando o navegador...');
    await browser.close();
  }
})();
