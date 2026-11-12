/* Interaction tests on the built page. */
let playwright; try { playwright = require("playwright"); } catch (e) { playwright = require("/opt/npm-tools/node_modules/playwright"); }
const { chromium } = playwright;
const LAUNCH = { args: ["--no-sandbox"] }; { const c = process.env.CHROME || "/usr/bin/google-chrome"; if (require("fs").existsSync(c)) LAUNCH.executablePath = c; }
let pass=0,fail=0;const ok=(n,c,x)=>{if(c)pass++;else{fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{const b=await chromium.launch(LAUNCH);
 const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();const errs=[];
 p.on('console',m=>{if(m.type()==='error'&&!/fonts\.g|ERR_|net::/.test(m.text()))errs.push(m.text())});p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
 const url='file://'+__dirname+'/../index.html';await p.goto(url);await p.waitForTimeout(300);
 const txt=async s=>(await p.locator(s).innerText());
 // sample banner, keep
 ok('sample banner',(await txt('#page')).includes('example household'));
 await p.click('#keep');await p.waitForTimeout(100);ok('banner gone',!(await txt('#page')).includes('example household'));
 // wealth: add, edit, delete, undo
 await p.click('#tabbar [data-grp=money]');await p.waitForTimeout(100);
 const before=await txt('.tiles .tile:first-child .v');
 await p.click('#add-a');await p.fill('#f-e-name','Test <b>FD</b>');await p.fill('#f-e-value','1000000');await p.fill('#f-e-inst','Axis Bank');await p.click('#ef button[type=submit]');await p.waitForTimeout(150);
 ok('asset added, markup escaped',(await p.locator('#page').innerHTML()).includes('Test &lt;b&gt;FD&lt;/b&gt;'));
 ok('net worth rose',(await txt('.tiles .tile:first-child .v'))!==before);
 ok('one listener per click',await p.locator('#sheet').isHidden());
 await p.locator('[data-asset]',{hasText:'Test'}).click();await p.waitForTimeout(100);ok('edit sheet opens once',await p.locator('.sheet').count()===1);
 await p.click('#ef-del');await p.waitForTimeout(100);ok('deleted',!(await txt('#page')).includes('Test <b>FD'));
 await p.click('#toast button');await p.waitForTimeout(100);ok('undo restores',(await txt('#page')).includes('Test <b>FD</b>'));
 // required field
 await p.click('#add-l');await p.click('#ef button[type=submit]');await p.waitForTimeout(100);ok('required blocks save',await p.locator('.sheet').count()===1);
 await p.keyboard.press('Escape');await p.waitForTimeout(100);ok('escape closes',await p.locator('#sheet').isHidden());
 // tax: live update without losing focus
 await p.click('#tabbar [data-grp=tax]');await p.waitForTimeout(100);
 const t0=await txt('#tx-pin');await p.fill('#f-t-salary','5000000');await p.waitForTimeout(100);
 ok('tax updates',(await txt('#tx-pin'))!==t0);ok('focus kept',await p.evaluate(()=>document.activeElement.id==='f-t-salary'));
 ok('salary 50L new regime',/new regime/i.test(await txt('#tx-out')));
 // name with markup
 await p.fill('#f-t-name','A<i>x</i>');await p.waitForTimeout(100);ok('name escaped in pills',(await p.locator('#tx-pills').innerHTML()).includes('A&lt;i&gt;x'));
 // HUF: summaries stay on their headings
 await p.click('#tx-add');await p.fill('#f-e-name','Family HUF');await p.selectOption('#f-e-kind','huf');await p.click('#ef button[type=submit]');await p.waitForTimeout(150);
 ok('no salary section for HUF',await p.locator('[data-sec=sal]').count()===0);
 await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true));await p.fill('#f-t-fdInt','600000');await p.waitForTimeout(100);
 ok('HUF interest summary on its own heading',(await txt('[data-sec=oth] summary')).includes('6 lakh')&&!(await txt('[data-sec=cg] summary')).includes('lakh'));
 ok('HUF tax 6L new = 10,400',(await txt('#tx-out')).includes('₹10,400'));
 // capital loss with minus sign
 await p.fill('#f-t-st111A','-50000');await p.waitForTimeout(100);ok('loss noted',(await txt('#tx-out')).includes('Capital loss'));
 // remove person + undo
 await p.click('#tx-del');await p.waitForTimeout(100);ok('person removed',!(await txt('#tx-pills')).includes('Family HUF'));
 await p.click('#toast button');await p.waitForTimeout(100);ok('person back',(await txt('#tx-pills')).includes('Family HUF'));
 // year switch changes HRA cities and due dates
 await p.click('#yearbtn');await p.click('[data-year="2025-26"]');await p.waitForTimeout(150);
 await p.click('#tx-pills [data-who]:first-child');await p.waitForTimeout(100);
 ok('FY 2025-26 has four HRA cities',(await txt('#tx-form')).includes('Kolkata or Chennai?'));ok('year ended note',(await txt('#tx-out')).includes('year has ended'));
 await p.click('#yearbtn');await p.click('[data-year="2026-27"]');await p.waitForTimeout(150);
 // persistence across reload
 await p.waitForTimeout(500);await p.reload();await p.waitForTimeout(300);await p.evaluate(()=>{location.hash='tax'});await p.waitForTimeout(150);
 ok('saved across reload',(await p.inputValue('#f-t-salary'))==='5000000');
 // every other view reacts to input
 for(const [r,sel,val,out] of [['retire','#f-retire-spend','600000','#rt-out'],['loans','#f-loan-extra','10000','#ln-out'],['invest','#f-compare-amt','2500000','#iv-out'],['tools','#f-tools-sip-m','50000','#tl-out']]){
   await p.evaluate(x=>{location.hash=x},r);await p.waitForTimeout(150);const a=await txt(out);await p.fill(sel,val);await p.waitForTimeout(150);ok(r+' reacts',(await txt(out))!==a)}
 await p.evaluate(()=>{location.hash='invest'});await p.waitForTimeout(100);await p.fill('#f-compare-amt','5000000');await p.waitForTimeout(100);
 ok('PPF flagged above its limit',(await txt('#iv-out')).includes('max ₹1.5 lakh a year'));
 await p.selectOption('#f-compare-who','r:0:0');await p.waitForTimeout(100);ok('no-tax bracket has zero rates',(await txt('#iv-rates')).includes('interest taxed at 0.0%'));
 // goals and cover and calendar
 await p.evaluate(()=>{location.hash='goals'});await p.waitForTimeout(100);await p.click('#add-g');await p.fill('#f-e-name','Trip');await p.fill('#f-e-cost','500000');await p.click('#ef button[type=submit]');await p.waitForTimeout(100);ok('goal added',(await txt('#page')).includes('Trip'));
 await p.evaluate(()=>{location.hash='cover'});await p.waitForTimeout(100);await p.check('[data-paper=will]');await p.waitForTimeout(50);ok('checklist counts',(await txt('#cv-n')).startsWith('1 of'));
 await p.evaluate(()=>{location.hash='calendar'});await p.waitForTimeout(100);await p.click('#add-r');await p.fill('#f-e-title','Renew passport');await p.click('#ef button[type=submit]');await p.waitForTimeout(100);ok('reminder shows',(await txt('#page')).includes('Renew passport'));
 // data: copy text → import round trip, clear all → every page still draws
 await p.evaluate(()=>{location.hash='data'});await p.waitForTimeout(100);
 const json=await p.evaluate(()=>localStorage.getItem('rupee-desk-v1'));
 await p.click('#d-fresh');await p.waitForTimeout(200);
 for(const r of ["home","plan","wealth","cash","business","tax","goals","retire","loans","cover","invest","tools","calendar","data"]){await p.evaluate(x=>{location.hash=x},r);await p.waitForTimeout(120);const t=await txt('#page');ok('empty '+r,t.length>60&&!/NaN|undefined|Infinity|could not be drawn/.test(t),t.slice(0,80))}
 await p.evaluate(()=>{location.hash='data'});await p.waitForTimeout(100);await p.fill('#d-paste',json);await p.click('#d-load');await p.waitForTimeout(200);
 await p.evaluate(()=>{location.hash='wealth'});await p.waitForTimeout(100);ok('import restores',(await txt('#page')).includes('Test <b>FD</b>'));
 await p.evaluate(()=>{location.hash='data'});await p.waitForTimeout(100);await p.fill('#d-paste','{"nope":1}');await p.click('#d-load');await p.waitForTimeout(100);ok('bad import refused',(await txt('#toast')).includes('not a Rupee Desk backup'));
 // keyboard: sheet traps focus and returns it
 await p.evaluate(()=>{location.hash='wealth'});await p.waitForTimeout(100);await p.focus('#add-a');await p.keyboard.press('Enter');await p.waitForTimeout(100);
 for(let i=0;i<12;i++)await p.keyboard.press('Tab');ok('focus stays in sheet',await p.evaluate(()=>!!document.activeElement.closest('#sheet')));
 await p.keyboard.press('Escape');await p.waitForTimeout(100);ok('focus returns to opener',await p.evaluate(()=>document.activeElement.id==='add-a'));
 // touch targets
 const small=await p.evaluate(()=>[...document.querySelectorAll('#app button,#app select,#app input,#app summary')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height<34}).map(e=>e.tagName+'#'+e.id+'.'+e.className+':'+Math.round(e.getBoundingClientRect().height)).slice(0,8));ok('touch targets at least 34px',small.length===0,small);
 ok('no console errors',errs.length===0,errs.slice(0,5));
 console.log(`${pass} passed, ${fail} failed`);await b.close();process.exit(fail?1:0)})();
