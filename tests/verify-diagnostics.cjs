// Every curated rule has an independent response fixture; no paid calls.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/fixtures/error-diagnostics.js','utf8');
const ctx=vm.createContext({md:s=>String(s),esc:s=>String(s).replace(/</g,'&lt;'),fetch(){throw Error('No diagnostic request allowed')}});
vm.runInContext(source,ctx);
const cases=[
 ['account-not-found','account not found'],['no-accounts','No available accounts'],['account-disabled','account suspended'],
 ['invalid-key','Incorrect API key provided'],['expired-credential','token expired'],['missing-auth','missing authorization'],
 ['authentication-failed','authentication_error'],['project-organization','project not found'],
 ['insufficient-balance','insufficient_quota'],['quota-exceeded','quota_exceeded'],['billing-unavailable','payment_required'],
 ['rate-limit','rate_limit_exceeded'],['concurrency-limit','concurrency limit exceeded'],['model-unavailable','model_not_found'],
 ['model-permission','permission denied'],['channel-unavailable','no available channels'],
 ['unsupported-transparency','background "transparent" is not supported on Adobe: images are always opaque'],
 ['image-fetch','failed to download image'],['invalid-image','invalid base64'],['invalid-mask','mask must have alpha channel'],
 ['payload-too-large','payload too large'],['unsupported-media','unsupported media type'],['malformed-json','invalid JSON'],
 ['server-parameter-error','size is not supported'],['safety-rejection','The generated images appear to be unsafe.'],
 ['gateway-block','Cloudflare challenge'],['upstream-overload','server busy'],['upstream-failure','upstream error'],['generation-failed','image_generation_failed'],
 ['network-dns','getaddrinfo ENOTFOUND',true],['network-tls','CERTIFICATE_VERIFY_FAILED',true],
 ['network-proxy','proxy connection refused',true],['network-connection','ECONNRESET',true],
 ['user-cancelled','用户停止等待',true],['network-timeout','ETIMEDOUT',true],['network-cors','blocked by CORS policy',true],
];
const base={id:'error-test',config:{},request:{size:'2848x1600'},checks:[],images:[],review:{verdict:'pending'},interfaceSuccess:false,httpStatus:400};
for(const [id,message,local] of cases){
 ctx.record={...base,...(local?{httpStatus:null,error:{category:'请求环境问题',server:message}}:{response:{error:{message}}})};
 const d=vm.runInContext('diagnosticFor(record)',ctx);
 assert.equal(d.rule,id,message);assert(d.actions.length,id);assert(d.matches.some(x=>x.id===id));
}
ctx.covered=cases.map(x=>x[0]);assert.equal(vm.runInContext('diagnosticRules.filter(x=>!covered.includes(x.id)).length',ctx),0,'Uncovered rule');
for(const response of [{error:{message:'Request rejected',code:'account_not_found'}},{data:{error:{message:'account not found'}}},{errors:[{message:'account not found'}]},{code:'account_not_found',message:'Request rejected'}]){
 ctx.record={...base,response};assert.equal(vm.runInContext('diagnosticFor(record).rule',ctx),'account-not-found');
}
ctx.record={...base,response:{error:{message:'account not found; insufficient balance'}}};
let d=vm.runInContext('diagnosticFor(record)',ctx);assert(d.matches.some(x=>x.id==='account-not-found'));assert(d.matches.some(x=>x.id==='insufficient-balance'));assert(d.hypotheses.length>=2);
ctx.record={...base,response:{error:{message:'Invalid request',type:'invalid_request_error'}}};assert.equal(vm.runInContext('diagnosticFor(record).rule',ctx),'bad-request');
ctx.record={...base,response:{error:{message:'An unrecognized provider error: XYZZY'}}};assert.equal(vm.runInContext('diagnosticFor(record).certainty',ctx),'原因未确定');
ctx.record={...base,httpStatus:null,error:{category:'请求环境问题',server:'Failed to fetch'}};assert.equal(vm.runInContext('diagnosticFor(record).rule',ctx),'environment');
ctx.record={...base,httpStatus:null,error:{category:'请求环境问题',server:'account not found'}};assert.equal(vm.runInContext('diagnosticFor(record).rule',ctx),'environment','Local strings must not become server claims');
ctx.record={...base,response:{error:{message:'CERTIFICATE_VERIFY_FAILED'}}};assert.equal(vm.runInContext('diagnosticFor(record).rule',ctx),'bad-request','Upstream text must not become a local TLS diagnosis');
ctx.record={...base,httpStatus:451,expectedOutcomeMet:true,response:{error:{message:'images appear to be unsafe'}}};assert.equal(vm.runInContext('diagnosticFor(record)',ctx),null);
for(const [status,rule] of [[404,'http-not-found'],[405,'http-method'],[413,'http-payload'],[415,'http-media'],[422,'http-validation'],[524,'timeout'],[429,'quota-or-rate']]){
 ctx.record={...base,httpStatus:status};assert.equal(vm.runInContext('diagnosticFor(record).rule',ctx),rule);
}
ctx.record={...base,httpStatus:400,response:{error:{message:'account not found'}}};const before=JSON.stringify(ctx.record);vm.runInContext('diagnosticFor(record)',ctx);assert.equal(JSON.stringify(ctx.record),before,'Diagnostics must not alter results');
console.log(`PASS: ${cases.length} curated rules; nested errors, code/type evidence, multiple matches, unknown fallback, local/server separation, status fallbacks and unchanged verdicts; no network.`);
if(process.argv.includes('--write-catalog')){
 const rules=vm.runInContext('diagnosticRules.map(({id,title,meaning,actions,scope})=>({id,title,meaning,actions,scope}))',ctx);
 let doc='# 错误诊断规则库\n\n这些是可维护的常见错误规则，不代表能穷尽所有渠道错误。规则依据服务端正文、code/type 或明确本机错误匹配；HTTP 状态码单独提供兜底排查，不能证明根因。\n\n';
 doc+='识别结果用于页面、summary.md、report.md 与 record.json 的 troubleshooting 字段，不改变接口状态、原 SOP 参数或验收结论，不发出请求、不自动重试。未知错误保留原文与追查信息；新经验可补充规则和独立测试样例。\n\n';
 doc+='## 已覆盖的错误\n\n| 规则 | 分类 | 范围 | 解释与操作 |\n| --- | --- | --- | --- |\n';
 for(const r of rules)doc+=`| ${r.id} | ${r.title} | ${r.scope==='environment'?'本机错误':'服务端报告'} | ${r.meaning} ${r.actions.join(' ')} |\n`;
 doc+='\n## 其他检查与兜底\n\n图片真实尺寸、透明像素、协议字段等结果问题继续按实际检查解释。404／405／413／415／422 与认证、限流、超时等状态均有兜底建议；普通 400 + Invalid request 保持“原因未确定”，可结合成功记录做单变量对照。Failed to fetch 不直接判为 CORS；No available accounts 不直接判为用户余额耗尽。\n\n## 如何扩展\n\n在 error-diagnostics.js 的 diagnosticRules 中添加明确匹配条件、解释和操作；为 tests/verify-diagnostics.cjs 添加真实脱敏错误样例，并检查是否与现有规则冲突。同步内嵌代码到 index.html，执行该测试以及 verify-summary.cjs、verify.cjs、verify-sop.cjs。不能把缺乏依据的猜测写成已确认根因。\n';
 fs.writeFileSync(__dirname+'/../ERROR_RULES.md',doc,'utf8');
}
