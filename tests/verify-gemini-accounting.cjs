const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const nodes={};const node=id=>nodes[id]??={value:'',textContent:'',innerHTML:'',disabled:false,files:[],addEventListener(name,fn){(this.listeners??={})[name]=fn},querySelectorAll(){return[]},setAttribute(){}};
const ctx=vm.createContext({console,Blob,URL,Headers,TextEncoder,Uint8Array,Uint16Array,Uint32Array,DataView,AbortController,performance,crypto:require('node:crypto').webcrypto,atob,btoa,document:{getElementById:node},window:{addEventListener(){}},setTimeout,clearTimeout,setInterval,clearInterval,Image:class{set src(v){this.naturalWidth=1024;this.naturalHeight=1024;queueMicrotask(()=>this.onload())}},fetch:async()=>{throw Error('Unexpected network')},confirm:()=>true});
vm.runInContext(script,ctx);const ev=s=>vm.runInContext(s,ctx);
for(const[k,v]of Object.entries({channel:'Banana test',protocol:'gemini',geminiModel:'gemini-nano-banana-2.1',geminiSize:'1K',geminiRatio:'1:1',baseUrl:'https://channel.invalid',apiKey:'SECRET-TEST',prompt:'cat',timeout:'5',priceMode:'token',price:'100',currency:'USD',extra:''}))node(k).value=v;
ev('syncGeminiUi(true)');
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jFQAAAABJRU5ErkJggg==';
const usage={promptTokenCount:12,candidatesTokenCount:1120,thoughtsTokenCount:3,totalTokenCount:1135,candidatesTokensDetails:[{modality:'IMAGE',tokenCount:1120}]};
const body={candidates:[{content:{parts:[{thought:true,inlineData:{mimeType:'image/png',data:png}},{text:'Here is your image'},{inlineData:{mimeType:'image/png',data:png},thoughtSignature:'opaque-signature'}]},finishReason:'STOP'}],usageMetadata:usage,responseId:'req-banana',modelVersion:'test-version',extraOfficialField:true};
let calls=[];let fixture=body;
ctx.fetch=async(url,options)=>{calls.push({url,options});return {status:200,ok:true,headers:new Headers(),text:async()=>JSON.stringify(fixture)}};

