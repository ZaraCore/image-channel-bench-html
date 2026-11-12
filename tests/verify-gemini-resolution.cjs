let imageWidth=1024,imageHeight=1024;
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const nodes={};const node=id=>nodes[id]??={value:'',textContent:'',innerHTML:'',disabled:false,files:[],addEventListener(name,fn){(this.listeners??={})[name]=fn},querySelectorAll(){return[]},setAttribute(){}};
const ctx=vm.createContext({console,Blob,URL,Headers,TextEncoder,Uint8Array,Uint16Array,Uint32Array,DataView,AbortController,performance,crypto:require('node:crypto').webcrypto,atob,btoa,document:{getElementById:node},window:{addEventListener(){}},setTimeout,clearTimeout,setInterval,clearInterval,Image:class{set src(v){this.naturalWidth=imageWidth;this.naturalHeight=imageHeight;queueMicrotask(()=>this.onload())}},fetch:async()=>{throw Error('Unexpected network')},confirm:()=>true});
vm.runInContext(script,ctx);const ev=s=>vm.runInContext(s,ctx);
for(const[k,v]of Object.entries({channel:'Banana test',protocol:'gemini',geminiModel:'gemini-nano-banana-2.1',geminiSize:'1K',geminiRatio:'1:1',baseUrl:'https://channel.invalid',apiKey:'SECRET-TEST',prompt:'cat',timeout:'5',priceMode:'token',price:'100',currency:'USD',extra:''}))node(k).value=v;
ev('syncGeminiUi(true)');
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jFQAAAABJRU5ErkJggg==';
const usage={promptTokenCount:12,candidatesTokenCount:1120,thoughtsTokenCount:3,totalTokenCount:1135,candidatesTokensDetails:[{modality:'IMAGE',tokenCount:1120}]};
const body={candidates:[{content:{parts:[{thought:true,inlineData:{mimeType:'image/png',data:png}},{text:'Here is your image'},{inlineData:{mimeType:'image/png',data:png},thoughtSignature:'opaque-signature'}]},finishReason:'STOP'}],usageMetadata:usage,responseId:'req-banana',modelVersion:'test-version',extraOfficialField:true};
let calls=[];let fixture=body;
ctx.fetch=async(url,options)=>{calls.push({url,options});return {status:200,ok:true,headers:new Headers(),text:async()=>JSON.stringify(fixture)}};

