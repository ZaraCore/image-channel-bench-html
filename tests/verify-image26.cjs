// Offline integration checks against the actual page. No HTTP or browser service.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const nodes={},sections={};
const node=id=>nodes[id]??={value:'',textContent:'',innerHTML:'',files:[],disabled:false,hidden:false,listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);},querySelectorAll(){return[];},setAttribute(){},closest(){return sections[id]??={hidden:false};}};
const ctx=vm.createContext({console,Blob,URL,TextEncoder,Uint8Array,Uint16Array,Uint32Array,DataView,AbortController,performance,crypto:require('node:crypto').webcrypto,atob,setTimeout,clearTimeout,setInterval,clearInterval,document:{getElementById:node},window:{addEventListener(){}},Image:class{set src(v){this.naturalWidth=1024;this.naturalHeight=1024;queueMicrotask(()=>this.onload());}},fetch(){throw Error('Unmocked network prohibited');}});
vm.runInContext(script,ctx);const ev=s=>vm.runInContext(s,ctx);
for(const [k,v]of Object.entries({channel:'Mock',baseUrl:'https://mock.invalid',endpoint:'/v1/images/generations',apiKey:'fake-secret',model:'gpt-image-2.6-sunburst',prompt:'basic',timeout:'5',extra:'',complexityPrompt:'compare',svgPrompt:'vector',gifPrompt:'wave',gifFrames:'4',gifDelay:'200',priceMode:'token',price:'2',size:'1024x1024'}))node(k).value=v;
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jFQAAAABJRU5ErkJggg==';
let calls=[],mode='ok',afterRequest=null;
ctx.fetch=async(url,options)=>{const q=JSON.parse(options.body);calls.push(q);afterRequest?.();if(mode==='network')throw Error('Failed to fetch');const status=mode==='auth'?401:mode==='400'?400:200;return {status,ok:status===200,headers:new Headers(),text:async()=>JSON.stringify(status===200?{data:[{b64_json:png}],usage:{total_tokens:10}}:{error:{message:'Invalid request'}})};};
// Minimal real GIF byte stream: 1x1 frames, GCE delays, loop extension and trailer.
function gif(frames=4,delay=20,loop=true){return Uint8Array.from([...Buffer.from('GIF89a','ascii'),1,0,1,0,0x80,0,0,0,0,0,255,255,255,...(loop?[0x21,0xff,11,...Buffer.from('NETSCAPE2.0'),3,1,0,0,0]:[]),...Array.from({length:frames},()=>[0x21,0xf9,4,0,delay,0,0,0,0x2c,0,0,0,0,1,0,1,0,0,2,2,0x44,1,0]).flat(),0x3b]);}
(async()=>{
for(const model of ['gpt-image-2','gpt-image-2.5-sunburst','gpt-image-2.5-flare','gpt-image-2.6-sunburst','gpt-image-2.6-flare']){node('model').value=model;ev('syncImage26Ui()');const modern=model.includes('2.6');assert.equal(node('image26Tests').hidden,!modern);assert.equal(sections.startSop.hidden,false);assert.equal(sections.generatePoster.hidden,false);}
await ev("runImage26('complexity26')");assert.equal(calls.length,3);assert.deepEqual(calls.map(q=>q.complexity),['low','medium','high']);assert(calls.every(q=>q.model==='gpt-image-2.6-flare'&&q.prompt==='compare'&&q.output_format==='png'));
assert(ev('records.every(r=>!r.checks.some(c=>c.name.startsWith("SOP 字段")))'));
assert.equal(ev('state(records[0])'),'待确认');ev("records[0].review.verdict='pass'");assert.equal(ev('state(records[0])'),'通过');
const before=ev('records.length');await ev("runImage26('complexity26')");assert.equal(ev('records.length'),before+3);
calls=[];mode='400';await ev("runImage26('complexity26')");assert.equal(calls.length,3);
calls=[];mode='auth';await ev("runImage26('complexity26')");assert.equal(calls.length,1);
calls=[];mode='network';await ev("runImage26('complexity26')");assert.equal(calls.length,1);
calls=[];mode='ok';afterRequest=()=>ev('batch26.stop=true');await ev("runImage26('complexity26')");assert.equal(calls.length,1);afterRequest=null;
calls=[];node('model').value='gpt-image-2.5-flare';await ev("runImage26('svg26')");assert.equal(calls.length,0);node('model').value='gpt-image-2.6-sunburst';
node('gifFrames').value='17';await ev("runImage26('gif26')");assert.equal(calls.length,0);node('gifFrames').value='4';
assert(!html.includes('id="svgAuthorModel"'));assert(!html.includes('id="svgModelMode"'));
assert(/id="svgModelOptional"[^>]*value="gpt-6.1-sol"[^>]*required/.test(html));
for(const value of ['', '   ']){
node('svgModelOptional').value=value;node('svgModelOptional').listeners.input.forEach(fn=>fn());assert.equal(node('runSvg').disabled,true);
const beforeEmpty=ev('records.length');await ev("runImage26('svg26')");assert.equal(calls.length,0);assert.equal(ev('records.length'),beforeEmpty);
}
node('svgModelOptional').value='gpt-6.1-sol';node('svgModelOptional').listeners.input.forEach(fn=>fn());assert.equal(node('runSvg').disabled,false);
ev('concurrencyBusy=true;syncImage26Ui()');assert.equal(node('runSvg').disabled,true);ev('concurrencyBusy=false;syncImage26Ui()');assert.equal(node('runSvg').disabled,false);
// Even unrelated custom parameters must not alter the fixed SVG test request.
node('extra').value='{"svg":{"model":"legacy-author"},"stream":true,"partial_images":1,"output_compression":50,"prompt_rewriter":true}';
await ev("runImage26('svg26')");assert.equal(calls.length,1);
assert.deepEqual(calls[0],{model:'gpt-image-2.6-sunburst',prompt:'vector',n:1,quality:'medium',size:'1024x1024',output_format:'svg',svg:{model:'gpt-6.1-sol'}});
assert.equal(ev('records.at(-1).estimatedCost'),null);assert.equal(ev('state(records.at(-1))'),'失败');node('extra').value='';
ctx.gifBytes=gif();const a=ev('inspectGif(gifBytes)');assert.equal(a.frameCount,4);assert.equal(a.loop,0);assert.deepEqual([...a.delaysMs],[200,200,200,200]);
for(const bad of [gif().slice(0,-1),gif().slice(0,18),Uint8Array.from([1,2])]){ctx.bad=bad;assert.throws(()=>ev('inspectGif(bad)'));}
ctx.fetch=async(url,options)=>{calls.push(JSON.parse(options.body));return {status:200,ok:true,headers:new Headers(),text:async()=>JSON.stringify({data:[{b64_json:Buffer.from(gif()).toString('base64')}],usage:{total_tokens:10}})};};
await ev("runImage26('gif26')");assert.equal(ev('records.at(-1).images[0].animation.frameCount'),4);assert.equal(ev('state(records.at(-1))'),'待确认');ev("records.at(-1).review.verdict='pass'");assert.equal(ev('state(records.at(-1))'),'通过');
assert(ev('report(records).includes("动画帧数")'));assert(ev('summaryReport(records).includes("2.6 GIF 动画")'));assert(ev('summaryReport(records).includes("未执行或不适用的项目：文生图与协议")'));
const exported=ev('exportRecord(records.at(-1))');assert.equal(exported.images[0].animation.frameCount,4);assert(!JSON.stringify(exported).includes('fake-secret'));
ctx.recordFixture=exported;assert.equal(ev('normalizeImport(recordFixture).images[0].animation.frameCount'),4);
ctx.assets=new Map([[exported.images[0].path,new Blob([gif()])]]);await ev('restoreAssets(normalizeImport(recordFixture),assets)');
const archive=await ev('zip([{name:"animation.gif",blob:records.at(-1).images[0].blob}])');assert(archive.size>gif().length);
// Wrong frame count must remain a functional failure even after manual approval.
node('gifFrames').value='5';await ev("runImage26('gif26')");ev("records.at(-1).review.verdict='pass'");assert.equal(ev('state(records.at(-1))'),'失败');
assert.equal(ev('concurrencyBusy'),false);assert.equal(ev('batch26'),null);
// Supply DOM trees to test the SVG content policy independently of browser XML parsing.
const ns='http://www.w3.org/2000/svg';
const element=(localName,attrs=[])=>({localName,namespaceURI:ns,attributes:attrs.map(([name,value])=>({name,localName:name,value})),querySelectorAll:()=>[],getAttribute:name=>name==='viewBox'?'0 0 100 100':null});
const shape=element('path',[['fill','green']]),root=element('svg',[['xmlns',ns]]);root.querySelectorAll=()=>[shape];
let documentFixture={documentElement:root,querySelector:()=>null};ctx.DOMParser=class{parseFromString(){return documentFixture;}};
assert.equal(ev('inspectSvg("<svg/>").shapeCount'),1);
for(const attributes of [[['onclick','alert(1)']],[['href','https://example.invalid/x']],[['fill','url(https://example.invalid/x)']]]){shape.attributes=attributes.map(([name,value])=>({name,localName:name,value}));assert.throws(()=>ev('inspectSvg("<svg/>")'));}
shape.attributes=[];shape.localName='script';assert.throws(()=>ev('inspectSvg("<svg/>")'));shape.localName='path';
assert.throws(()=>ev('inspectSvg("<?xml-stylesheet href=\"x\"?><svg/>")'));
ctx.fetch=async()=>({status:200,ok:true,headers:new Headers(),text:async()=>JSON.stringify({data:[{b64_json:Buffer.from('<svg xmlns="'+ns+'"><path d="M0 0L1 1"/></svg>').toString('base64')}],usage:{total_tokens:10}})});
await ev("runImage26('svg26')");assert.equal(ev('records.at(-1).images[0].svg.shapeCount'),1);assert.equal(ev('records.at(-1).images[0].mime'),'image/svg+xml');assert(ev('records.at(-1).checks.some(c=>c.name.endsWith("SVG 坐标系"))'));ev("records.at(-1).review.verdict='pass'");assert.equal(ev('state(records.at(-1))'),'通过');
assert.equal(ev('exportRecord(records.at(-1)).request.svg.model'),'gpt-6.1-sol');
let authorRequest;
ctx.fetch=async(url,options)=>{authorRequest=JSON.parse(options.body);return {status:400,ok:false,headers:new Headers(),text:async()=>JSON.stringify({error:{message:'Mock rejection'}})};};
node('svgModelOptional').value='  gpt-6.1-sol  ';await ev("runImage26('svg26')");assert.deepEqual(authorRequest.svg,{model:'gpt-6.1-sol'});assert.equal(authorRequest.model,'gpt-image-2.6-sunburst');
assert.equal(ev('exportRecord(records.at(-1)).request.svg.model'),'gpt-6.1-sol');assert(ev('report(records).includes("gpt-6.1-sol")'));assert(node('result').innerHTML.includes('gpt-6.1-sol'));
node('svgModelOptional').value='gpt-5.6-sol';await ev("runImage26('svg26')");assert.equal(authorRequest.svg.model,'gpt-5.6-sol');
node('svgModelOptional').value='   ';const beforeBlank=ev('records.length');await ev("runImage26('svg26')");assert.equal(ev('records.length'),beforeBlank);
const countBeforeBad=ev('records.length');node('svgModelOptional').value='svg.model';await ev("runImage26('svg26')");assert.equal(ev('records.length'),countBeforeBad);node('svgModelOptional').value='';
// Old stored author settings are ignored and no longer saved. Historical requests remain intact.
let savedConfig;ctx.localStorage={setItem:(key,value)=>{savedConfig=value;}};ev('saveConnection()');assert(!Object.hasOwn(JSON.parse(savedConfig),'svgAuthorModel'));assert(!Object.hasOwn(JSON.parse(savedConfig),'svgModelMode'));
const legacyConfig={...JSON.parse(savedConfig),svgAuthorModel:'legacy-author',svgModelMode:'explicit'};
const fresh=vm.createContext({...ctx,localStorage:{getItem:()=>JSON.stringify(legacyConfig)},fetch:async(url,options)=>{const q=JSON.parse(options.body);assert(!Object.hasOwn(q,'svg'));return {status:400,ok:false,headers:new Headers(),text:async()=>JSON.stringify({error:{message:'SVG requires svg.model'}})};}});
vm.runInContext(script,fresh);await vm.runInContext("runImage26('svg26')",fresh);assert.equal(vm.runInContext('records.length',fresh),0);assert.equal(node('runSvg').disabled,true);
node('svgModelOptional').value='gpt-6.1-sol';ev('saveConnection()');assert.equal(JSON.parse(savedConfig).svgModelOptional,'gpt-6.1-sol');node('svgModelOptional').value='';
const restored=vm.createContext({...ctx,localStorage:{getItem:()=>savedConfig}});vm.runInContext(script,restored);assert.equal(node('svgModelOptional').value,'gpt-6.1-sol');
ctx.recordFixture.request.svg={model:'historical-author'};assert.equal(ev('normalizeImport(recordFixture).request.svg.model'),'historical-author');
console.log('PASS Image 2.6: model-specific UI, three controlled requests, errors/stop/no retries, reruns, SVG format mismatch/cost, GIF structure/frames/delays/loop, manual verdict, reports/redaction/ZIP/recovery. SVG DOM parsing requires browser checks.');
})().catch(e=>{console.error(e);process.exitCode=1;});
