const {chromium}=require(process.env.SHOTPROOF_PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/redesign');fs.mkdirSync(out,{recursive:true});
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:process.env.SHOTPROOF_CHROMIUM||undefined});
const results=[];
for(const viewport of [{width:1600,height:1000},{width:768,height:1024},{width:390,height:844},{width:320,height:720}]){
 const context=await browser.newContext({viewport,acceptDownloads:true});const page=await context.newPage(),errors=[],posts=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET')posts.push(r.url())});
 await page.goto('http://127.0.0.1:8765/docs/evidence.html');await page.waitForFunction(()=>document.getElementById('verify').textContent.includes('hashes verified'));
 assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));
 assert.equal(await page.locator('#case-strip button').count(),3);
 assert((await page.locator('#findings').innerText()).includes('right-hand region'));
 assert((await page.locator('#annotations').innerText()).includes('No human approval'));
 await page.locator('#case-strip button').first().click();assert((await page.locator('#findings').innerText()).includes('additional module'));
 if(viewport.width<=520){await page.locator('[data-image=reference]').click();assert(await page.locator('#reference').isVisible());assert(!(await page.locator('#candidate').isVisible()));await page.locator('[data-image=candidate]').click();assert(await page.locator('#candidate').isVisible());}
 const receipt=JSON.parse(fs.readFileSync(path.join(root,'evidence/shotproof-three-live-amd-evidence.json')));
 receipt.runs[0].sent_png_sha256[0]='0'.repeat(64);
 await page.locator('#receipt').setInputFiles({name:'tampered.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(receipt))});
 await page.waitForFunction(()=>document.getElementById('verify').textContent.includes('PNG hash mismatch'));
 assert(!(await page.locator('#recorded-workspace').isVisible()));assert.equal(await page.locator('#download').getAttribute('href'),null);assert(await page.locator('#receipt').isVisible());
 await page.locator('#sample').click();await page.waitForFunction(()=>document.getElementById('verify').textContent.includes('hashes verified'));
 const original=JSON.parse(fs.readFileSync(path.join(root,'evidence/shotproof-three-live-amd-evidence.json')));
 original.runs[1].model_result.findings[0].observation='FORGED DISPLAY FIELD';
 await page.locator('#receipt').setInputFiles({name:'altered-display.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(original))});
 await page.waitForFunction(()=>document.getElementById('verify').textContent.includes('hashes verified'));
 assert(!(await page.locator('#findings').innerText()).includes('FORGED'));
 assert.deepEqual(posts,[]);
 await page.goto('http://127.0.0.1:8765/index.html');await page.waitForFunction(()=>!document.getElementById('controls').disabled);
 assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));
 await page.locator('#approve').click();await page.locator('#note').fill('QA: the foreground shape conceals the right-hand region.');
 await page.locator('#case-strip button').nth(1).click();assert.equal(await page.locator('#note').inputValue(),'');
 await page.locator('#note').fill('QA: the hidden count cannot be verified.');await page.locator('#status').selectOption('uncertain');await page.locator('#record').click();
 assert.equal(await page.locator('#count').innerText(),'1 recorded observations');
 await page.locator('#case-strip button').first().click();assert((await page.locator('#note').inputValue()).includes('foreground'));
 const download=page.waitForEvent('download');await page.locator('#export').click();const file=await download;const f=await file.path();const exported=JSON.parse(fs.readFileSync(f));assert.equal(exported.amd_execution,null);assert.equal(exported.human_event_history.length,1);
 await page.locator('.live-tools summary').click();await page.locator('#ai-compare').click();await page.waitForFunction(()=>document.getElementById('ai-status').textContent.includes('No inference was attempted'));
 assert.equal(await page.locator('#ai-results article').count(),0);assert.deepEqual(errors,[]);
 results.push({viewport,status:'passed',checks:['responsive','exact recorded images','raw-output-derived findings','hash tamper blocked','recover after blocked receipt','mobile image toggle','manual draft retention','real export','no simulated inference','no JS errors']});
 await context.close();
}
const page=await browser.newPage({viewport:{width:1600,height:1000}});await page.goto('http://127.0.0.1:8765/docs/evidence.html');await page.waitForFunction(()=>document.getElementById('verify').textContent.includes('hashes verified'));await page.locator('#candidate').evaluate(i=>i.decode());await page.screenshot({path:path.join(out,'stage-detail.png'),clip:{x:115,y:301,width:1460,height:614}});await page.close();
await browser.close();fs.writeFileSync(path.join(out,'acceptance-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exit(1)});
