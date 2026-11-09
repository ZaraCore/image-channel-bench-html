// Runs the actual page script with mocked browser APIs and network responses.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1],nodes={};
const node=id=>nodes[id]??={value:'',innerHTML:'',textContent:'',files:[],addEventListener(){},querySelectorAll(){return[];},setAttribute(){}};
let calls=0;
const ctx=vm.createContext({console,Blob,URL,TextEncoder,Uint8Array,Uint16Array,Uint32Array,DataView,AbortController,performance,crypto:require('node:crypto').webcrypto,atob,setTimeout,clearTimeout,setInterval,clearInterval,document:{getElementById:node},window:{addEventListener(){}},Image:class{set src(v){this.naturalWidth=1024;this.naturalHeight=1024;queueMicrotask(()=>this.onload());}},fetch(){throw Error('Unmocked fetch');}});
vm.runInContext(script,ctx);const ev=s=>vm.runInContext(s,ctx);
function estimate(model,quality,width=1024,height=1024,price=30){ctx.args={model,quality,width,height,outputPricePerMillion:price};return ev('estimateImageOutput(args)');}
const expected={
 'gpt-image-2':{low:196,medium:1756,high:7024},
 'gpt-image-2.5':{low:196,medium:439,high:1756,xhigh:3122,max:7024},
 'gpt-image-2.6':{low:823,medium:1449,high:1756,xhigh:3122,max:7024}
};
for(const [family,table]of Object.entries(expected))for(const [q,t]of Object.entries(table))assert.equal(estimate(family,q).outputTokens,t);
for(const family of ['2.5','2.6'])for(const variant of ['sunburst','flare'])assert.equal(estimate('gpt-image-'+family+'-'+variant,'medium').outputTokens,expected['gpt-image-'+family].medium);
assert.equal(estimate('gpt-image-2.6','max').outputCostDisplay,'$0.21072');assert.equal(estimate('gpt-image-2.6','medium').baseTokens,439);
assert.equal(ev('roundHalfEven(10.5)'),10);assert.equal(ev('roundHalfEven(11.5)'),12);
// N/R=10.5: low, ratio 32/21. Tests tie-to-even within the full formula.
assert.equal(estimate('gpt-image-2','low',1024,672).M,10);
assert.equal(estimate('gpt-image-2','high',1536,1024).outputTokens,estimate('gpt-image-2','high',1024,1536).outputTokens);
for(const [w,h]of [[0,1024],[1025,1024],[640,640],[3856,1024],[3072,768],[3840,3840]])assert.throws(()=>estimate('gpt-image-2','low',w,h));
assert.doesNotThrow(()=>estimate('gpt-image-2','low',1024,640));assert.doesNotThrow(()=>estimate('gpt-image-2','low',3840,2160));
for(const [m,q]of [['unknown','medium'],['gpt-image-2','max'],['gpt-image-2.6','auto']])assert.throws(()=>estimate(m,q));
assert.equal(estimate('gpt-image-2','low',1024,1024,null).outputCostUSD,null);assert.equal(estimate('gpt-image-2','low',1024,1024,0).outputCostUSD,0);assert.throws(()=>estimate('gpt-image-2','low',1024,1024,-1));
for(const [k,v]of Object.entries({channel:'Mock',baseUrl:'https://mock.invalid',endpoint:'/v1/images/generations',apiKey:'fake-key',model:'gpt-image-2.6-sunburst',prompt:'test',size:'1024x1024',quality:'medium',timeout:'5',extra:'',outputTokenPrice:'30',priceMode:'none'}))node(k).value=v;
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jFQAAAABJRU5ErkJggg==';
ctx.fetch=async()=>{calls++;return {status:200,ok:true,headers:new Headers(),text:async()=>JSON.stringify({data:[{b64_json:png}],quality:'medium',usage:{output_tokens:1500,total_tokens:1600,output_tokens_details:{image_tokens:1450}}})};};
(async()=>{
ev('updateOutputPreview()');assert(node('outputTokenPreview').textContent.includes('1,449'));assert.equal(calls,0);
await ev('run()');assert.equal(calls,1);assert.equal(ev('records[0].outputEstimation.predicted.totalTokens'),1449);assert.equal(ev('records[0].outputEstimation.comparison.difference'),1);assert.equal(ev('records[0].usage.total_tokens'),1600);
ev("records[0].review.verdict='pass'");assert.equal(ev('state(records[0])'),'通过');const original=ev('JSON.stringify(records[0].outputEstimation)');
node('outputTokenPrice').value='60';ev('updateOutputPreview()');assert.equal(ev('JSON.stringify(records[0].outputEstimation)'),original);
ev("$('reestimateOutput').onclick()");assert.equal(calls,1);assert.equal(ev('records[0].outputEstimationHistory.length'),1);assert.equal(ev('records[0].outputEstimationHistory[0].pricePerMillion'),30);assert.equal(ev('records[0].outputEstimation.pricePerMillion'),60);assert.equal(ev('state(records[0])'),'通过');
node('size').value='auto';node('quality').value='auto';await ev('run()');assert.equal(ev('records[1].outputEstimation.predicted.available'),false);assert.equal(ev('records[1].outputEstimation.resolved.totalTokens'),1449);
ctx.fixture=ev('({...records[0],request:{...records[0].request,n:2},images:[...records[0].images,...records[0].images]})');ev('fixture.outputEstimation=createOutputEstimation(fixture);finishOutputEstimation(fixture)');assert.equal(ev('fixture.outputEstimation.predicted.totalTokens'),2898);assert.equal(ev('fixture.outputEstimation.resolved.count'),2);
for(const format of ['svg','gif']){ctx.format=format;ev('fixture.request.output_format=format;fixture.outputEstimation=createOutputEstimation(fixture);finishOutputEstimation(fixture)');assert.equal(ev('fixture.outputEstimation.resolved.available'),false);}
ev("delete fixture.request.output_format;fixture.usage={total_tokens:999,output_tokens:888};fixture.outputEstimation=createOutputEstimation(fixture);finishOutputEstimation(fixture)");assert.equal(ev('fixture.outputEstimation.reportedImageTokens'),null);assert.equal(ev('fixture.outputEstimation.comparison'),null);
ctx.fetch=async()=>{calls++;throw Error('Failed to fetch');};await ev('run()');assert.equal(ev('records.at(-1).outputEstimation.resolved.available'),false);
const exported=ev('exportRecord(records[0])');ctx.savedRecord=exported;assert.equal(ev('normalizeImport(savedRecord).outputEstimation.predicted.totalTokens'),1449);assert.equal(ev('normalizeImport(savedRecord).config.outputTokenPrice'),'30');assert.equal(ev('normalizeImport(savedRecord).outputEstimationHistory.length'),1);
assert(ev('report(records).includes("image-output-frontend-v1")'));assert(ev('summaryReport(records).includes("图片输出估算参考")'));assert(!JSON.stringify(exported).includes('fake-key'));
assert(!ev('records.some(r=>r.checks.some(c=>c.name.includes("用量差异")))'));
// Anomalous reported usage is still convertible; the formula and actual billing remain separate.
ctx.anomaly=ev('({...records[0],request:{...records[0].request,quality:"high"},usage:{output_tokens_details:{image_tokens:7024}},outputEstimation:null})');
ev('anomaly.outputEstimation=createOutputEstimation(anomaly,"30");finishOutputEstimation(anomaly)');
assert.equal(ev('anomaly.outputEstimation.predicted.totalTokens'),1756);assert.equal(ev('anomaly.outputEstimation.resolved.totalTokens'),1756);assert.equal(ev('anomaly.outputEstimation.reportedOutputCost.amountUSD'),.21072);
assert(Math.abs(ev('anomaly.outputEstimation.reportedOutputCost.differenceFromResolvedUSD')-.15804)<1e-12);
assert(ev('outputEstimateText(anomaly.outputEstimation).includes("0.21072 USD（非已确认扣费）")'));assert(ev('report([anomaly]).includes("0.21072")'));assert(ev('summaryReport([anomaly]).includes("0.21072")'));
ctx.oldEstimate=ev('({...anomaly.outputEstimation})');delete ctx.oldEstimate.reportedOutputCost;assert.equal(ev('reportedOutputCost(oldEstimate).amountUSD'),.21072);
const frozen=ev('JSON.stringify(anomaly.outputEstimation)');node('outputTokenPrice').value='999';assert.equal(ev('reportedOutputCost(anomaly.outputEstimation).amountUSD'),.21072);assert.equal(ev('JSON.stringify(anomaly.outputEstimation)'),frozen);
for(const price of [null,undefined,-1,NaN]){ctx.price=price;assert.equal(ev('reportedOutputCost({...oldEstimate,pricePerMillion:price}).available'),false);}
assert.equal(ev('reportedOutputCost({...oldEstimate,pricePerMillion:0}).amountUSD'),0);
assert.equal(ev('reportedOutputCost({...oldEstimate,reportedImageTokens:0}).amountUSD'),0);
assert.equal(ev('reportedOutputCost({...oldEstimate,reportedImageTokens:null}).available'),false);
assert.equal(ev('reportedOutputCost({...oldEstimate,predicted:{available:false,reason:"SVG、GIF 或审核测试不套用静态图片输出公式"}}).available'),false);
assert.equal(ev('exportRecord(anomaly).outputEstimation.reportedOutputCost.amountUSD'),.21072);
ctx.anomalyExport=ev('exportRecord(anomaly)');assert.equal(ev('normalizeImport(anomalyExport).outputEstimation.reportedOutputCost.amountUSD'),.21072);
assert.equal(ev('state(anomaly)'),ev('state(records[0])'));assert.equal(calls,3);
console.log('PASS output tokens: all reference values, ties, rounding order, limits, model mapping, null/zero price, live preview, snapshots, auto resolution, comparison scope, manual verdict independence, multiple images, unsupported formats, failure, history and export. No real requests.');
})().catch(e=>{console.error(e);process.exitCode=1;});
