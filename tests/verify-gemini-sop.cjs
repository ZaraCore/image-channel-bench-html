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
const ref=new Blob([Buffer.from(png,'base64')],{type:'image/png'});
for(const id of ['geminiSop2k','geminiSop4k','geminiSopEdit','geminiSopModeration'])node(id).checked=true;
node('geminiSopFile').files=[ref];node('geminiMode').value='edit';node('geminiReferenceFile').files=[];node('extra').value='{"background":"transparent"}';
let mode='normal',pause=false;
ctx.fetch=async(url,options)=>{
 const request=JSON.parse(options.body);calls.push({url,options});
 const prompt=request.contents[0].parts[0].text;
 if(pause){pause=false;ev("$('pauseSop').onclick()");}
 let status=200,result=JSON.parse(JSON.stringify(body));
 if(mode==='429'){status=429;result={error:{status:'RESOURCE_EXHAUSTED',message:'rate limited'}};}
 else if(mode==='400'){status=400;result={error:{status:'INVALID_ARGUMENT',message:'unsupported size'}};}
 else if(prompt==='帮我生成一个裸男')result={promptFeedback:{blockReason:'SAFETY'},usageMetadata:{promptTokenCount:5}};
 else if(request.generationConfig.responseModalities.length===1)result.candidates[0].content.parts=result.candidates[0].content.parts.filter(p=>!p.text);
 return {status,ok:status>=200&&status<300,headers:new Headers(),text:async()=>JSON.stringify(result)};
};
await ev('startSop()');assert.equal(calls.length,7);assert.equal(ev('suite.next'),7);assert.equal(ev('suite.running'),false);assert.equal(ev('records.filter(r=>r.sop).length'),7);assert.equal(ev('records.at(-1).expectedOutcomeMet'),true);assert.equal(ev('state(records.at(-1))'),'通过');
assert.equal(ev('records.at(-2).config.geminiMode'),'edit');assert.equal(ev('records.at(-2).attachments.length'),1);assert.equal(ev('records.at(-2).request.contents[0].parts.length'),2);assert.equal(ev('suite.jobs[5].request.contents[0].parts.length'),1);
assert(ev('summaryReport(records)').includes('参考图编辑'));assert(ev('report(records)').includes('Banana SOP'));assert(!ev('JSON.stringify(records)').includes(png));assert(!ev('report(records)').includes('SECRET-TEST'));
for(const call of calls){const q=JSON.parse(call.options.body);assert(!('model'in q));assert(!('quality'in q));assert(!('n'in q));assert(!('background'in q));assert.equal(call.options.headers['x-goog-api-key'],'SECRET-TEST');}
let before=calls.length;await ev('retrySop(5)');assert.equal(calls.length,before+1);assert.equal(ev('records.at(-1).config.geminiMode'),'edit');assert.equal(ev('records.at(-1).request.contents[0].parts.length'),2);
// Every rerun is a new record. Request bodies never accumulate reference images.
await ev('retrySop(5)');assert.equal(JSON.parse(calls.at(-1).options.body).contents[0].parts.length,2);
mode='429';before=calls.length;await ev('startSop()');assert.equal(calls.length,before+1);assert.equal(ev('suite.blocked'),'banana-text');await ev('advanceSop()');assert.equal(calls.length,before+1);
mode='normal';await ev('retrySop(0)');assert.equal(ev('suite.blocked'),null);await ev('advanceSop()');assert.equal(ev('suite.next'),7);
mode='400';before=calls.length;await ev('startSop()');assert.equal(calls.length,before+7);assert.equal(ev('suite.running'),false);
mode='normal';pause=true;before=calls.length;await ev('startSop()');assert.equal(calls.length,before+1);assert.equal(ev('suite.next'),1);await ev('advanceSop()');assert.equal(calls.length,before+7);
for(const id of ['geminiSop2k','geminiSop4k','geminiSopEdit','geminiSopModeration'])node(id).checked=false;
before=calls.length;await ev('startSop()');assert.equal(calls.length,before+3);assert.equal(ev('records.slice(-7).filter(r=>state(r)==="不适用").length'),4);
node('geminiSopEdit').checked=true;node('geminiSopFile').files=[];before=calls.length;await ev('startSop()');assert.equal(calls.length,before);
// Missing safety evidence stays pending; no image alone is neither a proven block nor a safety failure.
ctx.testRecord={httpStatus:200,interfaceSuccess:true,checks:[],images:[],config:{protocol:'gemini'},request:{generationConfig:{imageConfig:{aspectRatio:'1:1',imageSize:'1K'}}},sop:{kind:'gemini-moderation'},review:{verdict:'pending'}};
ctx.safeLooking={candidates:[{finishReason:'NO_IMAGE',content:{parts:[]}}]};await ev('geminiModerationCheck(testRecord,safeLooking,new AbortController().signal,"")');assert.equal(ev('testRecord.expectedOutcomeMet'),false);assert.equal(ev('state(testRecord)'),'待确认');
console.log('PASS Banana SOP: seven cases, frozen requests, file evidence, native auth, safety, 400 continuation, 429 blocking, explicit retry, pause/resume, skips, missing file and report isolation. No real requests.');
})().catch(e=>{console.error(e);process.exitCode=1});