const close=(a,b)=>assert(Math.abs(a-b)<1e-12,a+' != '+b);
const record=(model='gemini-nano-banana-2.1')=>({config:{protocol:'gemini',model,geminiBillingModel:'auto',geminiChannelMode:'token',geminiMultiplier:'0.7',currency:'USD'},request:{generationConfig:{imageConfig:{imageSize:'1K',aspectRatio:'1:1'}}},response:{candidates:[]},usage:{promptTokenCount:100,candidatesTokenCount:1130,thoughtsTokenCount:20,totalTokenCount:1250,cachedContentTokenCount:0,candidatesTokensDetails:[{modality:'TEXT',tokenCount:10},{modality:'IMAGE',tokenCount:1120}]},interfaceSuccess:true,images:[{width:1024,height:1024,blob:new Blob(['image'])}],checks:[],review:{actualCost:''}});
function calc(r,s){ctx.testRecord=r;if(s)ctx.priceSnap=s;return ev(s?'calculateGeminiAccounting(testRecord,priceSnap)':'calculateGeminiAccounting(testRecord)')}
(async()=>{
let r=record(),e=calc(r);assert.equal(e.complete,true);close(e.totalUSD,.00015+.000075+.0336+.00015);close(e.channel.amountUSD,e.totalUSD*.7);assert.equal(e.imageComparison.difference,0);assert.equal(e.snapshot.explicitMapping,false);
for(const [model,input,text,image,k4]of [['gemini-3-pro-image',2,12,120,2000],['gemini-3.1-flash-image',.5,3,60,2520],['gemini-nano-banana-2.1',1.5,7.5,30,3780]]){
 r=record(model);e=calc(r);assert.equal(e.snapshot.prices.input,input);assert.equal(e.snapshot.prices.text,text);assert.equal(e.snapshot.prices.image,image);r.request.generationConfig.imageConfig.imageSize='4K';e=calc(r);assert.equal(e.expectedImage.tokens,k4);
}
r=record('banana-pro-channel-alias');e=calc(r);assert.equal(e.complete,false);assert.equal(e.totalUSD,null);assert.equal(e.expectedImage,null);r.config.geminiBillingModel='gemini-3-pro-image';e=calc(r);assert.equal(e.snapshot.explicitMapping,true);assert.equal(e.complete,true);close(e.components.find(c=>c.name==='图片输出').amountUSD,.1344);
r=record();delete r.usage.thoughtsTokenCount;e=calc(r);assert.equal(e.complete,false);assert.equal(e.totalUSD,null);assert(e.issues.some(x=>x.includes('思考')));assert(!e.components.some(c=>c.name==='思考输出'));
r=record();delete r.usage.candidatesTokensDetails;e=calc(r);assert(!e.components.some(c=>c.name==='图片输出'));assert.equal(e.imageComparison,null);
r=record();r.usage.candidatesTokensDetails.push({modality:'IMAGE',tokenCount:5});e=calc(r);assert(!e.components.some(c=>c.name==='图片输出'));
r=record();r.usage.candidatesTokenCount=999;e=calc(r);assert(!e.components.some(c=>c.name==='图片输出'));assert.equal(e.complete,false);
r=record();r.usage.totalTokenCount++;e=calc(r);assert.equal(e.complete,false);assert.equal(e.tokenReconciliation.equal,false);
r=record();r.usage.cachedContentTokenCount=50;e=calc(r);assert.equal(e.complete,false);close(e.components[0].amountUSD,50*1.5/1e6);
r=record();delete r.usage.cachedContentTokenCount;e=calc(r);assert.equal(e.complete,false);
r=record();r.usage.thoughtsTokenCount=-1;e=calc(r);assert.equal(e.complete,false);
r=record();r.usage.serviceTier='PRIORITY';e=calc(r);assert.equal(e.complete,false);
r=record();r.usage.toolUsePromptTokenCount=5;e=calc(r);assert.equal(e.complete,false);
r=record();r.response={candidates:[{content:{parts:[{text:'text here'}]}}]};r.usage.candidatesTokensDetails=[{modality:'IMAGE',tokenCount:1130}];e=calc(r);assert.equal(e.complete,false);
r=record();r.usage=null;e=calc(r);assert.equal(e.totalUSD,null);assert.equal(e.calculatedSubtotalUSD,null);assert.equal(e.channel.amountUSD,null);
r=record();r.config.geminiMultiplier='0';e=calc(r);assert.equal(e.channel.amountUSD,0);r.config.geminiMultiplier='';e=calc(r);assert.equal(e.channel.available,false);
r=record();r.config.geminiChannelMode='image';r.config.geminiImagePrice='0';r.usage=null;e=calc(r);assert.equal(e.channel.complete,true);assert.equal(e.channel.amountUSD,0);r.interfaceSuccess=false;e=calc(r);assert.equal(e.channel.available,false);
r=record();r.geminiAccounting=calc(r);r.review.actualCost='0.03';ctx.testRecord=r;assert(ev('geminiActualComparison(testRecord)').includes('差额'));r.config.currency='CNY';assert(ev('geminiActualComparison(testRecord)').includes('不自动折算'));
// An actual request freezes rates, repricing is explicit and preserves previous evidence.
for(const[k,v]of Object.entries({geminiBillingModel:'auto',geminiChannelMode:'token',geminiMultiplier:'0.5',geminiImagePrice:'',geminiMode:'text'}))node(k).value=v;
fixture=JSON.parse(JSON.stringify(body));fixture.candidates[0].content.parts=fixture.candidates[0].content.parts.filter(p=>!p.text);fixture.usageMetadata={promptTokenCount:12,candidatesTokenCount:1120,thoughtsTokenCount:0,totalTokenCount:1132,cachedContentTokenCount:0,candidatesTokensDetails:[{modality:'IMAGE',tokenCount:1120}]};await ev('run()');assert.equal(ev('records[0].geminiAccounting.snapshot.multiplier'),.5);assert.equal(ev('records[0].geminiAccounting.complete'),true);
const originalUsage=ev('JSON.stringify(records[0].usage)'),before=calls.length;node('geminiMultiplier').value='0.2';assert.equal(ev('records[0].geminiAccounting.snapshot.multiplier'),.5);ev("$('recalculateGemini').onclick()");assert.equal(calls.length,before);assert.equal(ev('records[0].geminiAccounting.snapshot.multiplier'),.2);assert.equal(ev('records[0].geminiAccountingHistory[0].snapshot.multiplier'),.5);assert.equal(ev('JSON.stringify(records[0].usage)'),originalUsage);
const restored=ev('normalizeImport(exportRecord(records[0]))');assert.equal(restored.geminiAccounting.snapshot.multiplier,.2);assert.equal(restored.geminiAccountingHistory.length,1);assert(ev('report(records)').includes('价格快照与核算历史'));assert(!ev('report(records)').includes('SECRET-TEST'));
console.log('PASS Banana accounting: exact model prices, explicit mapping, modality/total reconciliation, missing/invalid usage, cache/tools/tier exclusions, zero/blank prices, actual currencies, snapshots, no-request repricing and recovery.');
})().catch(e=>{console.error(e);process.exitCode=1});
