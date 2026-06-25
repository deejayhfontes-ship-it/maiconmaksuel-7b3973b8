import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  // Login 3573
  await page.keyboard.press('3');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.press('5');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.press('7');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.press('3');
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Click Caixa
  const links = await page.$$('a');
  for (const a of links) {
    const text = await page.evaluate(el => el.textContent, a);
    if (text && text.includes('Caixa')) {
      await a.click();
      break;
    }
  }
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Click a product
  await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, button'));
    for (const el of elements) {
      if (el.textContent && el.textContent.includes('R$') && el.clientHeight > 50) {
        if (window.getComputedStyle(el).cursor === 'pointer' || el.tagName === 'BUTTON') {
          el.click();
          return;
        }
      }
    }
  });

  await new Promise(r => setTimeout(r, 1000));
  
  // Toggle NFC-e
  const switches = await page.$$('button[role="switch"]');
  if (switches.length > 0) {
    await switches[0].click();
  }
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Finalizar Venda
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    for (const btn of buttons) {
      if (btn.textContent && (btn.textContent.includes('Finalizar Venda') || btn.textContent.includes('Cobrar'))) {
        btn.click();
        return;
      }
    }
  });
  
  // Wait 15s to see result
  await new Promise(r => setTimeout(r, 15000));
  await browser.close();
})();