const rule=(model,ratio,size)=>{ctx.params={model,ratio,size};return ev('geminiResolutionRule(params.model,params.ratio,params.size)')};
const fake=(model,ratio,size)=>({phase:'done',config:{protocol:'gemini',model,geminiBillingModel:'gemini-3-pro-image'},request:{generationConfig:{imageConfig:{imageSize:size,aspectRatio:ratio}}},images:[],checks:[],review:{verdict:'pending',nativeType:'uncertain'}});
const inspect=(r,w,h,profile='auto',blob=new Blob(['decoded']))=>{ctx.dimensionRecord=r;ctx.dimensionImage={width:w,height:h,blob};ctx.dimensionProfile=profile;return ev('inspectGeminiResolution(dimensionRecord,dimensionImage,0,dimensionProfile)')};
// Independent ratio checks and explicitly scoped channel/observed rules.
let sample=fake('gemini-nano-banana-2.1','16:9','1K');
let evidence=inspect(sample,1376,768);assert.equal(evidence.ratioStatus,'pass');assert.equal(evidence.ratioTolerancePercent,1);assert.equal(evidence.status,'pending');assert(sample.checks.some(c=>c.name.endsWith('图片读取')&&c.status==='pass'));
sample.config.geminiRatioTolerance='0.5';assert.equal(inspect(sample,1376,768).ratioStatus,'fail');sample.config.geminiRatioTolerance='invalid';assert.equal(inspect(sample,1376,768).ratioStatus,'pending');
Object.assign(sample.config,{geminiRatioTolerance:'1',geminiRuleKind:'channel',geminiRuleModel:sample.config.model,geminiRuleRatio:'16:9',geminiRuleSize:'1K',geminiRuleWidth:'1376',geminiRuleHeight:'768',geminiRuleSource:'渠道书面尺寸说明',geminiRuleVersion:'channel-2026-11-12'});
evidence=inspect(sample,1376,768,'custom');assert.equal(evidence.status,'pass');assert.equal(evidence.rule.basisKind,'channel');assert.equal(evidence.rule.version,'channel-2026-11-12');assert.equal(inspect(sample,1024,576,'custom').status,'fail');
sample.config.geminiRuleKind='observed';evidence=inspect(sample,1376,768,'custom');assert.equal(evidence.status,'pending');assert.equal(evidence.referenceMatch,true);sample.config.geminiRuleModel='different-model';assert.equal(inspect(sample,1376,768,'custom').rule.available,false);
(async()=>{
// Explicit reference selection applies only to aliases and never to billing.
let alias=fake('nano-banana-2','1:1','1K');alias.config.geminiReferenceModel='gemini-3.1-flash-image';
let mapped=inspect(alias,1024,1024);assert.equal(mapped.status,'pass');assert.equal(mapped.rule.mappingMethod,'user-reference');assert.equal(mapped.rule.model,'nano-banana-2');assert.equal(mapped.rule.referenceModel,'gemini-3.1-flash-image');assert(mapped.detail.includes('由用户指定'));
assert.equal(inspect(alias,2048,2048).status,'fail');
alias.config.geminiReferenceModel='';assert.equal(inspect(alias,1024,1024).status,'pending');alias.config.geminiReferenceModel='made-up';assert.equal(inspect(alias,1024,1024).status,'pending');
alias.config.geminiReferenceModel='gemini-3.1-flash-image';assert.equal(inspect(alias,1024,1024,'gemini-3-pro-image').rule.referenceModel,'gemini-3-pro-image');
let official=fake('gemini-nano-banana-2.1','16:9','1K');official.config.geminiReferenceModel='gemini-3.1-flash-image';assert.equal(inspect(official,1376,768).status,'pending');

for(const model of ['gemini-3-pro-image','gemini-3.1-flash-image','gemini-nano-banana-2.1'])for(const[size,width]of [['1K',1024],['2K',2048],['4K',4096]]){assert.equal(inspect(fake(model,'1:1',size),width,width).status,'pass');}
for(const model of ['gemini-3-pro-image','gemini-3.1-flash-image'])for(const[ratio,dimensions]of [['16:9',[[1376,768],[2752,1536],[5504,3072]]],['9:16',[[768,1376],[1536,2752],[3072,5504]]],['2:3',[[848,1264],[1696,2528],[3392,5056]]],['3:4',[[896,1200],[1792,2400],[3584,4800]]]])for(const[i,size]of ['1K','2K','4K'].entries()){
 const result=inspect(fake(model,ratio,size),...dimensions[i]);assert.equal(result.status,'pass');assert.equal(result.ratioStatus,'pass');assert.equal(result.actualTier,size);
}
let r=fake('gemini-nano-banana-2.1','1:1','2K'),e=inspect(r,1024,1024);assert.equal(e.status,'fail');assert.equal(e.actualTier,'1K');assert.equal(e.ratioStatus,'pass');assert.equal(r.checks.at(-1).manual,undefined);
e=inspect(fake('gemini-3-pro-image','16:9','4K'),4096,2304);assert.equal(e.status,'fail');assert.equal(e.ratioStatus,'pass');
e=inspect(fake('gemini-3-pro-image','16:9','1K'),768,1376);assert.equal(e.status,'fail');assert.equal(e.ratioStatus,'fail');
e=inspect(fake('gemini-3.1-flash-image','1:1','2K'),2047,2048);assert.equal(e.status,'fail');
r=fake('gemini-nano-banana-2.1','16:9','1K');assert.equal(inspect(r,1376,768).status,'pending');assert.equal(inspect(r,1376,768,'gemini-3.1-flash-image').status,'pass');assert.equal(r.geminiResolution.items.at(-1).rule.explicitMapping,true);assert.equal(r.config.model,'gemini-nano-banana-2.1');
assert.equal(inspect(fake('custom-channel-model','1:1','2K'),2048,2048).status,'pending');assert.equal(inspect(fake('custom-channel-model','1:1','2K'),2048,2048,'gemini-3-pro-image').status,'pass');
assert.equal(rule('gemini-3-pro-image','1:1','8K').available,false);assert.equal(rule('gemini-3-pro-image','17:10','1K').available,false);
assert.equal(inspect(fake('gemini-3-pro-image','1:1','1K'),1024,1024,'auto',null).status,'pending');
// Real request pipeline uses decoded image dimensions rather than response claims.
node('geminiSize').value='2K';fixture={...body,imageSize:'2K',width:2048,height:2048};await ev('run()');assert.equal(ev('records[0].geminiResolution.items[0].status'),'fail');assert.equal(ev('state(records[0])'),'失败');
imageWidth=2048;imageHeight=2048;await ev('run()');assert.equal(ev('records[1].geminiResolution.items[0].status'),'pass');assert(!ev('records[1].checks.some(c=>c.name.includes("分辨率档位")&&c.status==="pending")'));
const before=calls.length;ev('selected=records[1]');ev("selected.review.nativeType='upscaled';selected.review.verdict='pass'");ev("selected.checks=selected.checks.filter(c=>!/^Gemini 图片 [0-9]+ (宽高比|分辨率档位)$/.test(c.name));selected.checks.push({name:'Gemini 图片 1 分辨率档位',status:'pending',manual:true,detail:'旧版本人工核对'})");ev('recheckGeminiResolution(selected)');assert.equal(calls.length,before);assert.equal(ev('selected.geminiResolutionHistory.length'),1);assert.equal(ev('selected.geminiResolutionHistory[0].previousChecks.find(c=>c.name.endsWith("分辨率档位")).manual'),true);assert.equal(ev('selected.review.nativeType'),'upscaled');assert.equal(ev('state(selected)'),'通过');
assert(ev('report(records)').includes('像素尺寸自动核对'));assert(ev('report(records)').includes('banana-resolution-2026-11-12-v3'));assert(!ev('report(records)').includes('SECRET-TEST'));
const imported=ev('normalizeImport(exportRecord(selected))');assert.equal(imported.geminiResolution.items[0].rule.expected.width,2048);assert.equal(imported.geminiResolutionHistory.length,1);
// JSON-only recovery cannot prove that a local image is decodable.
ctx.importedDimensions=imported;ev('recheckGeminiResolution(importedDimensions)');assert.equal(imported.geminiResolution.items[0].status,'pending');assert.equal(calls.length,before);
// Actual run freezes the user reference while sending the original alias.
imageWidth=1024;imageHeight=1024;node('geminiModel').value='nano-banana-2';node('geminiReferenceModel').value='gemini-3.1-flash-image';node('geminiSize').value='1K';node('geminiRatio').value='1:1';node('geminiBillingModel').value='auto';ev('syncGeminiUi()');assert.equal(node('geminiModelReferenceControls').hidden,false);await ev('run()');
assert.equal(JSON.parse(calls.at(-1).options.body).generationConfig.imageConfig.imageSize,'1K');assert(calls.at(-1).url.includes('nano-banana-2'));assert(!calls.at(-1).options.body.includes('geminiReferenceModel'));
assert.equal(ev('records.at(-1).config.geminiReferenceModel'),'gemini-3.1-flash-image');assert.equal(ev('records.at(-1).geminiResolution.items[0].status'),'pass');assert.equal(ev('records.at(-1).geminiAccounting.snapshot.referenceModel'),'nano-banana-2');assert.equal(ev('records.at(-1).geminiAccounting.snapshot.explicitMapping'),false);
const aliasRecovered=ev('normalizeImport(exportRecord(records.at(-1)))');assert.equal(aliasRecovered.config.geminiReferenceModel,'gemini-3.1-flash-image');assert.equal(aliasRecovered.geminiResolution.items[0].rule.mappingMethod,'user-reference');
const recheckCalls=calls.length;ev('recheckGeminiResolution(records.at(-1),"auto",{...records.at(-1).config,geminiReferenceModel:"gemini-3-pro-image"})');assert.equal(calls.length,recheckCalls);assert.equal(ev('records.at(-1).geminiResolutionHistory[0].previous.items[0].rule.referenceModel'),'gemini-3.1-flash-image');assert.equal(ev('records.at(-1).geminiResolution.items[0].rule.referenceModel'),'gemini-3-pro-image');
const savedConnections=new Map();ctx.localStorage={setItem:(k,v)=>savedConnections.set(k,v)};ev('saveConnection()');assert.equal(JSON.parse(savedConnections.get('image-bench-static-config-v1')).geminiReferenceModel,'gemini-3.1-flash-image');
node('geminiReferenceModel').value='';assert.equal(ev('records.at(-1).geminiResolution.items[0].status'),'pass');node('geminiModel').value='gemini-3-pro-image';ev('syncGeminiUi()');assert.equal(node('geminiModelReferenceControls').hidden,true);
console.log('PASS Banana resolution: square tiers, official rounded landscape/portrait sizes, downscaled and wrong-orientation failures, unknown rules, explicit mapping, measured pixels, no-request historical recheck, native-review separation and recovery.');
})().catch(e=>{console.error(e);process.exitCode=1});
