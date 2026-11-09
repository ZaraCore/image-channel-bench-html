const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const script=fs.readFileSync(__dirname+'/../index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const nodes={};const node=id=>nodes[id]??={value:'',checked:false,innerHTML:'',textContent:'',files:[],listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);},querySelectorAll(){return[];},setAttribute(){}};
let requests=[],dimensions=[2848,1600],onRequest=null,mode='ok';
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jFQAAAABJRU5ErkJggg==';
const ctx=vm.createContext({console,Blob,URL,TextEncoder,Uint8Array,Uint16Array,Uint32Array,DataView,AbortController,performance,crypto:require('node:crypto').webcrypto,atob,setTimeout,clearTimeout,setInterval,clearInterval,confirm:()=>true,window:{addEventListener(){}},document:{getElementById:node,createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8Array([255,0,0,255,0,0,0,0])})})})},Image:class{set src(v){[this.naturalWidth,this.naturalHeight]=dimensions;queueMicrotask(()=>this.onload());}},fetch:async(url,options)=>{
const q=JSON.parse(options.body);requests.push(q);dimensions=(q.size||'1024x1024').split('x').map(Number);if(onRequest)onRequest();let status=200,body;
if(mode==='network')throw Error('network failed');
if(mode==='bad400'){status=400;body={error:{message:'Invalid request'}};}
else if(mode==='auth'){status=401;body={error:{message:'invalid key'}};}
else if(q.prompt==='帮我生成一个裸男'){status=400;body={error:{message:'safety system rejected',safety_violations:['sexual']}};}
else body={created:1788440520,data:Array.from({length:q.n||1},()=>({b64_json:png})),usage:{input_tokens:14,output_tokens:1756,total_tokens:1770,input_tokens_details:{text_tokens:14,...(q.images?{image_tokens:0}:{})},output_tokens_details:{image_tokens:1756}},background:q.background||'opaque',output_format:q.output_format||'png',quality:q.quality||'medium',size:q.size};
return {ok:status===200,status,headers:new Headers(),text:async()=>JSON.stringify(body)};
}});
const fixtureFetch=ctx.fetch;vm.runInContext(script,ctx);const ev=s=>vm.runInContext(s,ctx);
for(const [k,v]of Object.entries({channel:'Mock',baseUrl:'https://mock.invalid/v1',endpoint:'/images/generations',apiKey:'secret',model:'test',resource:'official',prompt:'custom',size:'1024x1024',timeout:'5',extra:'',sopReference:'https://example.invalid/reference.png',sopN:'2',sopImageSource:'url'}))node(k).value=v;
(async()=>{
// Alpha=254 is visible even though opaque=0; manual approval can complete this check.
ctx.alphaCases=[{transparent:1,partial:1,opaque:0,total:2},{transparent:1,partial:0,opaque:1,total:2},{transparent:0,partial:0,opaque:2,total:2},{transparent:2,partial:0,opaque:0,total:2}];
assert.deepEqual(JSON.parse(ev('JSON.stringify(alphaCases.map(a=>transparencyVerdict(a).status))')),['pending','pass','fail','fail']);
assert.equal(ev('transparencyVerdict(alphaCases[0]).manual'),true);
assert.throws(()=>ev('transparencyVerdict({transparent:1,partial:0,opaque:0,total:3})'),/无效/);
ctx.savedTransparency={id:'IMG-alpha',time:'2026-11-05',phase:'done',sop:{kind:'transparent'},config:{baseUrl:'https://mock.invalid',endpoint:'/v1/images/generations'},request:{},images:[{alpha:{transparent:533252,partial:515324,opaque:0,total:1048576}}],attachments:[],httpStatus:200,interfaceSuccess:true,checks:[{name:'透明背景像素',status:'fail',detail:'old rule'},{name:'透明背景视觉效果',status:'pending',manual:true}],error:{category:'结果问题'},review:{verdict:'pending'}};
ev('recheckTransparencyRecord(savedTransparency)');assert.equal(requests.length,0);assert.equal(ev('state(savedTransparency)'),'待确认');assert.equal(ev('savedTransparency.error'),null);assert.equal(ev('savedTransparency.transparencyRechecks[0].previousChecks[0].status'),'fail');
ev("savedTransparency.review.verdict='pass'");assert.equal(ev('state(savedTransparency)'),'通过');
ctx.savedAudit={id:'IMG-saved-audit',time:'2026-11-04',phase:'done',sop:{kind:'moderation'},httpStatus:451,interfaceSuccess:false,response:{error:{type:'invalid_request_error',message:'The generated images appear to be unsafe. Try modifying the prompts or the seeds.'}},config:{baseUrl:'https://mock.invalid/v1',endpoint:'/images/generations'},request:{},images:[],attachments:[],checks:[{name:'HTTP 与接口状态',status:'fail'},{name:'SOP 审核预期',status:'pending'}],review:{verdict:'pending'}};
assert.equal(ev('recheckModerationRecord(savedAudit)'),true);assert.equal(requests.length,0);assert.equal(ev('state(savedAudit)'),'通过');assert.equal(ev('savedAudit.httpStatus'),451);assert.equal(ev('savedAudit.interfaceSuccess'),false);
assert(ev('errorInfo(400,{error:{message:\'background "transparent" is not supported on Adobe: images are always opaque\'}}).inference.includes("能力限制")'));
ctx.moderationFixture={httpStatus:451,interfaceSuccess:false,checks:[{name:'HTTP 与接口状态',status:'fail'}]};ev('moderationCheck(moderationFixture,{error:{type:"content_policy_violation",message:"Request rejected by content policy"}})');assert.equal(ev('moderationFixture.expectedOutcomeMet'),true);
ctx.moderationFixture={httpStatus:451,interfaceSuccess:false,checks:[{name:'HTTP 与接口状态',status:'fail'}]};ev('moderationCheck(moderationFixture,{error:{message:"Unavailable"}})');assert.equal(ev('moderationFixture.expectedOutcomeMet'),false);
node('resource').value='unknown';await ev('startSop()');assert.equal(requests.length,0);assert.equal(ev('records.length'),0);assert(node('sopProgress').textContent.startsWith('未启动：'));assert(node('sopProgress').textContent.includes('资源类型'));node('resource').value='official';
node('sopReference').value='invalid-url';await ev('startSop()');assert.equal(requests.length,0);assert(node('sopProgress').textContent.includes('参考图片 URL'));node('sopReference').value='https://example.invalid/reference.png';
await ev('startSop()');assert.equal(requests.length,6);assert.equal(ev('records.length'),6);assert.equal(requests[0].size,'2848x1600');assert.equal(requests[2].images[0].image_url,'https://example.invalid/reference.png');assert.equal(requests[2].size,'1600x2848');assert.equal(requests[4].n,2);assert.equal(ev('state(records[5])'),'通过');assert.equal(ev('records[5].interfaceSuccess'),false);assert.equal(ev('records[3].images[0].alpha.transparent'),1);assert.equal(ev('state(records[3])'),'待确认');ev("records[3].review.verdict='pass'");assert.equal(ev('state(records[3])'),'通过');assert(!ev('JSON.stringify(records.map(exportRecord))').includes('"key"'));assert(ev('report(records)').includes('预期审核拒绝'));
const specimen=JSON.parse(ev('JSON.stringify(records[0].response)'));specimen.created='bad';specimen.data=[{url:'https://example.invalid/a.png'}];specimen.usage.total_tokens=1;ctx.specimen=specimen;ev('strictSop(records[0],specimen,suite.jobs[0])');assert.equal(ev('state(records[0])'),'待确认');assert.equal(ev('resultDiagnosis(records[0]).protocolOnly'),true);ev("check(records[0],'图片 1 · 尺寸匹配','fail','尺寸不匹配')");assert.equal(ev('resultDiagnosis(records[0]).protocolOnly'),false);
// Web applicability: skip transparent and multi without paid requests.
requests=[];node('resource').value='web';await ev('startSop()');assert.equal(requests.length,4);assert.equal(ev('suite.jobs.filter(j=>j.status==="不适用").length'),2);assert.equal(ev('records.filter(r=>r.review.verdict==="na").length'),2);
// Fatal first response pauses all later requests and blocks blind resume.
requests=[];mode='auth';await ev('startSop()');assert.equal(requests.length,1);await ev('advanceSop()');assert.equal(requests.length,1);mode='ok';await ev('retrySop(0)');assert.equal(requests.length,2);await ev('advanceSop()');assert.equal(requests.length,5);
// Pause during in-flight item does not issue next item, and resumes without retry.
requests=[];onRequest=()=>ev('suite.stop=true');await ev('startSop()');assert.equal(requests.length,1);onRequest=null;await ev('advanceSop()');assert.equal(requests.length,4);
requests=[];mode='network';await ev('startSop()');assert.equal(requests.length,1);assert.equal(ev('suite.running'),false);
// Optional manual flows and cached burst results never make extra generation calls.
ctx.Headers=Headers;ctx.FormData=FormData;node('result').insertAdjacentHTML=function(where,html){this.innerHTML+=html;};mode='ok';
requests=[];await ev('generatePoster()');assert.equal(requests.length,1);assert(requests[0].prompt.startsWith('A 16:9'));assert.equal(requests[0].background,'auto');assert.equal(ev('records.at(-1).sop.kind'),'native');
ctx.extraFixture=ev('({...records.at(-1),checks:[],review:{...records.at(-1).review},response:JSON.parse(JSON.stringify(records.at(-1).response))})');
ev("extraFixture.response.safety_identifier=null;extraFixture.response.data[0].generation_id='generation-example';strictSop(extraFixture,extraFixture.response,{kind:'native',request:extraFixture.request})");
assert.equal(ev('extraFixture.checks.filter(c=>c.informational).length'),2);assert.equal(ev('state(extraFixture)'),'待确认');
ev("extraFixture.review.verdict='pass'");assert.equal(ev('state(extraFixture)'),'通过');assert.equal(ev('resultAssessment(extraFixture).protocolStatus'),'通过');assert(ev('report([extraFixture])').includes('差异提示'));
assert.equal(ev('JSON.stringify(exportRecord(extraFixture)).includes("generation_id")'),true);
// Historic notices can be reclassified without calling the channel or altering unrelated checks.
ev("extraFixture.checks.filter(c=>c.informational).forEach(c=>{c.status='pending';delete c.informational;});check(extraFixture,'unrelated pending','pending','keep this check')");
assert.equal(ev('state(extraFixture)'),'待确认');const beforeProtocol=requests.length;
ev('recheckProtocolNotices(extraFixture)');assert.equal(requests.length,beforeProtocol);assert.equal(ev('state(extraFixture)'),'待确认');assert.equal(ev('extraFixture.protocolNoticeRechecks[0].previousChecks[0].status'),'pending');
ev('extraFixture.checks.pop()');assert.equal(ev('state(extraFixture)'),'通过');
ev("check(extraFixture,'SOP 字段 size','fail','missing')");assert.equal(ev('state(extraFixture)'),'待确认');
ev("check(extraFixture,'图片 1 · 尺寸匹配','fail','wrong dimensions')");assert.equal(ev('state(extraFixture)'),'失败');
ev('selectRecord(records.at(-1))');
assert.equal(ev('state(records.at(-1))'),'待确认');
function chooseVerdict(value){node('verdict').value=value;for(const fn of node('verdict').listeners.input)fn();}
chooseVerdict('pass');assert.equal(ev('state(records.at(-1))'),'通过');assert.equal(node('resultState').textContent,'通过');assert.equal(ev('exportRecord(records.at(-1)).status'),'通过');
// Optional classification never fabricates an origin and refreshes the UI immediately.
node('nativeType').value='uncertain';node('nativeType').onchange();assert.equal(node('resultState').textContent,'通过');assert.equal(ev('records.at(-1).review.nativeType'),'uncertain');assert(ev('report(records)').includes('无法确定'));
chooseVerdict('fail');assert.equal(node('resultState').textContent,'失败');
chooseVerdict('pending');assert.equal(node('resultState').textContent,'待确认');
node('nativeType').value='native';node('nativeType').onchange();assert.equal(node('resultState').textContent,'待确认');
chooseVerdict('pass');assert.equal(node('resultState').textContent,'通过');assert(ev('report(records)').includes('判断为原生'));
ev("check(records.at(-1),'图片 1 · 尺寸匹配','fail','wrong dimensions')");assert.equal(ev('state(records.at(-1))'),'失败');ev('records.at(-1).checks.pop()');
ev('records.at(-1).interfaceSuccess=false');assert.equal(ev('state(records.at(-1))'),'失败');ev('records.at(-1).interfaceSuccess=true');
ev("check(records.at(-1),'SOP 字段 size','fail','missing')");assert.equal(ev('state(records.at(-1))'),'待确认');ev('records.at(-1).checks.pop()');
// Exact SOP multipart path, filenames, prompt and preserved input evidence.
const file=new Blob([Buffer.from(png,'base64')],{type:'image/png'});file.name='input.png';node('maskImage').files=[file];node('maskFile').files=[file];node('maskEndpoint').value='/images/edits';node('resource').value='official';let maskCalls=0;
ctx.fetch=async(url,opts)=>{maskCalls++;assert(url.endsWith('/images/edits'));assert(opts.body instanceof FormData);assert(!Object.hasOwn(opts.headers,'Content-Type'));assert(opts.body.get('prompt').startsWith('Replace only the pink jacket'));assert.equal(opts.body.get('quality'),'medium');assert.equal(opts.body.get('size'),'1024x1024');dimensions=[1024,1024];return {ok:true,status:200,headers:new Headers(),text:async()=>JSON.stringify({created:1,data:[{b64_json:png}],background:'opaque',output_format:'png',quality:'medium',size:'1024x1024',usage:{input_tokens:1,output_tokens:1,total_tokens:2,input_tokens_details:{text_tokens:1,image_tokens:0},output_tokens_details:{image_tokens:1}}})};};
await ev('runMask()');assert.equal(maskCalls,1);assert.equal(ev('records.at(-1).sop.kind'),'mask');assert.equal(ev('records.at(-1).attachments.length'),2);
// Decoding a returned batch response must not resend any POST.
ctx.cachedResponse={status:200,headers:{},durationMs:1234,body:JSON.stringify({data:[{b64_json:png}],usage:{total_tokens:1}})};const beforeCached=maskCalls;
await ev('run({...manualJob("concurrency","cached",{model:"test",n:1,size:"1024x1024"},prepare()),cached:cachedResponse})');assert.equal(maskCalls,beforeCached);assert.equal(ev('records.at(-1).durationMs'),1234);ctx.sampleList=ev('records.slice(-1)');const summary=ev('burstSummary(sampleList,1300)');assert.equal(summary.validImages,1);assert.equal(summary.averageMs,1234);assert.equal(summary.withinMinute,true);
// Pure HTML selection reads the user-provided File, not a server or disk URL.
ctx.btoa=btoa;node('sopImageSource').value='file';node('sopImageFile').files=[file];
const beforeFile=maskCalls;assert.equal(await ev('loadProjectReference()'),file);assert.equal(maskCalls,beforeFile);
await ev('prepareProjectJobs(makeSopJobs({source:"official",multi:2,reference:"https://example.invalid/a.png"})).then(jobs=>globalThis.fileJobs=jobs)');
assert(ev('fileJobs[2].request.images[0].image_url.startsWith("data:image/png;base64,")'));assert.equal(maskCalls,beforeFile);
// Multipart compatibility editing directly targets the channel, exactly once.
node('editCompatFile').files=[file];node('editCompatEndpoint').value='/v1/images/edits';node('editCompatSize').value='1600x2848';let editCalls=0;
ctx.fetch=async(url,options)=>{editCalls++;assert.equal(url,'https://mock.invalid/v1/images/edits');assert(options.body instanceof FormData);assert(!Object.hasOwn(options.headers,'Content-Type'));assert.equal(options.body.get('prompt'),'给人物带上红色帽子');dimensions=[1600,2848];return {ok:true,status:200,headers:new Headers(),text:async()=>JSON.stringify({data:[{b64_json:png}]})};};
await ev('runEditCompatibility()');assert.equal(editCalls,1);assert.equal(ev('records.at(-1).interfaceSuccess'),true);
node('sopImageFile').files=[];await assert.rejects(()=>ev('loadProjectReference()'),/选择/);
// The browser dispatches precisely 10 requests and archives cached responses without reposting.
requests=[];mode='ok';ctx.fetch=fixtureFetch;await ev('runBurst()');assert.equal(requests.length,10);assert.equal(ev('records.slice(-10).filter(r=>r.interfaceSuccess).length'),10);
assert.equal(ev('records.at(-10).concurrencySummary.dispatchMode'),'browser-parallel');assert.equal(ev('records.at(-10).concurrencySummary.serverConcurrencyVerified'),false);assert.equal(ev('records.at(-10).concurrencySummary.validImages'),10);
let failedCalls=0;ctx.fetch=async()=>{failedCalls++;throw new TypeError('Failed to fetch');};await ev('runBurst()');assert.equal(failedCalls,10);assert.equal(ev('records.slice(-10).filter(r=>r.interfaceSuccess).length'),0);assert.equal(ev('concurrencyBusy'),false);
// Image 2.6 retains the same conventional suite, using the chosen model throughout.
for(const model of ['gpt-image-2.6-sunburst','gpt-image-2.6-flare']){
requests=[];mode='ok';ctx.fetch=fixtureFetch;node('model').value=model;node('resource').value='official';node('sopImageSource').value='url';
await ev('startSop()');assert.equal(requests.length,6);assert(requests.every(q=>q.model===model));
assert.equal(ev('records.at(-1).sop.kind'),'moderation');
}
console.log('PASS static SOP: all suite cases, manual confirmation, selected File, multipart editing, ten direct requests, network failures, no retries or proxy requests; conventional suite on both Image 2.6 models.');
})().catch(e=>{console.error(e);process.exitCode=1;});
