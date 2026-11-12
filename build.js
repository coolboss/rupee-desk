/* Builds index.html: one self-contained file, served by GitHub Pages from the repo root. Run: node build.js */
const fs=require("fs"),p=f=>fs.readFileSync(__dirname+"/src/"+f,"utf8");
let html=p("index.tpl.html");
const put=(mark,text)=>{html=html.split(mark).join(text.replace(/<\/script/gi,"<\\/script"))};
html=html.split("/*CSS*/").join(p("app.css"));
put("/*ENGINE*/",p("engine.js"));
put("/*APP*/",["core.js","views1.js","views2.js","views3.js","boot.js"].map(p).join("\n"));
fs.writeFileSync(__dirname+"/index.html",html);
console.log("index.html",(html.length/1024).toFixed(0)+" KB");
