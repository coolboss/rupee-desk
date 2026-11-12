/* Interaction tests for the planner: setup, examples, My plan, Business. */
let playwright; try { playwright = require("playwright"); } catch (e) { playwright = require("/opt/npm-tools/node_modules/playwright"); }
const { chromium } = playwright;
const LAUNCH = { args: ["--no-sandbox"] }; { const c = process.env.CHROME || "/usr/bin/google-chrome"; if (require("fs").existsSync(c)) LAUNCH.executablePath = c; }
const ROUTES=["home","plan","wealth","cash","business","tax","goals","retire","loans","cover","invest","tools","calendar","data"];
let pass=0,fail=0;const ok=(n,c,x)=>{if(c)pass++;else{fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{const b=await chromium.launch(LAUNCH);
 const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();const errs=[];
 p.on('console',m=>{if(m.type()==='error'&&!/fonts\.g|ERR_|net::/.test(m.text()))errs.push(m.text())});p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
 await p.goto('file://'+__dirname+'/../index.html');await p.waitForTimeout(300);
 const txt=async s=>(await p.locator(s).innerText());const hash=async h=>{await p.evaluate(x=>{location.hash=x},h);await p.waitForTimeout(150)};
 ok('home shows the next step',/next:/i.test(await txt('.nextstep')));
 // every example household draws every page cleanly
 for(const ex of ['first','doctor','shop','retired','family']){
   await hash('home');await p.click('#others');await p.click(`[data-ex=${ex}]`);await p.waitForTimeout(250);
   for(const r of ROUTES){await hash(r);const t=await txt('#page');const m=await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);ok(ex+' '+r,t.length>60&&!m&&!/NaN|undefined|Infinity|\[object|could not be drawn/.test(t),t.match(/.{0,30}(NaN|undefined|Infinity|\[object).{0,30}/))}
   await hash('plan');const t=await txt('#page');
   if(ex==='first')ok('first job: no life cover needed, growth mix',/Life cover is not needed/i.test(t)&&/growth investor/i.test(t));
   if(ex==='doctor')ok('doctor: professional guidance and high-income band',/44ADA/.test(t)&&/50 lakh to 2 crore|Above ₹2 crore/.test(t));
   if(ex==='shop')ok('shop: 44AD guidance, Mudra, Sukanya, APY',/44AD/.test(t)&&/Mudra/.test(t)&&/Sukanya/.test(t)&&/Atal Pension/.test(t));
   if(ex==='retired')ok('retired: senior schemes and retirement income',/Senior Citizens/.test(t)&&/Income in retirement/i.test(t)&&/Life cover is not needed/i.test(t));
 }
 // business: doctor above the 44ADA limit; shop on 44AD
 await hash('home');await p.click('#others');await p.click('[data-ex=doctor]');await p.waitForTimeout(250);await hash('business');
 let t=await txt('#bz-out');ok('doctor: 44ADA not open, audit, GST exempt',/44ADA is not open/.test(t)&&/Tax audit applies/i.test(t)&&/exempt services need no registration/i.test(t));
 await hash('home');await p.click('#others');await p.click('[data-ex=shop]');await p.waitForTimeout(250);await hash('business');
 t=await txt('#bz-out');ok('shop: 44AD compared with books',/44AD costs|Books cost/.test(t)&&/2 crore|₹2 Cr/.test(t));
 await p.click('[data-apply=books]');await p.waitForTimeout(150);await hash('tax');ok('apply books updates the tax page',(await p.inputValue('#f-t-bizMode'))==='actual'&&(await p.inputValue('#f-t-profit'))==='1000000');
 await hash('business');await p.click('[data-apply=pres]');await p.waitForTimeout(150);await hash('tax');ok('apply presumptive updates the tax page',(await p.inputValue('#f-t-bizMode'))==='44ad');
 // edit a business
 await hash('business');await p.click('#bz-edit');await p.fill('#f-e-fixed','100000');await p.fill('#f-e-reserve','700000');await p.click('#ef button[type=submit]');await p.waitForTimeout(150);ok('buffer recalculated',/7\.0 months/.test(await txt('#bz-out')));
 // two-minute setup
 await hash('data');await p.click('#d-setup');await p.fill('#f-q-name','Kavita');await p.fill('#f-q-age','31');await p.selectOption('#f-q-occ','freelance');await p.fill('#f-q-gross','1400000');
 await p.fill('#f-q-takehome','95000');await p.fill('#f-q-spend','55000');await p.fill('#f-q-bank','150000');await p.fill('#f-q-equity','300000');await p.fill('#f-q-ol','200000');await p.fill('#f-q-olEmi','9000');await p.fill('#f-q-olRate','16');await p.selectOption('#f-q-risk','growth');
 await p.click('#qs button[type=submit]');await p.waitForTimeout(300);
 ok('setup lands on My plan',await p.evaluate(()=>location.hash==='#plan'));t=await txt('#page');
 ok('plan is personal',/Kavita, 31/.test(t)&&/Freelancer/i.test(t)&&/growth investor/i.test(t));
 ok('plan: nine-month fund, costly debt, start here',/9 months/.test(t)&&/costly debt/i.test(t)&&/Start here/i.test(t));
 ok('ten steps',await p.locator('.step').count()===10);
 await hash('tax');ok('setup filled tax as 44ADA',(await p.inputValue('#f-t-bizMode'))==='44ada'&&(await p.inputValue('#f-t-receipts'))==='1400000'&&(await p.inputValue('#f-t-occ'))==='freelance');
 await hash('business');ok('setup created the practice',/Kavita's practice/.test(await txt('#page')));
 for(const r of ROUTES){await hash(r);const x=await txt('#page');ok('after setup '+r,x.length>60&&!/NaN|undefined|Infinity|could not be drawn/.test(x))}
 // profile edit changes the mix; target button
 await hash('plan');const before=await txt('.mixrow:last-of-type + .legend, .legend');await p.click('#pl-prof');await p.selectOption('#f-e-risk','cautious');await p.click('#ef button[type=submit]');await p.waitForTimeout(150);
 ok('risk change moves the mix',/cautious investor/i.test(await txt('#page')));
 if(await p.locator('#pl-target').count()){await p.click('#pl-target');await p.waitForTimeout(100);ok('target adopted',await p.locator('#pl-target').count()===0)}
 // step buttons navigate
 await p.locator('.step').nth(1).click();await p.waitForTimeout(150);ok('step opens its page',await p.evaluate(()=>location.hash!=='#plan'));
 // goal template
 await hash('goals');await p.click('[data-tpl="0"]');ok('template prefills',(await p.inputValue('#f-e-name'))==="Child's education");await p.click('#ef button[type=submit]');await p.waitForTimeout(100);ok('template goal added',/Child's education/.test(await txt('#page')));
 // undo of setup-sized replace
 await hash('data');await p.click('#d-fresh');await p.waitForTimeout(100);await p.click('#toast button');await p.waitForTimeout(200);await hash('plan');ok('undo brings the plan back',/Kavita/.test(await txt('#page')));
 const small=await p.evaluate(()=>[...document.querySelectorAll('#app button,#app select,#app input')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height<34}).map(e=>e.id+'.'+e.className).slice(0,5));ok('touch targets',small.length===0,small);
 ok('no console errors',errs.length===0,errs.slice(0,5));
 console.log(`${pass} passed, ${fail} failed`);await b.close();process.exit(fail?1:0)})();
