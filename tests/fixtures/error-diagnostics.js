// Local rules only. Server claims, observed results and hypotheses remain separate.
// Ordered by specific evidence. Status codes alone never activate these rules.
const diagnosticRules = [
  {id:'account-not-found',title:'找不到账户',pattern:/account[_ -]?(?:not[_ -]?found|does not exist)|账户不存在|账号不存在|找不到帐?账户|找不到账号/i,
    meaning:'服务端报告无法找到账户。可能是密钥与渠道账户关联异常，也可能是渠道上游账户；具体账户层级尚未确定。',
    actions:['核对 Base URL 与密钥是否属于同一渠道，并在渠道后台核实账户状态。','若配置无误，请渠道依据请求标识检查密钥关联与上游账户配置；不能仅凭此错误判断余额耗尽。']},
  {id:'no-accounts',title:'没有可用账户',pattern:/no[_ -]?available[_ -]?accounts?|no[_ -]?healthy[_ -]?accounts?|无可用账户|无可用账号/i,
    meaning:'服务端报告没有可用账户；可能涉及资源池、调度或上游额度，不能据此认定你的 API Key 余额耗尽。',
    actions:['核对服务公告与账户余额，请渠道检查资源池、上游账户状态与调度日志。']},
  {id:'account-disabled',title:'账户停用或封禁',pattern:/account.{0,30}(?:disabled|suspended|deactivated|banned)|(?:disabled|suspended|banned).{0,20}account|账户.{0,8}(?:停用|封禁|禁用)|账号.{0,8}(?:停用|封禁|禁用)/i,
    meaning:'服务端报告账户受限；尚不清楚是你的账户还是渠道使用的上游账户。',
    actions:['在渠道后台核实账户状态；请渠道说明受限账户层级及恢复方式，不通过重复生成尝试解除限制。']},
  {id:'invalid-key',title:'密钥无效或被撤销',pattern:/invalid[_ -]?(?:api[_ -]?)?key|incorrect.{0,12}api.{0,5}key|api[_ -]?key[_ -]?(?:not[_ -]?found|revoked)|无效.{0,5}密钥|密钥.{0,6}(?:无效|撤销|不存在)/i,
    meaning:'服务端报告密钥无效或不可识别；需要核对渠道、认证方式与密钥状态。',
    actions:['核对渠道域名、Bearer 认证和密钥首尾空格；只在本机输入密钥，不要粘贴到报告或聊天。','在渠道后台确认密钥是否已撤销或复制错误；必要时由用户更换有效密钥。']},
  {id:'expired-credential',title:'凭据过期',pattern:/(?:token|key|credential|session)[_ -]?(?:has[_ -]?)?expired|expired[_ -]?(?:token|key|credential|session)|(?:令牌|密钥|会话|凭据).{0,5}过期/i,
    meaning:'服务端报告某项凭据已过期；可能是你的密钥，也可能是渠道上游会话。',
    actions:['确认该渠道使用的凭据类型及有效期；由渠道确认是否需要刷新上游会话，勿自行认定必须充值。']},
  {id:'missing-auth',title:'缺少认证信息',pattern:/missing.{0,20}(?:authorization|api[_ -]?key|bearer)|(?:authorization|api[_ -]?key).{0,20}(?:required|missing)|缺少.{0,8}(?:认证|密钥)/i,
    meaning:'服务端报告未收到所需认证信息；可能是请求未携带或渠道网关未接收。',
    actions:['确认已填写密钥；核对成功调用的认证方式，以及浏览器发出的请求是否携带 Authorization，不在日志中打印真实密钥。']},
  {id:'authentication-failed',title:'认证未通过',pattern:/authentication[_ -]?(?:error|failed)|unauthenticated|invalid[_ -]?token|认证失败|身份验证失败/i,
    meaning:'服务端报告认证失败，未必明确指出是用户密钥还是上游认证失败。',
    actions:['对照成功调用的域名和认证方式，并核实密钥状态；若本机配置无误，请渠道检查上游认证。']},
  {id:'project-organization',title:'项目或组织配置异常',pattern:/(?:organization|project).{0,30}(?:not found|does not exist|invalid|disabled)|(?:invalid|unknown).{0,15}(?:organization|project)|项目不存在|组织不存在/i,
    meaning:'服务端报告项目或组织不可识别或受限，不能直接归因于模型能力。',
    actions:['核对渠道要求的项目、组织和分组配置；若你没有配置这些字段，请渠道检查其上游项目归属。']},
  {id:'insufficient-balance',title:'余额或额度不足',pattern:/insufficient[_ -]?(?:quota|balance|credits?|funds)|(?:balance|credits?).{0,20}(?:insufficient|exhausted)|billing[_ -]?(?:hard[_ -]?)?limit[_ -]?reached|余额不足|额度.{0,6}(?:不足|耗尽|用完)|欠费/i,
    meaning:'服务端明确报告余额、额度或计费上限问题，但仍需区分你的渠道额度和上游账户额度。',
    actions:['查看渠道后台的余额、预算上限及账单；若显示充足，请渠道核查上游额度，确认后再决定是否充值或调整预算。']},
  {id:'quota-exceeded',title:'配额或周期用量超限',pattern:/quota[_ -]?(?:exceeded|limit)|(?:daily|monthly|usage).{0,20}limit.{0,15}(?:reached|exceeded)|配额超限|日限额|月限额/i,
    meaning:'服务端报告配额或周期上限被触发，不能直接等同于可用余额为零。',
    actions:['核对日／月用量、预算及重置时间；确认限制属于你的密钥、渠道分组还是上游账户，再决定等待或申请调整。']},
  {id:'billing-unavailable',title:'计费未启用或支付受限',pattern:/billing[_ -]?(?:not[_ -]?active|not[_ -]?enabled|disabled)|payment[_ -]?(?:required|failed)|支付失败|计费未启用/i,
    meaning:'服务端报告计费或支付配置受限；需要核实具体账户层级。',
    actions:['在渠道后台核实计费状态，并让渠道确认其上游支付配置；不要仅凭此信息直接充值。']},
  {id:'rate-limit',title:'请求速率受限',pattern:/rate[_ -]?limit|too[_ -]?many[_ -]?requests|requests?[_ -]?per[_ -]?minute|频率限制|请求过于频繁|速率限制/i,
    meaning:'服务端报告请求频率受限；不等于账户余额不足。',
    actions:['降低发送频率；若有 Retry-After，按其要求等待后再手动执行，不自动重试。']},
  {id:'concurrency-limit',title:'并发数量受限',pattern:/concurren(?:cy|t).{0,30}(?:limit|exceed|maximum)|too many.{0,15}(?:parallel|concurrent)|并发.{0,12}(?:上限|限制|超限|超过)/i,
    meaning:'服务端报告同时处理的请求数达到限制。',
    actions:['先停止发起新的并发批次，等待已有请求结束；与渠道核实可用并发数，再由用户决定是否进行 10 并发验收。']},
  {id:'model-unavailable',title:'模型不存在或未开放',pattern:/model[_ -]?not[_ -]?found|unknown[_ -]?model|model.{0,60}(?:does not exist|not available|not enabled)|模型.{0,12}(?:不存在|未开放|未启用)/i,
    meaning:'服务端报告当前模型不可识别或未开放；也可能涉及渠道别名与路由配置。',
    actions:['核对渠道给出的准确模型名称与当前分组可用模型；请渠道确认别名映射，不自动替换为其他模型。']},
  {id:'model-permission',title:'模型或分组权限不足',pattern:/(?:permission|access)[_ -]?denied|not authorized|do not have access|无权访问|权限不足|分组.{0,10}(?:无权限|未授权)/i,
    meaning:'服务端报告访问权限受限；需结合模型、分组、账户及访问策略确认。',
    actions:['核对密钥对应分组与模型授权；若权限已开通，请渠道查询访问策略及路由日志。']},
  {id:'channel-unavailable',title:'没有可用渠道或路由',pattern:/no[_ -]?available[_ -]?(?:channels?|providers?|routes?)|no[_ -]?healthy[_ -]?(?:upstreams?|providers?)|无可用渠道|无可用上游|没有可用渠道/i,
    meaning:'服务端报告没有可用渠道或上游路由，不能仅据此认定是用户参数错误。',
    actions:['请渠道核查模型与分组的路由、上游健康状态及资源供应；核对服务公告。']},
  {id:'unsupported-transparency',title:'不支持透明背景',pattern:/(?:background.{0,60}transparent|transparent.{0,60}background).{0,90}(?:not supported|unsupported|always opaque)|images are always opaque|不支持透明背景/i,
    meaning:'服务端明确报告透明背景能力受限；保留本项验收结果。',
    actions:['让渠道提供支持透明背景的资源后再手动验证；去掉 transparent 只是在改变测试，不能作为该能力通过的证据。']},
  {id:'image-fetch',title:'参考图片无法获取',pattern:/(?:failed|unable|cannot|could not).{0,30}(?:fetch|download|access).{0,30}(?:image|url)|(?:image|url).{0,30}(?:unreachable|inaccessible)|图片.{0,10}(?:下载失败|无法访问)|无法.{0,8}(?:下载|读取).{0,5}图片/i,
    meaning:'服务端报告参考图获取失败；你的浏览器能打开图片不等于渠道服务器能访问。',
    actions:['核对图片地址是否公开、是否过期或需要登录；与渠道确认图片 URL、data URI 或文件上传的支持方式。']},
  {id:'invalid-image',title:'图片编码或格式无效',pattern:/invalid[_ -]?(?:base64|image)|(?:image|base64).{0,40}(?:decode|corrupt|invalid|unsupported format)|unsupported.{0,15}image.{0,10}(?:type|format)|图片.{0,8}(?:损坏|格式不支持|编码错误)/i,
    meaning:'服务端报告输入图片编码、内容或实际格式不符合要求。',
    actions:['用图片软件打开原图，核对真实格式与大小；仅改文件扩展名不能转换格式。核对上传字段、base64 前缀及 Content-Type。']},
  {id:'invalid-mask',title:'遮罩不符合要求',pattern:/mask.{0,60}(?:invalid|must|required|missing|dimension|alpha|size|format)|(?:invalid|missing).{0,20}mask|遮罩.{0,10}(?:无效|尺寸|透明|缺失|格式)/i,
    meaning:'服务端报告 Mask 遮罩存在问题；具体约束以错误原文为准。',
    actions:['核对原图与遮罩真实尺寸、PNG 格式和透明通道；确认选择的是遮罩原文件及当前接口要求的 mask 字段。']},
  {id:'payload-too-large',title:'请求或图片过大',pattern:/payload[_ -]?too[_ -]?large|request entity too large|(?:file|image|request).{0,35}(?:too large|exceeds.{0,20}(?:size|bytes|mb))|文件过大|图片过大|请求体过大/i,
    meaning:'服务端报告请求体或上传文件超过限制；具体上限以渠道说明为准。',
    actions:['核对实际文件大小及 base64 额外体积；在独立诊断中使用符合上限的素材，保留原 SOP 失败记录。']},
  {id:'unsupported-media',title:'请求格式不受支持',pattern:/unsupported[_ -]?media[_ -]?type|content[_ -]?type.{0,40}(?:unsupported|must be|invalid)|multipart.{0,35}(?:boundary|invalid|missing)|不支持的媒体类型/i,
    meaning:'服务端报告请求编码或 Content-Type 不符合当前接口要求。',
    actions:['确认接口要求 JSON 还是 multipart 文件上传；文件上传由浏览器生成 multipart boundary，不手写不完整的 Content-Type。']},
  {id:'malformed-json',title:'请求 JSON 解析失败',pattern:/invalid[_ -]?json|malformed[_ -]?json|json.{0,30}(?:parse|syntax|decode).{0,20}(?:error|failed)|unexpected token.{0,25}json|JSON.{0,8}(?:格式错误|解析失败)/i,
    meaning:'服务端报告无法解析 JSON；可能涉及额外参数语法、编码或提交内容。',
    actions:['核对额外参数 JSON 的引号、逗号和类型，对比工具脱敏请求与成功 curl 请求；避免一次修改多个字段。']},
  {id:'server-parameter-error',title:'参数缺失、取值或能力不受支持',pattern:/(?:size|quality|response_format|background|output_format|image|mask|\bn\b|parameter|field).{0,90}(?:not supported|unsupported|not allowed|must be|required|missing|invalid|unknown)|(?:unsupported|unknown|missing|required|invalid).{0,35}(?:parameter|field|size|quality|response_format|background|output_format)|缺少必填|参数.{0,10}(?:不支持|无效|缺失|错误)/i,
    meaning:'服务端提供了参数约束线索；按原文和 param 字段核对，不能仅据此断言模型整体不可用。',
    actions:['核对被指出字段的类型、取值、必填条件与接口位置，在独立诊断中只调整一个相关字段后手动验证。','若 SOP 指定值被拒绝，保留原项未通过；兼容参数成功不能替代原验收要求。']},
  {id:'safety-rejection',title:'内容审核拒绝',pattern:/content[_ -]?(?:policy[_ -]?violation|filter)|safety[_ -]?(?:violation|system|check)|images appear to be unsafe|moderation.{0,30}(?:reject|block)|内容.{0,8}(?:违规|审核不通过)|安全策略拒绝/i,
    meaning:'服务端报告内容安全拒绝；普通生成与专门的审核验收应区别处理。',
    actions:['普通生成请检查提示词及输入图片是否符合渠道内容要求；SOP 审核项由审核规则单独判定，不因状态码直接改判通过。']},
  {id:'gateway-block',title:'网关或访问策略拦截',pattern:/cf-mitigated|cloudflare.{0,50}(?:challenge|blocked)|just a moment|error code: ?10(?:10|20)|access denied|captcha|verify you are human|IP.{0,12}(?:blocked|denied)|地域.{0,6}限制/i,
    meaning:'响应提示访问策略或验证页；尚不能确认请求已进入模型生成接口。',
    actions:['对照成功调用的网络、出口 IP 和请求地址；请渠道排查 WAF、地域或 IP 策略，不把 Cloudflare 标识本身当作模型故障证据。']},
  {id:'upstream-overload',title:'上游繁忙或容量不足',pattern:/overloaded|at capacity|server[_ -]?busy|temporarily unavailable|服务繁忙|容量不足|上游过载/i,
    meaning:'服务端报告暂时繁忙或容量受限；是否仍在处理需查渠道日志。',
    actions:['查看服务公告并减少新请求；确认已有任务及扣费后再决定何时手动执行。']},
  {id:'upstream-failure',title:'上游调用或服务错误',pattern:/upstream.{0,40}(?:error|failed|failure|reset)|bad gateway|internal[_ -]?server[_ -]?error|上游.{0,10}(?:失败|错误)|内部服务错误/i,
    meaning:'服务端报告上游或内部错误；不能从该信息确定是模型、资源路由还是网关故障。',
    actions:['将时间、请求 ID、CF-Ray 及脱敏请求交给渠道查询上游日志；先核实任务状态和扣费，避免重复生成。']},
  {id:'generation-failed',title:'生成任务失败',pattern:/image[_ -]?generation[_ -]?(?:failed|error)|failed to generate|生成任务失败|图片生成失败/i,
    meaning:'服务端报告生成失败，但该描述没有指明参数、审核还是上游执行问题。',
    actions:['请渠道根据任务 ID 或请求 ID 查询内部失败原因及扣费状态；原样重复请求不能帮助确定根因。']},
  {id:'network-dns',scope:'environment',title:'域名解析异常',pattern:/ENOTFOUND|EAI_AGAIN|getaddrinfo|name resolution|nodename nor servname|域名解析失败/i,
    meaning:'本机错误包含域名解析线索；未确认已到达渠道。',
    actions:['核对 Base URL 拼写、DNS 和网络连接；比较本机浏览器网络环境与成功 curl 调用。']},
  {id:'network-tls',scope:'environment',title:'证书或 TLS 异常',pattern:/CERTIFICATE_VERIFY_FAILED|certificate verify failed|SSL(?:Error| error)|TLS.{0,30}(?:failed|error)|证书.{0,10}(?:错误|失败|过期)/i,
    meaning:'本机错误提示证书或 TLS 握手异常；不是模型生成失败的直接证据。',
    actions:['检查系统时间、证书链和代理证书；保持证书验证开启，向渠道确认 HTTPS 配置。']},
  {id:'network-proxy',scope:'environment',title:'本机代理异常',pattern:/proxy.{0,30}(?:refused|failed|error|unreachable)|代理.{0,10}(?:失败|拒绝|异常|不可用)/i,
    meaning:'本机错误含代理连接异常线索，不能判断渠道模型能力。',
    actions:['核对浏览器使用的代理是否运行；静态页面无法控制系统代理，也不会自动重试。']},
  {id:'network-connection',scope:'environment',title:'连接拒绝、断开或重置',pattern:/ECONNREFUSED|ECONNRESET|connection.{0,15}(?:refused|reset|closed|aborted)|RemoteDisconnected|连接.{0,8}(?:拒绝|重置|断开)/i,
    meaning:'连接被拒绝或中断，具体发生在本机、代理还是远端尚未确定。',
    actions:['检查浏览器网络连接，并对照浏览器及系统代理设置；若请求可能已送达，先核对渠道任务和扣费。']},
  {id:'user-cancelled',scope:'environment',title:'用户停止等待',pattern:/用户停止|用户取消|user.{0,10}cancel/i,
    meaning:'用户停止的是本机等待，不能确认渠道已取消生成。',
    actions:['先查询渠道任务与账单；不要把停止等待视为未计费或自动再次生成的依据。']},
  {id:'network-timeout',scope:'environment',title:'本机等待超时',pattern:/ETIMEDOUT|timed? ?out|TimeoutError|等待超时|连接超时|读取超时/i,
    meaning:'本机等待超时；不证明服务端已停止生成或计费。',
    actions:['先查看渠道请求日志与扣费，再决定是否延长等待时间或手动重试；不自动重发。']},
  {id:'network-cors',scope:'environment',title:'浏览器明确报告跨域或混合内容限制',pattern:/blocked by CORS|cross-origin request blocked|mixed content|被跨域策略阻止|混合内容被阻止/i,
    meaning:'错误文本明确包含浏览器策略线索；普通 Failed to fetch 本身不足以确认 CORS。',
    actions:['检查页面与接口的 HTTP／HTTPS 组合；请渠道允许当前网页来源及请求头。静态工具不提供请求代理。']},
];
function diagnosticEvidence(r) {
  const body=r.response, candidates=body && typeof body==='object' ? [body.error,body.data?.error,body.errors?.[0],body] : [];
  if(Array.isArray(body?.detail)) candidates.unshift({message:body.detail.slice(0,8).map(x=>[Array.isArray(x.loc)?x.loc.join('.'):'',typeof x.msg==='string'?x.msg:''].filter(Boolean).join(': ')).join('; '),type:'validation_error'});
  const item=candidates.find(x=>typeof x==='string'||x && typeof x==='object' && (x.message||x.msg||x.detail||x.code||x.type)) || {};
  const scalar=x=>typeof x==='string'||typeof x==='number'?String(x):'';
  const message=typeof body==='string'?body:typeof item==='string'?item:scalar(item.message)||scalar(item.msg)||scalar(item.detail);
  const code=scalar(item.code)||scalar(body?.code), type=scalar(item.type), param=scalar(item.param)||scalar(item.parameter);
  const localText=[r.error?.server,r.error?.inference,r.error?.code,r.error?.type].map(scalar).join(' ');
  return {message,code,type,param,serverText:[message,code,type].join(' ').slice(0,12000),localText};
}
function matchDiagnosticRules(r,evidence) {
  const environment=!r.httpStatus||r.error?.category==='请求环境问题';
  return diagnosticRules.filter(rule=>(rule.scope==='environment'?environment:!environment&&!r.interfaceSuccess) && rule.pattern.test(rule.scope==='environment'?evidence.localText:evidence.serverText));
}
function diagnosticFor(r, history = []) {
  if(r.config?.protocol==='gemini'&&typeof geminiDiagnosticFor==='function')return geminiDiagnosticFor(r,history);
  if (r.review?.verdict === 'na' || r.expectedOutcomeMet) return null;
  const failed = (r.checks || []).filter(c => c.status === 'fail');
  if (r.interfaceSuccess && !failed.length && !r.error) return null;
  const evidence=diagnosticEvidence(r), matched=matchDiagnosticRules(r,evidence);
  const d = {rule:'unknown', ruleVersion:2, matches:matched.map(x=>({id:x.id,title:x.title,scope:x.scope||'server'})), certainty:'原因未确定', serverMessage:evidence.message.slice(0,600), errorType:evidence.type || null, errorCode:evidence.code || null, errorParam:evidence.param || null,
    facts:[], hypotheses:[], actions:[], comparison:null,
    trace:{time:r.time,url:r.requestUrl,requestId:r.requestId || null,ray:r.responseHeaders?.['x-bench-upstream-cf-ray'] || r.responseHeaders?.['cf-ray'] || null}};
  if (r.httpStatus) d.facts.push('收到 HTTP ' + r.httpStatus + '；此状态码本身不能定位具体失败参数或责任方。');
  const has = pattern => failed.some(c=>pattern.test(c.name));
  if (r.interfaceSuccess) {
    d.rule='result-check';d.certainty='检查结果已确认；底层原因未确定';
    d.facts.push(...failed.slice(0,4).map(c=>c.name+'：'+c.detail));
    if(has(/透明.*像素/)) {
      d.rule='opaque-image';d.hypotheses.push('当前返回图片没有满足透明像素要求；可能未执行透明背景参数，或当前资源不支持该能力。');
      d.actions.push('保存原图，在支持透明背景的软件中核对；响应写着 transparent 不能代替像素检查。','向渠道提供该记录，确认当前资源是否真正支持透明背景；不要仅去掉 transparent 就把原测试改判通过。');
    } else if(has(/尺寸匹配/)) {
      d.rule='image-size';d.hypotheses.push('渠道可能忽略尺寸、映射为固定档位，或返回了与请求不符的图片；需用原图和渠道日志核实。');
      d.actions.push('保存原图并查看实际像素尺寸；若与工具读数不同，先排查工具读图逻辑。','若读数一致，向渠道核实当前模型的尺寸支持及映射规则；不要缩放图片来掩盖不匹配。');
    } else {
      d.hypotheses.push('生成结果或返回协议不满足当前检查，不能仅据此断言模型不可用。');
      d.actions.push('逐项核对失败项与 SOP 要求；缺失的回显、Token 明细应由渠道补齐，不通过工具猜测填充。');
    }
  } else if (matched.length) {
    d.rule=matched[0].id;d.certainty=matched[0].scope==='environment'?'本机错误有具体线索；根因仍需核实':'服务端提供具体错误线索；根因及所属层级仍需核实';
    if(d.errorCode)d.facts.push('服务端错误 code：'+d.errorCode);
    if(d.errorType)d.facts.push('服务端错误 type：'+d.errorType);
    if(d.errorParam)d.facts.push('服务端指出参数：'+d.errorParam);
    if(matched[0].scope==='environment')d.facts.push('本机错误提示：'+evidence.localText.slice(0,600));
    for(const rule of matched.slice(0,3)) { d.hypotheses.push(rule.title+'：'+rule.meaning); d.actions.push(...rule.actions); }
    d.actions=[...new Set(d.actions)];
  } else if (!r.httpStatus || r.error?.category === '请求环境问题') {
    d.rule='environment';if(r.error?.inference)d.facts.push('本机错误提示：'+r.error.inference);d.facts.push('工具未取得可用的完整渠道响应；不能确认请求是否已经执行或计费。');
    d.hypotheses.push('网络、浏览器代理、证书或跨域等浏览器限制可能出错。');
    d.actions.push('核对网络连接、浏览器开发者工具错误和渠道跨域配置是否正常。','查看原始环境错误；先解决连接问题，再决定是否手动重试。');
  } else if (r.httpStatus === 400) {
    d.rule='bad-request';d.facts.push('服务端拒绝本次请求；不代表密钥余额耗尽，也不能单凭 400 判断模型整体不可用。');
    if (d.errorParam) d.facts.push('服务端指出参数：'+d.errorParam+'；请结合原始错误信息核对。');
    const fields=['size','quality','n','response_format','background','output_format','images','image','mask'].filter(k=>Object.hasOwn(r.request || {},k));
    d.hypotheses.push('待排查：当前资源接受的接口、参数格式及参数组合。此次包含 '+fields.join('、')+'；这些字段不是已确认的错误原因。');
    if (r.sop?.kind==='edit') d.actions.push('先向渠道确认 JSON images/image_url 是否受支持，及是否接受内嵌 data URI；本地原图存在不等于服务端支持这种提交格式。可手动使用独立的图生图兼容测试核对文件上传方式，该结果不替代 SOP 原测试。');
    else if(r.sop?.kind==='base64') d.actions.push('先排查其基础文生图参数组合；基础请求也失败时，不能单独认定 response_format 是原因。');
    d.actions.push('在独立诊断中保留原失败记录，每次只改变一个参数；优先对照该渠道已成功请求，不要反复原样重跑整套。每次生成都可能收费，须手动执行。','仍只有 Invalid request 时，将脱敏请求、时间、请求 ID／CF-Ray 交给渠道查询日志，要求给出具体参数或上游错误。');
  } else if ([401,403].includes(r.httpStatus)) {
    d.rule='access';d.hypotheses.push('可能涉及认证、权限、访问策略或网关拦截；403 不等于密钥一定错误。');
    d.actions.push('对照成功调用的 URL、认证方式和浏览器网络环境；查看是否返回 HTML 拒绝页，向渠道核对权限与日志。');
  } else if ([404,405,413,415,422].includes(r.httpStatus)) {
    const fallback={
      404:['http-not-found','接口路径、模型资源或路由未找到；仅凭状态码不能区分。','核对最终请求地址、/v1 拼接和渠道文档，使用成功调用的完整 URL 对照；请渠道确认模型路由。'],
      405:['http-method','当前地址拒绝请求方法；可能是接口或网关路由不匹配。','确认生成接口使用 POST，并检查最终路径是否误指向网页或其他资源。'],
      413:['http-payload','请求体过大状态；具体限制与拦截位置需看正文。','核对图片、遮罩及 base64 后的请求体大小，并向渠道确认限制。'],
      415:['http-media','请求媒体类型不受支持；具体编码要求尚需确认。','核对 JSON 与 multipart 的接口要求及 Content-Type，文件上传不要手写 boundary。'],
      422:['http-validation','服务端未能处理该请求内容，尚不能确定具体字段。','查找正文中的 detail、参数名与校验错误，核对类型、取值及必填条件；信息不足时请渠道查日志。']
    }[r.httpStatus];
    d.rule=fallback[0];d.hypotheses.push(fallback[1]);d.actions.push(fallback[2]);
  } else if (r.httpStatus===429) {
    d.rule='quota-or-rate';d.hypotheses.push('可能涉及并发、速率、额度或上游资源限制；具体以响应信息和渠道账单为准。');
    d.actions.push('核对余额与并发／速率限制；减少并发，按服务端 Retry-After（如有）等待后再手动执行。');
  } else if ([408,504,524].includes(r.httpStatus)) {
    d.rule='timeout';d.hypotheses.push('服务端或网关等待处理超时；无法仅凭超时确认任务已停止。');
    d.actions.push('先查渠道请求日志与扣费；网关超时不能靠单纯延长网页等待时间保证解决，避免立刻重复生成。');
  } else {
    d.hypotheses.push('需结合响应正文与渠道日志判断；不能由状态码直接认定模型故障。');
    d.actions.push('核对原始响应与请求信息，将本记录交给渠道查上游日志后再决定是否手动重试。');
  }
  const plain = x => !['edit','editcompat','mask','transparent','moderation'].includes(x.sop?.kind) && !['images','image','mask'].some(k=>Object.hasOwn(x.request||{},k));
  const same = x => x !== r && x.interfaceSuccess && plain(x) && plain(r) && x.config?.baseUrl===r.config?.baseUrl && x.config?.model===r.config?.model && (x.config?.group||'')===(r.config?.group||'') && (x.config?.transport||'browser-direct')===(r.config?.transport||'browser-direct') && x.requestUrl && x.requestUrl===r.requestUrl;
  if(d.rule==='bad-request') {
    const candidates=history.filter(same).map(x=>({record:x,changed:[...new Set([...Object.keys(x.request||{}),...Object.keys(r.request||{})])].filter(k=>JSON.stringify(x.request?.[k])!==JSON.stringify(r.request?.[k]))})).sort((a,b)=>a.changed.length-b.changed.length);
    if(candidates.length){
      const match=candidates[0];
      d.comparison={recordId:match.record.id,changed:match.changed,values:match.changed.filter(k=>['size','quality','n','response_format','background','output_format'].includes(k)).map(k=>({parameter:k,success:match.record.request?.[k]??'未发送',failed:r.request?.[k]??'未发送'}))};
      d.facts.push('同地址、模型、分组、接口和浏览器网络环境存在成功记录；请求顶层差异：'+(match.changed.join('、')||'未发现')+'。');
      d.hypotheses.push(match.changed.length===1?'仅一个可见请求字段不同，是优先排查线索；仍可能受时间、资源路由等影响，尚不能确认因果。密钥未保存，无法核实两次密钥是否相同。':'存在多个差异，不能从这些记录中锁定单一原因。密钥未保存，无法核实两次密钥是否相同。');
      d.actions.unshift(match.changed.includes('size') && typeof match.record.request.size==='string'?'可先复制原失败请求，仅将 size 改为成功记录的 '+match.record.request.size+'，手动执行一次诊断；其他字段保持原样。此举用于定位，不改变 SOP 指定尺寸或原判定。':'复制原失败请求，在独立诊断中只调整一个已列出的差异字段，手动核对结果。');
    }
  }
  return d;
}
function diagnosticMarkdown(r, history) {
  const d=diagnosticFor(r,history);if(!d)return '';
  const line=s=>md(String(s??'').replace(/[\r\n]+/g,' '));
  let out='**定位程度：'+line(d.certainty)+'**\n\n';
  if(d.matches.length)out+='- 识别类别：'+d.matches.map(x=>line(x.title)).join('、')+'\n';
  if(d.serverMessage)out+='- 服务端原话（节选）：'+line(d.serverMessage.slice(0,240))+'\n';
  for(const s of d.facts)out+='- 已知事实：'+line(s)+'\n';
  for(const s of d.hypotheses)out+='- 工具分析（待核实）：'+line(s)+'\n';
  if(d.comparison){out+='- 对照成功记录：['+line(d.comparison.recordId)+'](report.md#'+d.comparison.recordId.toLowerCase().replace(/[^a-z0-9_-]/g,'')+')\n';for(const v of d.comparison.values)out+='  - '+line(v.parameter)+'：成功请求 '+line(v.success)+'；失败请求 '+line(v.failed)+'\n';}
  out+='\n建议操作：\n\n'+d.actions.map((s,i)=>(i+1)+'. '+line(s)).join('\n')+'\n\n';
  out+='追查信息：'+line(r.time)+'；请求 ID：'+line(d.trace.requestId||'未返回')+'；CF-Ray：'+line(d.trace.ray||'未返回')+'。\n\n';
  return out;
}
function diagnosticHtml(r, history) {
  const d=diagnosticFor(r,history);if(!d)return '';
  return '<details><summary>错误排查：'+esc(d.matches[0]?.title||d.certainty)+'</summary><p><b>服务端原话：</b>'+esc(d.serverMessage||'未提供')+'</p>'+d.facts.map(s=>'<p><b>已知事实：</b>'+esc(s)+'</p>').join('')+d.hypotheses.map(s=>'<p><b>工具分析（待核实）：</b>'+esc(s)+'</p>').join('')+(d.comparison?'<p>对照成功记录：'+esc(d.comparison.recordId)+'</p>'+d.comparison.values.map(v=>'<p>'+esc(v.parameter)+'：成功 '+esc(String(v.success))+'；失败 '+esc(String(v.failed))+'</p>').join(''):'')+'<b>建议操作</b><ol>'+d.actions.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol><p>请求 ID：'+esc(d.trace.requestId||'未返回')+'；CF-Ray：'+esc(d.trace.ray||'未返回')+'</p></details>';
}
