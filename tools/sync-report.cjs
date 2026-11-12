const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..'),file=path.join(root,'index.html');let html=fs.readFileSync(file,'utf8');
const block='/* BEGIN REPORT EXPORT V2 */\n'+fs.readFileSync(path.join(root,'tools/report-export.js'),'utf8').trim()+'\n/* END REPORT EXPORT V2 */';
const re=/\/\* BEGIN REPORT EXPORT V2 \*\/[\s\S]*?\/\* END REPORT EXPORT V2 \*\//;
if(process.argv.includes('--check')){if(html.match(re)?.[0]!==block)throw Error('Report source differs from embedded application');console.log('PASS embedded report source matches');}
else{if(re.test(html))html=html.replace(re,()=>block);else html=html.replace('      window.addEventListener("beforeunload"',()=>block+'\n      window.addEventListener("beforeunload"');fs.writeFileSync(file,html);}
