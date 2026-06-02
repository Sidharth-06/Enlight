const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    // Capture console messages
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

    console.log("Navigating to /auth...");
    await page.goto('http://localhost:3001/auth', { waitUntil: 'networkidle0', timeout: 15000 });
    
    console.log("Clicking Create Account tab...");
    const tabs = await page.$$('.auth-tab');
    if (tabs.length > 1) {
      await tabs[1].click();
      console.log("Clicked Create Account tab.");
      await new Promise(r => setTimeout(r, 2000));
    } else {
      console.log("Could not find tabs!");
    }
    
    await browser.close();
    console.log("Done.");
  } catch (err) {
    console.error("Script error:", err);
  }
})();
