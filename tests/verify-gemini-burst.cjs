const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const nodes={};const node=id=>nodes[id]??={value:'',textContent:'',innerHTML:'',disabled:false,files:[],addEventListener(name,fn){(this.listeners??={})[name]=fn},insertAdjacentHTML(position,html){this.innerHTML+=html},querySelectorAll(){return[]},setAttribute(){}};
const ctx=vm.createContext({console,Blob,URL,Headers,TextEncoder,Uint8Array,Uint16Array,Uint32Array,DataView,AbortController,performance,crypto:require('node:crypto').webcrypto,atob,btoa,document:{getElementById:node},window:{addEventListener(){}},setTimeout,clearTimeout,setInterval,clearInterval,Image:class{set src(v){this.naturalWidth=1024;this.naturalHeight=1024;queueMicrotask(()=>this.onload())}},fetch:async()=>{throw Error('Unexpected network')},confirm:()=>true});
vm.runInContext(script,ctx);const ev=s=>vm.runInContext(s,ctx);
for(const[k,v]of Object.entries({channel:'Banana test',protocol:'gemini',geminiModel:'gemini-nano-banana-2.1',geminiSize:'1K',geminiRatio:'1:1',baseUrl:'https://channel.invalid',apiKey:'SECRET-TEST',prompt:'cat',timeout:'5',priceMode:'token',price:'100',currency:'USD',extra:''}))node(k).value=v;
ev('syncGeminiUi(true)');
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jFQAAAABJRU5ErkJggg==';
const usage={promptTokenCount:12,candidatesTokenCount:1120,thoughtsTokenCount:3,totalTokenCount:1135,candidatesTokensDetails:[{modality:'IMAGE',tokenCount:1120}]};
const body={candidates:[{content:{parts:[{thought:true,inlineData:{mimeType:'image/png',data:png}},{text:'Here is your image'},{inlineData:{mimeType:'image/png',data:png},thoughtSignature:'opaque-signature'}]},finishReason:'STOP'}],usageMetadata:usage,responseId:'req-banana',modelVersion:'test-version',extraOfficialField:true};
let calls=[];let fixture=body;
ctx.fetch=async(url,options)=>{calls.push({url,options});return {status:200,ok:true,headers:new Headers(),text:async()=>JSON.stringify(fixture)}};

(async()=>{
for(const[k,v]of Object.entries({geminiBillingModel:'auto',geminiChannelMode:'token',geminiMultiplier:'0.5',geminiMode:'edit'}))node(k).value=v;
node('geminiReferenceFile').files=[];node('extra').value='{"background":"transparent"}';
const valid=JSON.parse(JSON.stringify(body));valid.candidates[0].content.parts=valid.candidates[0].content.parts.filter(p=>!p.text);valid.usageMetadata={...usage,thoughtsTokenCount:0,totalTokenCount:1132,cachedContentTokenCount:0};
let waiters=[],inflight=0,peak=0;
ctx.fetch=(url,options)=>{
 calls.push({url,options});inflight++;peak=Math.max(peak,inflight);
 return new Promise((resolve,reject)=>{
   options.signal.addEventListener('abort',()=>{inflight--;reject(Error('Aborted'))},{once:true});
   waiters.push((status,result)=>{inflight--;resolve({status,ok:status>=200&&status<300,headers:new Headers(),text:async()=>JSON.stringify(result)})});
 });
};
const pending=ev('runGeminiBurst()');assert.equal(calls.length,10);assert.equal(peak,10);assert(node('runGeminiBurst').disabled);await ev('runGeminiBurst()');assert.equal(calls.length,10);
for(const call of calls){const q=JSON.parse(call.options.body);assert.equal(call.options.headers['x-goog-api-key'],'SECRET-TEST');assert(!('Authorization'in call.options.headers));assert.deepEqual(q.generationConfig,{responseModalities:['IMAGE'],imageConfig:{imageSize:'1K',aspectRatio:'1:1'}});assert.equal(q.contents[0].parts.length,1);}
waiters.forEach((release,i)=>{if(i<2)release(429,{error:{message:'rate limited'}});else if(i===2)release(200,{candidates:[{finishReason:'STOP',content:{parts:[{inlineData:{mimeType:'image/png',data:'!!!'}}]}}]});else release(200,valid)});await pending;
assert.equal(calls.length,10);assert.equal(ev('records.length'),10);assert.equal(ev('records[0].concurrencySummary.httpSuccess'),8);assert.equal(ev('records[0].concurrencySummary.validImages'),7);assert.equal(ev('records[0].concurrencySummary.serverConcurrencyVerified'),false);assert.equal(ev('records[0].concurrencySummary.errors["HTTP 429"]'),2);assert.equal(typeof ev('records[0].concurrencySummary.p95Ms'),'number');assert.equal(ev('records[3].geminiAccounting.snapshot.multiplier'),.5);assert.equal(ev('geminiBurst'),null);
assert(ev('summaryReport(records)').includes('浏览器并发'));assert(!ev('JSON.stringify(exportRecord(records[3]))').includes(png));assert(!ev('report(records)').includes('SECRET-TEST'));
const recovered=ev('normalizeImport(exportRecord(records[0]))');assert.equal(recovered.concurrencySummary.validImages,7);
// Stopping the batch aborts every in-flight wait and archives ten failures without retrying.
waiters=[];const cancelled=ev('runGeminiBurst()');assert.equal(calls.length,20);ev("$('stopGeminiBurst').onclick()");await cancelled;assert.equal(calls.length,20);assert.equal(ev('records.length'),20);assert.equal(ev('records[10].concurrencySummary.stopped'),true);assert.equal(ev('records[10].concurrencySummary.validImages'),0);assert.equal(ev('records[10].concurrencySummary.p50Ms'),null);assert.equal(ev('concurrencyBusy'),false);assert(!node('runGeminiBurst').disabled);assert(node('stopGeminiBurst').disabled);
console.log('PASS Banana burst: exactly ten parallel requests, fixed native parameters, no automatic retries, HTTP/image separation, valid-sample percentiles, billing snapshots, abort-all, evidence export and recovery.');
})().catch(e=>{console.error(e);process.exitCode=1});
