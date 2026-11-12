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
(async()=>{
await ev('run()');assert.equal(calls.length,1);assert.equal(calls[0].url,'https://channel.invalid/v1beta/models/gemini-nano-banana-2.1:generateContent');assert.equal(calls[0].options.headers['x-goog-api-key'],'SECRET-TEST');assert(!('Authorization' in calls[0].options.headers));
const request=JSON.parse(calls[0].options.body);assert.deepEqual(Object.keys(request).sort(),['contents','generationConfig']);assert.deepEqual(request.generationConfig.imageConfig,{imageSize:'1K',aspectRatio:'1:1'});
assert.equal(ev('records[0].images.length'),1);assert.equal(ev('records[0].images[0].width'),1024);assert.equal(ev('records[0].usage.totalTokenCount'),1135);assert.equal(ev('records[0].estimatedCost'),null);assert.equal(ev('records[0].outputEstimation'),null);
const archive=ev('JSON.stringify(exportRecord(records[0]))');assert(!archive.includes(png));assert(!archive.includes('SECRET-TEST'));assert(archive.includes('opaque-signature'));assert(!ev('records[0].checks.some(c=>c.name==="data 数组")'));assert(ev('usagePanel(records[0])').includes('思考 Token'));
assert(!ev('summaryReport(records)').includes('SOP'));assert(ev('report(records)').includes('usageMetadata'));
const restored=ev('normalizeImport(exportRecord(records[0]))');assert.equal(restored.config.protocol,'gemini');assert.equal(restored.gemini.responseId,'req-banana');assert.equal(restored.usage.thoughtsTokenCount,3);
fixture={promptFeedback:{blockReason:'SAFETY'},usageMetadata:{promptTokenCount:12}};await ev('run()');assert.equal(ev('state(records[1])'),'失败');assert.equal(ev('records[1].interfaceSuccess'),true);assert.equal(ev('records[1].usage.promptTokenCount'),12);
fixture={candidates:[{finishReason:'STOP',content:{parts:[{text:'No image'}]}}]};await ev('run()');assert.equal(ev('state(records[2])'),'失败');assert(ev('usagePanel(records[2])').includes('未返回'));
fixture={...body,usageMetadata:{totalTokenCount:-1}};await ev('run()');assert(ev('records[3].checks.some(c=>c.name==="Gemini 用量 totalTokenCount"&&c.status==="fail")'));
fixture={...body,candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{inlineData:{mimeType:'image/png',data:'!!!'}}]}}]};await ev('run()');assert.equal(ev('state(records[4])'),'失败');
node('extra').value='{"n":2}';const before=calls.length;await ev('run()');assert.equal(calls.length,before);node('extra').value='';
node('geminiModel').value='../bad';await ev('run()');assert.equal(calls.length,before);
node('geminiModel').value='gemini-nano-banana-2.1';assert(!node('startSop').disabled);assert(!node('run').disabled);

// Visible presets update the exact model ID without making a request.
for(const model of ['gemini-3-pro-image','gemini-3.1-flash-image','gemini-nano-banana-2.1']){
 const count=calls.length;node('bananaPreset').value=model;node('bananaPreset').listeners.change();assert.equal(node('geminiModel').value,model);assert(node('requestUrlPreview').textContent.includes(model));assert.equal(calls.length,count);
}
node('geminiMode').value='edit';ev('syncGeminiUi()');assert.equal(node('geminiReferenceControls').hidden,false);
let count=calls.length;await ev('run()');assert.equal(calls.length,count);
const ref=new Blob([Buffer.from(png,'base64')],{type:'image/png'});node('geminiReferenceFile').files=[ref];fixture=body;fixture.usageMetadata={...usage,promptTokensDetails:[{modality:'TEXT',tokenCount:12},{modality:'IMAGE',tokenCount:258}]};
await ev('run()');assert.equal(calls.length,count+1);
const edit=JSON.parse(calls.at(-1).options.body);assert.equal(edit.contents[0].parts[1].inlineData.data,png);assert.equal(edit.contents[0].parts[1].inlineData.mimeType,'image/png');
assert.equal(ev('records.at(-1).config.geminiMode'),'edit');assert.equal(ev('records.at(-1).attachments.length'),1);assert.equal(ev('records.at(-1).geminiInput.mime'),'image/png');assert(ev('usagePanel(records.at(-1))').includes('输入 IMAGE'));assert(ev('report([records.at(-1)])').includes('reference.png'));
const exported=ev('exportRecord(records.at(-1))');assert(!JSON.stringify(exported).includes(png));const imported=ev('normalizeImport(exportRecord(records.at(-1)))');assert.equal(imported.config.geminiMode,'edit');assert.equal(imported.geminiInput.width,1024);assert.equal(imported.attachments[0].archivePath,exported.attachments[0].path);
ctx.archiveFiles=new Map([[exported.attachments[0].path,ref],[exported.images[0].path,ref]]);ctx.editImport=imported;await ev('restoreAssets(editImport,archiveFiles)');assert.equal(imported.attachments[0].blob.size,ref.size);
count=calls.length;node('geminiReferenceFile').files=[new Blob(['not an image'])];await ev('run()');assert.equal(calls.length,count);assert.equal(ev('records.at(-1).error.category'),'参考图准备问题');assert.equal(ev('records.at(-1).httpStatus'),null);
node('geminiReferenceFile').files=[{size:11*1024*1024}];await ev('run()');assert.equal(calls.length,count);
// Stopping during local file preparation must not send a request.
let release;node('geminiReferenceFile').files=[{size:ref.size,arrayBuffer:()=>new Promise(resolve=>release=resolve)}];const pending=ev('run()');assert(node('geminiMode').disabled);ev('active.cancelled=true;active.controller.abort()');release(await ref.arrayBuffer());await pending;assert.equal(calls.length,count);assert.equal(ev('records.at(-1).error.category'),'参考图准备问题');
// A selected reference is ignored after switching back to text generation.
node('geminiMode').value='text';await ev('run()');assert.equal(calls.length,count+1);assert.equal(JSON.parse(calls.at(-1).options.body).contents[0].parts.length,1);

node('protocol').value='openai';ev('syncGeminiUi(true)');assert.equal(node('endpoint').value,'/v1/images/generations');assert.equal(node('geminiControls').hidden,true);
console.log('PASS: Gemini request/auth isolation, image and thought handling, usage, redaction, report/recovery, blocking, missing/corrupt output, invalid usage, guards and protocol switch.');
})().catch(e=>{console.error(e);process.exitCode=1});
