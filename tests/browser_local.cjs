// Real Chromium acceptance and engineering-preview capture. No AMD inference fixture.
const {chromium}=require(process.env.SHOTPROOF_PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 const output=path.resolve(__dirname,'../output/playwright');fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.SHOTPROOF_CHROMIUM || undefined});
 const results=[];
 for(const [width,height] of [[1440,1000],[768,1024],[390,844]]){
  const context=await browser.newContext({viewport:{width,height},acceptDownloads:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765');await page.waitForFunction(()=>!document.getElementById('controls').disabled);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('.live-tools summary').click();await page.locator('#ai-compare').click();assert((await page.locator('#ai-status').innerText()).includes('Select the reference'));
  await page.locator('#approve').click();await page.locator('#note').fill('QA observation: the candidate has four visible modules.');
  await page.locator('#case').selectOption('occlusion');assert.equal(await page.locator('#note').inputValue(),'');
  await page.locator('#note').fill('The foreground shape conceals part of the product. I cannot verify that region.');
  await page.locator('#status').selectOption('uncertain');await page.locator('#record').click();await page.locator('#record').click();
  assert.equal(await page.locator('#count').innerText(),'1 recorded observations');
  await page.locator('#case').selectOption('addition');assert((await page.locator('#note').inputValue()).includes('four visible modules'));
  await page.locator('.region-editor summary').click();await page.locator('#x').fill('700');await page.locator('#w').fill('100');await page.locator('#record').click();
  assert((await page.locator('#feedback').innerText()).includes('fit inside'));
  await page.locator('#x').fill('150');await page.locator('#w').fill('420');await page.locator('#record').click();
  const download=page.waitForEvent('download');await page.locator('#export').click();const file=await download;
  await file.saveAs(path.join(output,'human-evidence-'+width+'.json'));const evidence=JSON.parse(fs.readFileSync(path.join(output,'human-evidence-'+width+'.json')));
  assert.equal(evidence.human_event_history.length,2);assert.equal(evidence.amd_execution,null);assert.equal(evidence.summary.unresolved.length,1);
  await page.locator('#ai-compare').click();await page.waitForFunction(()=>document.getElementById('ai-status').textContent.includes('No inference was attempted'));
  assert.equal(await page.locator('#ai-results article').count(),0);
  await page.locator('#ai-export').click();assert((await page.locator('#ai-status').innerText()).includes('No actual request'));
  await page.screenshot({path:path.join(output,'review-'+width+'.png'),fullPage:true});assert.deepEqual(errors,[]);
  results.push({viewport:[width,height],status:'passed',checks:['startup hashes','responsive layout','draft retention','invalid coordinates','append-only notes','real export','missing credential blocked','no fabricated inference'],js_errors:errors});await context.close();
 }
 fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({status:'passed',model_inference:false,results},null,2));
 console.log(JSON.stringify(results));
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
