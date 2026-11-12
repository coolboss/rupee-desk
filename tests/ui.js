/* Opens the built page at phone and desktop sizes, visits every section, reports errors and overflow. */
let playwright; try { playwright = require("playwright"); } catch (e) { playwright = require("/opt/npm-tools/node_modules/playwright"); }
const { chromium } = playwright;
const LAUNCH = { args: ["--no-sandbox"] }; { const c = process.env.CHROME || "/usr/bin/google-chrome"; if (require("fs").existsSync(c)) LAUNCH.executablePath = c; }
const ROUTES=["home","plan","wealth","cash","business","tax","goals","retire","loans","cover","invest","tools","calendar","data"];
(async()=>{const b=await chromium.launch(LAUNCH);let bad=0;
 for(const [vp,w,h,scheme] of [['m',390,844,'light'],['d',1320,860,'light'],['md',390,844,'dark']]){
  const ctx=await b.newContext({viewport:{width:w,height:h},colorScheme:scheme});const p=await ctx.newPage();const errs=[];
  p.on('console',m=>{if(m.type()==='error'&&!/fonts\.g|ERR_|net::/.test(m.text()))errs.push(m.text())});p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
  await p.goto('file://'+__dirname+'/../index.html');await p.waitForTimeout(300);
  for(const r of ROUTES){await p.evaluate(x=>{location.hash=x},r);await p.waitForTimeout(150);
   const m=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,len:document.querySelector('#page').innerText.length,
     nan:/NaN|undefined|Infinity|\[object/.test(document.querySelector('#page').innerText),
     wide:[...document.querySelectorAll('#page *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>document.documentElement.clientWidth+1&&!e.closest('.tw')&&!e.closest('.subnav')&&!e.closest('svg')}).slice(0,3).map(e=>e.tagName+'.'+e.className)}));
   const flag=m.sw>m.cw||m.nan||m.len<80||m.wide.length;if(flag)bad++;
   console.log(vp,r.padEnd(9),flag?'PROBLEM':'ok',JSON.stringify(m));
   if(process.argv[2]==='shots')await p.screenshot({path:`${__dirname}/../shots/${vp}_${r}.png`,fullPage:vp!=='d'});}
  if(errs.length){bad++;console.log(vp,'ERRORS',errs.slice(0,6))}
  await ctx.close()}
 await b.close();console.log(bad?bad+' problems':'all clean');process.exit(bad?1:0)})();
