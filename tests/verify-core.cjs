// Offline regression checks. No real channel requests or dependencies.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
const nodes={};const node=id=>nodes[id]??=( {value:'',textContent:'',innerHTML:'',disabled:false,files:[],type:'password',addEventListener(){},querySelectorAll(){return[]},setAttribute(){}} );
const context=vm.createContext({console,Blob,URL,TextEncoder,Uint8Array,Uint16Array,Uint32Array,DataView,AbortController,performance,crypto:require('node:crypto').webcrypto,atob,document:{getElementById:node},window:{addEventListener(){}},setTimeout,clearTimeout,setInterval,clearInterval,Image:class{set src(v){this.naturalWidth=1;this.naturalHeight=1;queueMicrotask(()=>this.onload());}},fetch:async()=>{throw Error('Mock not configured');},confirm:()=>true});
vm.runInContext(script,context);const ev=s=>vm.runInContext(s,context);
Object.assign(node('channel'),{value:'测试渠道'});for(const [k,v]of Object.entries({baseUrl:'https://test.invalid/v1',endpoint:'/images/generations',apiKey:'sk-TEST-SECRET',model:'test-image',prompt:'cat',size:'1x1',timeout:'5',extra:'',priceMode:'token',price:'2',currency:'USD'}))node(k).value=v;
let requests=0;
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jFQAAAABJRU5ErkJggg==';
function response(body,status=200){return {status,ok:status>=200&&status<300,headers:new Headers({'x-request-id':'req-test'}),text:async()=>JSON.stringify(body)};}
(async()=>{
assert.equal(ev('joinedUrl("https://test.invalid/v1/","/images/generations")'),'https://test.invalid/v1/images/generations');
node('baseUrl').value='https://test.invalid';ev('updateRequestPreview()');assert.equal(node('addV1').hidden,false);ev("$('addV1').onclick()");assert.equal(node('baseUrl').value,'https://test.invalid');assert.equal(node('endpoint').value,'/v1/images/generations');assert.equal(node('addV1').hidden,true);
assert.equal(ev('joinedUrl("https://test.invalid/v1/","/v1/images/generations")'),'https://test.invalid/v1/images/generations');assert.equal(ev('joinedUrl("https://test.invalid","/v1/images/edits")'),'https://test.invalid/v1/images/edits');
assert(ev('errorInfo(403,"<!doctype html><html>Access denied</html>",{ "content-type":"text/html" }).inference.includes("HTML")'));
assert(ev('errorInfo(403,"error code: 1010").server.includes("1010")'));
context.fetch=async()=>{requests++;return response({data:[{b64_json:png}],usage:{total_tokens:100},api_key:'sk-TEST-SECRET'});};
await ev('run()');assert.equal(requests,1);assert.equal(ev('state(records[0])'),'待确认');assert.equal(ev('records[0].images[0].width'),1);assert.equal(ev('records[0].estimatedCost'),.0002);ev("records[0].review.verdict='pass'");assert.equal(ev('state(records[0])'),'通过');assert(!ev('JSON.stringify(exportRecord(records[0]))').includes('sk-TEST-SECRET'));assert(!ev('JSON.stringify(exportRecord(records[0]))').includes(png));
context.fetch=async()=>{requests++;return response({error:{message:'invalid key sk-TEST-SECRET'}},401);};await ev('run()');assert.equal(requests,2);assert.equal(ev('state(records[1])'),'失败');assert(!ev('report(records)').includes('sk-TEST-SECRET'));
context.fetch=async()=>response({data:[{b64_json:'!!!'}]});await ev('run()');assert.equal(ev('state(records[2])'),'失败');
context.fetch=async()=>response({data:[{url:'https://image.invalid/a?token=secret'}]});await ev('run()');assert.equal(ev('state(records[3])'),'待确认');assert(ev('records[3].checks.some(c=>c.status==="pending")'));
context.fetch=async()=>({status:200,ok:true,headers:new Headers(),text:async()=>'<html>Bad response</html>'});await ev('run()');assert.equal(ev('state(records[4])'),'失败');
context.fetch=async()=>{throw new TypeError('Failed to fetch');};await ev('run()');assert.equal(ev('records[5].error.category'),'请求环境问题');
context.fetch=async(url,opts)=>new Promise((resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(Error('Aborted'))));const waiting=ev('run()');ev('active.cancelled=true;active.controller.abort()');await waiting;assert(ev('records[6].error.inference.includes("用户停止")'));
node('extra').value='{"n":2}';const count=ev('records.length');await ev('run()');assert.equal(ev('records.length'),count);node('extra').value='';
assert.equal(ev('crc32(new TextEncoder().encode("123456789"))'),0xcbf43926);
const archive=await ev('zip([{name:"报告.txt",blob:new Blob(["中文 ZIP 验证"])},{name:"images/test.png",blob:records[0].images[0].blob}])');fs.mkdirSync(__dirname+'/../test-output',{recursive:true});fs.writeFileSync(__dirname+'/../test-output/verify.zip',Buffer.from(await archive.arrayBuffer()));
let directCalls=[];context.fetch=async(url,options)=>{directCalls.push({url,options});return {ok:true};};
await ev('channelFetch("https://channel.invalid/v1/images/generations",{method:"POST",headers:{Authorization:"Bearer fake-key"},body:"{}"})');
assert.equal(directCalls.length,1);assert.equal(directCalls[0].url,'https://channel.invalid/v1/images/generations');assert.equal(directCalls[0].options.credentials,'omit');assert.equal(directCalls[0].options.redirect,'error');assert(!Object.keys(directCalls[0].options.headers).some(k=>k.startsWith('X-Bench')));
const storage=new Map();context.localStorage={setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)||null,removeItem:k=>storage.delete(k)};
ev('saveConnection()');const saved=JSON.parse(storage.get('image-bench-static-config-v1'));assert.equal(saved.model,'test-image');assert(!JSON.stringify(saved).includes('sk-TEST-SECRET'));assert(!Object.hasOwn(saved,'apiKey'));assert(!Object.hasOwn(saved,'prompt'));
const migratedContext=vm.createContext({...context,localStorage:{getItem:()=>JSON.stringify({baseUrl:'https://test.invalid/v1',endpoint:'/images/generations',model:'gpt-image-1'})}});vm.runInContext(script,migratedContext);assert.equal(node('baseUrl').value,'https://test.invalid');assert.equal(node('endpoint').value,'/v1/images/generations');assert.equal(node('model').value,'gpt-image-1');assert.equal(node('gptPreset').value,'custom');
assert(html.includes('id="gptPreset"'));assert(html.includes('value="gpt-image-2.5-sunburst"'));assert(html.includes('<input id="model"'));
// Every preset must survive saving and a fresh page load with its exact model ID.
for(const model of ['gpt-image-2','gpt-image-2.5-sunburst','gpt-image-2.5-flare','gpt-image-2.6-sunburst','gpt-image-2.6-flare','channel-custom-image']){
if(model!=='channel-custom-image')assert(html.includes('value="'+model+'"'));
node('model').value=model;ev('saveConnection()');
const stored=storage.get('image-bench-static-config-v1');node('model').value='';
const restoredContext=vm.createContext({...context,localStorage:{getItem:()=>stored}});vm.runInContext(script,restoredContext);
assert.equal(node('model').value,model);
}
assert(ev('usagePanel(records[0])').includes('100'));assert(ev('usagePanel({usage:null,estimatedCost:null,config:{}})').includes('未返回'));
const imported=JSON.parse(ev('JSON.stringify(exportRecord(records[0]))'));imported.id='IMG-import-test';imported.images[0].alpha={transparent:533252,partial:515324,opaque:0,total:1048576};context.importFixture=[imported];
imported.checks.push({name:'SOP 额外字段',status:'pass',informational:true,detail:'safety_identifier；仅记录协议差异'});
await ev('importRecords(importFixture)');assert.equal(ev('records.at(-1).imported'),true);assert.equal(ev('state(records.at(-1))'),'待确认');assert(ev('records.at(-1).checks.some(c=>c.name==="归档附件恢复")'));
assert.equal(ev('records.at(-1).images[0].alpha.partial'),515324);
assert.equal(ev('records.at(-1).checks.find(c=>c.name==="SOP 额外字段").informational'),true);
context.importAssets=new Map([[imported.images[0].path,new Blob([Buffer.from(png,'base64')])]]);
await ev('importRecords(importFixture,importAssets)');assert.equal(ev('records.filter(r=>r.id==="IMG-import-test").length'),1);assert.equal(ev('state(records.at(-1))'),'通过');assert(ev('records.at(-1).images[0].blob instanceof Blob'));
await assert.rejects(()=>ev('importRecords([])'),/为空/);const countBefore=ev('records.length');context.invalidFixture=[{id:'bad'}];await assert.rejects(()=>ev('importRecords(invalidFixture)'),/不.*支持/);assert.equal(ev('records.length'),countBefore);
assert.equal(ev('archiveName("../../escape.png","image.bin")'),'.._.._escape.png');
console.log('PASS: config excludes secrets, usage missing values, JSON recovery, folder image recovery, deduplication, invalid import rejection and archive filename safety.');
console.log('PASS: success, manual verdict, single request, redaction, base64 omission, billing, HTTP error, corrupt image, URL failure, non-JSON, network failure, cancellation, parameter guard, CRC32 and ZIP creation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
