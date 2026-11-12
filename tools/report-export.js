// Embedded in index.html: report generation uses saved evidence only, never network calls.
function reportRawResponse(body,headers,status,key){
  const walk=(v,k='')=>{
    if(/authorization|api.?key|secret|access.?token|password|cookie|credential|(?:^|_)token$/i.test(k))return '[REDACTED]';
    if(typeof v==='string'){const clean=key?v.split(key).join('[REDACTED]'):v;return k==='data'||k==='b64_json'||k==='thoughtSignature'||/^data:image\/[^;]+;base64,/i.test(clean)?clean:scrub(clean,key);}
    if(Array.isArray(v))return v.map(x=>walk(x));
    if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([a,b])=>[a,walk(b,a)]));
    return v;
  };
  return {blob:new Blob([JSON.stringify({httpStatus:status,responseHeaders:walk(headers),response:walk(body),evidenceNote:'凭证已脱敏；JSON 解析后的响应正文，非逐字节 HTTP 抓包；响应头仅限浏览器可读字段；保留内嵌媒体'},null,2)],{type:'application/json'}),version:'response-evidence-v1'};
}
function reportResponsePath(r){return 'responses/'+r.id+'.json';}
function reportResponseDescriptor(r){return r.rawResponse?{version:r.rawResponse.version||'response-evidence-v1',path:reportResponsePath(r),saved:!!r.rawResponse.blob,credentialsRedacted:true,inlineMediaPreserved:true}:null;}
function reportReadable(value,key='',parent=''){
  if(typeof value==='string'){
    const opaque=/^(thought_?signature|b64_json)$/i.test(key)||(/^data$/i.test(key)&&/^(inline_?data)$/i.test(parent))||/^data:(?:image|audio|video)\/[^;]+;base64,/i.test(value);
    if(opaque&&!/^\[(?:图片|内嵌|已省略)/.test(value))return '[已省略 '+(key||'内嵌媒体')+'，'+value.length+' 字符；原值请查看 ZIP 中的记录及响应附件，附件是否留存见本条说明]';
    return value;
  }
  if(value instanceof Blob)return value;
  if(Array.isArray(value))return value.map(v=>reportReadable(v,'',key));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,reportReadable(v,k,key)]));
  return value;
}
function reportLocalLinks(text){return text.replace(/\]\(report\.md#([a-z0-9_-]+)\)/g,'](#$1)');}
function reportReaderNote(){return '阅读说明：正文省略不便阅读的签名和内嵌媒体，普通响应文本、错误信息及用量保留。完整已留存数据见 ZIP 中的 record.json、responses/ 与图片附件；旧数据缺失不会补造。单独 Markdown 不包含附件。\n\n';}
function reportRows(list){return list.filter(r=>r.phase!=='running');}
function reportCell(v){return md(String(v??'—').replace(/[\r\n]+/g,' '));}
function reportLink(r){return '['+reportCell(r.id)+'](report.md#'+String(r.id).toLowerCase().replace(/[^a-z0-9_-]/g,'')+')';}
function reportImageCount(r){return (r.images||[]).filter(im=>im.width>0&&im.height>0).length;}
function reportTestName(r){return r.sop?.name||r.sop?.kind||(r.config?.geminiMode==='edit'?'参考图编辑':'自定义文生图');}
function reportFindings(r){
  const failed=(r.checks||[]).filter(c=>c.status==='fail'&&!c.informational),images=reportImageCount(r);
  const media=failed.filter(c=>/MIME|媒体.*格式|格式.*匹配/.test(c.name||''));
  const interrupted=r.httpStatus==null&&r.interfaceSuccess!==true&&r.review?.verdict!=='na';
  const inference=r.error?.inference||'',interruption=interrupted?(/超过设定等待时间|等待超时/.test(inference)?'等待超时':/用户停止等待|用户手动取消/.test(inference)?'用户停止等待':'请求未完成，中断原因未留存或未明确'):null;
  const safety=r.sop?.kind==='gemini-moderation'?(r.geminiSafety||geminiSafetyObservation(r)):null;
  const manualWithoutNote=['pass','fail'].includes(r.review?.verdict)&&!String(r.review?.notes||'').trim();
  return {failed,images,media,interrupted,interruption,safety,manualWithoutNote};
}
function reportManualBasis(r){
  const verdict=r.review?.verdict,note=String(r.review?.notes||'').trim();
  if(!['pass','fail'].includes(verdict))return '';
  return '人工标记'+(verdict==='pass'?'通过':'失败')+'，'+(note?'依据：'+note:'未填写具体判断依据')+(r.review?.nativeType==='native'?'；原生分类为人工标记，不能据此独立验证原生生成':'');
}
function reportFindingLabel(r){const f=reportFindings(r);return [f.media.length?'媒体格式声明异常':null,f.interrupted?'请求未完成':null,f.safety?'安全结论：'+geminiSafetyLabel(f.safety.outcome):null,f.manualWithoutNote?'人工依据未填写':null].filter(Boolean).join('；')||'按已保存证据验收';}
function reportRetryGroups(rows){
  const groups=new Map();for(const r of rows){const q=r.request||{},g=q.generationConfig||{},c=r.config||{};
    const k=JSON.stringify([r.sop?.id||r.sop?.kind||'custom',r.sop?.section||'',c.protocol,c.geminiMode||'text',c.geminiReferenceModel||'',c.geminiResolutionModel||'auto',c.geminiRatioTolerance||'1',c.geminiRuleKind||'',c.geminiRuleVersion||'',c.geminiRuleWidth||'',c.geminiRuleHeight||'',(r.sop?.kind==='gemini-edit'||c.geminiMode==='edit')?r.id:null,g.responseModalities||null,g.imageConfig||null,q.size||null,q.quality||null,q.n||1,q.prompt||null,q.contents||null]);
    if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);
  }return [...groups.values()].filter(a=>a.length>1).map(a=>a.map((r,i)=>({r,i})).sort((a,b)=>String(a.r.time||'').localeCompare(String(b.r.time||''))||a.i-b.i).map(x=>x.r));
}
function reportOutcomePhrase(r){const f=reportFindings(r);return f.interrupted?f.interruption:f.images?'取得 '+(r.images||[]).filter(i=>i.width>0&&i.height>0).map(i=>i.width+'×'+i.height).join('、')+' 图片'+(f.media.length?'，但媒体格式声明不一致':''):reportReason(r);}
function reportReason(r){
  const finding=reportFindings(r);
  if(r.review?.verdict==='na')return '不适用／跳过，不代表支持';
  if(finding.interrupted)return finding.interruption+'；'+(Number.isFinite(r.durationMs)?'等待约 '+(r.durationMs/1000).toFixed(2)+' 秒；':'')+(finding.safety?'安全结论待确认，未取得拒绝或内容判断证据':'不能据此判断该生成能力不支持');
  if(finding.media.length)return (finding.images?'已取得可解码图片；':'')+'媒体格式声明不一致：'+finding.media.map(c=>c.detail||c.name).join('；')+'；属于格式一致性异常，不等同于未出图';
  if(r.sop?.kind==='gemini-moderation'){const safety=r.geminiSafety||geminiSafetyObservation(r);if(safety.outcome==='inconclusive')return '安全结论待确认：请求未完成或没有足够拒绝证据；未出图不判安全测试失败。'+(r.error?.inference||'');if(safety.outcome==='withheld')return '服务端明确未出图，符合本用例抑制出图预期；未证明具体安全原因。';if(safety.outcome==='safe')return '人工确认返回安全画面，符合本用例安全预期。';}
  if(r.expectedOutcomeMet)return '审核拦截符合该用例预期；原 HTTP 状态保留';
  if(['pass','fail'].includes(r.review?.verdict)&&!finding.failed.length)return reportManualBasis(r);
  const failed=(r.checks||[]).filter(c=>c.status==='fail'&&!c.informational),pending=(r.checks||[]).filter(c=>c.status==='pending'&&!c.informational);
  if(r.review?.verdict==='na')return '不适用／跳过，不代表支持';
  const reasons=failed.length?failed:pending;
  if(reasons.length)return [...new Set(reasons.map(c=>c.detail||c.name))].slice(0,3).join('；');
  if(!r.interfaceSuccess&&!r.expectedOutcomeMet)return '接口未成功，具体原因需结合服务端正文核实';
  if(state(r)==='待确认')return '尚未完成人工内容验收';
  return reportManualBasis(r)||'已保存检查及人工结论，范围仅限本次测试';
}
function reportCore(list){
  const rows=reportRows(list),count=s=>rows.filter(r=>state(r)===s).length;
  if(!rows.length)return '暂无可导出的完成记录。\n\n';
  return rows.length+' 次执行：接口成功 '+rows.filter(r=>r.interfaceSuccess).length+' 次，取得可解码图片 '+rows.filter(r=>reportImageCount(r)>0).length+' 次；功能验收 '+count('通过')+' 通过、'+count('失败')+' 失败、'+count('待确认')+' 待确认、'+count('不适用')+' 不适用。'+(count('失败')?'原记录存在验收失败项，需结合下方分类判断问题；不能直接解释为生成能力不支持。':count('待确认')?'仍有待确认项目，现有证据不足以完成渠道验收。':count('通过')?'已执行的适用项目通过，未执行能力不在结论范围内。':'没有适用验收结果，无法评价。')+'\n\n';
}
function reportClassSummary(rows){
 const count=fn=>rows.filter(r=>fn(reportFindings(r))).length,media=count(f=>f.media.length>0),interrupted=count(f=>f.interrupted),unknownSafety=count(f=>f.safety&&f.safety.outcome==='inconclusive'),manual=count(f=>f.manualWithoutNote);
 return '证据分类：'+media+' 条媒体格式声明异常；'+interrupted+' 条请求未完成；'+unknownSafety+' 条安全结论待确认；'+manual+' 条人工结论缺少文字依据。分类可重叠，与原验收计数分别展示。\n\n';
}
function reportOverviewTable(rows,all){
  let out='| 编号 | 测试 | 请求规格 | HTTP | 实际输出 | 耗时 | 验收结论及主要原因 |\n| --- | --- | --- | --- | --- | --- | --- |\n';
  for(const r of rows){const q=r.request||{},g=q.generationConfig||{},im=g.imageConfig||{},spec=r.config?.protocol==='gemini'?[g.responseModalities?.join('+'),im.imageSize,im.aspectRatio]:[q.size,q.quality,q.n!=null?q.n+' 张':null],images=(r.images||[]).filter(x=>x.width>0&&x.height>0);
    const hasFinalText=(r.response?.candidates||[]).some(c=>c?.content?.parts?.some(p=>!p?.thought&&typeof p?.text==='string'&&p.text.trim()));
    const output=images.length?images.map(x=>(x.mime||'图片')+' '+x.width+'×'+x.height).join('；'):'未取得可解码图片'+(hasFinalText?'；存在最终文本':'');
    out+='| '+(all.indexOf(r)+1)+' · '+reportLink(r)+' | '+reportCell(reportTestName(r))+' | '+reportCell(spec.filter(Boolean).join('；'))+' | '+(r.httpStatus??'未收到')+' | '+reportCell(output)+' | '+(Number.isFinite(r.durationMs)?(r.durationMs/1000).toFixed(2)+' 秒':'未留存')+' | '+state(r)+'：'+reportCell(reportReason(r))+' |\n';
  }return out+'\n';
}
function reportEvidenceGroups(list){
  const groups=new Map();for(const r of reportRows(list)){const c=r.config||{},key=JSON.stringify([c.channel,c.baseUrl,c.model,c.protocol,c.group||'',r.requestUrl||c.endpoint||'']);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}return [...groups.values()];
}
function reportConciseSummary(list){
  const all=reportRows(list);let out='## 核心结果\n\n'+reportCore(all)+reportClassSummary(all)+'统计覆盖本次导出的全部执行记录，包含重跑；不同渠道和模型分别列出。图片数量按已保存的尺寸记录统计，未重新解码历史图片。接口成功、取得图片和功能通过分别统计，不改变原验收结论。\n\n';
  for(const rows of reportEvidenceGroups(all)){const c=rows[0].config||{};
    out+='### '+reportCell(c.channel||'未填写渠道')+' · '+reportCell(c.model)+'\n\n'+(reportEvidenceGroups(all).length>1?reportCore(rows)+reportClassSummary(rows):'')+'- 执行范围：'+reportCell(c.protocol||'openai')+'；分组 '+reportCell(c.group||'未填写')+'；接口 '+reportCell(rows[0].requestUrl||c.endpoint)+'。\n';
    const observed=rows.filter(r=>reportImageCount(r)>0),specs=[...new Set(observed.flatMap(r=>(r.images||[]).filter(i=>i.width>0&&i.height>0).map(i=>i.width+'×'+i.height)))];
    out+='- 已观察到：'+(observed.length?'取得 '+observed.length+' 次图片输出，实际尺寸覆盖 '+specs.join('、')+(observed.some(r=>r.sop?.kind==='gemini-edit'||r.config?.geminiMode==='edit')?'；参考图编辑请求也取得图片，效果以人工评价为准':''):'尚无可解码图片证据')+'。\n';
    const failed=rows.filter(r=>state(r)==='失败'),pending=rows.filter(r=>state(r)==='待确认');
    out+='- 原记录失败项：'+(failed.length?failed.map(r=>reportCell(reportTestName(r))+'（'+reportLink(r)+'）').join('、'):'当前记录无明确验收失败项')+'。\n';
    out+='- 尚未确认：'+(pending.length?pending.map(r=>reportLink(r)+'：'+reportCell(reportReason(r))).join('；'):'原记录无待确认状态；但人工依据、原生生成及账单的证据完整性仍应单独核对')+'。像素尺寸不证明原生生成，响应型号声明不证明底层身份。\n\n#### 实验结果一览\n\n'+reportOverviewTable(rows,all);
    out+='#### 失败、异常与证据\n\n';
    const problems=rows.filter(r=>state(r)==='失败'||r.error||reportFindings(r).safety?.outcome==='inconclusive');
    for(const r of problems){const f=reportFindings(r),body=r.response,server=typeof body==='string'?body:body?.error?.message||body?.message;
      out+='- '+reportLink(r)+'【'+reportCell(reportFindingLabel(r))+'】：'+reportCell(reportReason(r))+'。';
      if(f.interrupted){const local=(r.checks||[]).find(c=>c.name==='请求完成')?.detail;out+=(local?' 本地错误原文：'+reportCell(local)+'。':'')+(r.error?.inference?' 已保存中断说明：'+reportCell(r.error.inference)+'。':' 没有明确中断原因，不能仅凭等待时长或 aborted 字样区分超时与手动停止。');}
      else if(!f.media.length)out+=server?' 服务端原话：'+reportCell(server)+'；具体原因未确定。':' 未保存明确服务端原因；不把诊断推测当作事实。';
      out+='\n';
    }
    if(!problems.length)out+='本组未记录明确失败或接口异常。\n';
    const retries=reportRetryGroups(rows);if(retries.length){out+='\n#### 同一用例的前后对照\n\n';for(const attempts of retries)out+='- '+reportCell(reportTestName(attempts[0]))+'：'+attempts.map((r,i)=>(i===0?'首次':i===attempts.length-1?'最近一次':'第 '+(i+1)+' 次')+' '+reportOutcomePhrase(r)+'（'+reportLink(r)+'）').join(' → ')+'。保留每次执行，不用后一次结果覆盖历史。\n';}
    const usageRows=rows.filter(r=>r.usage);if(usageRows.some(r=>r.usage?.billing_usage))out+='- 存在渠道扩展计费字段；属于口径核对线索，不足以证明模型身份或实际扣费。\n';
    const declared=[...new Set(rows.map(r=>r.gemini?.modelVersion).filter(Boolean))];if(declared.length>1)out+='- 响应型号声明不一致：'+declared.map(reportCell).join('、')+'；不据此认定实际切换了底层模型。\n';
    out+='\n#### 执行范围与用量\n\n| 编号 | 输入 Token | 候选／输出 Token | 总 Token | 响应型号声明 |\n| --- | ---: | ---: | ---: | --- |\n';
    for(const r of rows){const u=r.usage||{};out+='| '+(all.indexOf(r)+1)+' | '+(u.promptTokenCount??u.input_tokens??u.prompt_tokens??'—')+' | '+(u.candidatesTokenCount??u.output_tokens??u.completion_tokens??'—')+' | '+(u.totalTokenCount??u.total_tokens??'—')+' | '+reportCell(r.gemini?.modelVersion)+' |\n';}
    const unpaid=rows.filter(r=>r.review?.actualCost==null||String(r.review.actualCost).trim()==='').length;
    out+='\n以上为渠道报告值，未验证真实性；缺失不补零，无用量不等于免费。实际扣费 '+unpaid+'/'+rows.length+' 条未核对；不同币种和计价依据不合计。费用明细及价格快照见详细报告。\n\n#### 待完成事项\n\n';
    const mediaRows=rows.filter(r=>reportFindings(r).media.length),interruptedRows=rows.filter(r=>reportFindings(r).interrupted),safetyRows=rows.filter(r=>reportFindings(r).safety?.outcome==='inconclusive'),missingBasis=rows.filter(r=>reportFindings(r).manualWithoutNote);
    if(mediaRows.length)out+='- 向渠道核对媒体声明与实际文件类型不一致：'+mediaRows.map(reportLink).join('、')+'。\n';
    if(interruptedRows.length)out+='- 核对请求中断原因、渠道日志及扣费，再决定复测：'+interruptedRows.map(reportLink).join('、')+'。\n';
    if(safetyRows.length)out+='- 补充安全测试的有效响应证据，不把未完成请求认定为拦截成功或安全失败：'+safetyRows.map(reportLink).join('、')+'。\n';
    if(missingBasis.length)out+='- 补充人工判断依据，已有选择保持不变：'+missingBasis.map(reportLink).join('、')+'。\n';
    if(failed.some(r=>!reportFindings(r).media.length&&!reportFindings(r).interrupted))out+='- 根据表中具体原因核对其他失败项，保留复测证据。\n';
    if(pending.length)out+='- 完成待确认记录的内容或规则核对，按表中具体原因处理。\n';
    if(unpaid)out+='- 核对渠道承诺、计价映射和实际账单。\n';
    const groups=geminiChannelGroups(rows);for(const group of groups){out+='- 未执行或不适用：'+group.unmeasured.map(reportCell).join('、')+'；不能据此判定能力。\n';if(group.issueGroups.length)out+='- 重复问题合并：'+group.issueGroups.map(x=>reportCell(x.diagnosis.matches?.[0]?.title||'请求或响应异常')+' 涉及 '+x.records.length+' 条记录').join('；')+'。\n';for(const r of group.records.filter(r=>r.concurrencySummary))out+='- 浏览器并发：'+reportLink(r)+'，以保存的批次统计为准，不等同服务端真实并发。\n';}
    out+='\n';
  }return out;
}
function reportJson(value){let text=JSON.stringify(reportReadable(value??null),null,2);return '\n\n````json\n'+text.replace(/`{4,}/g,m=>'\\u0060'.repeat(m.length))+'\n````\n\n';}
function reportGeminiDetail(r,index){
  let out='<a id="'+String(r.id).toLowerCase().replace(/[^a-z0-9_-]/g,'')+'"></a>\n\n### '+(index+1)+'. '+reportCell(r.id)+'\n\n'+reportCell(reportTestName(r))+(r.sop?' · Banana SOP':'')+'；状态 '+state(r)+'；HTTP '+(r.httpStatus??'未收到')+'；耗时 '+(Number.isFinite(r.durationMs)?(r.durationMs/1000).toFixed(2)+' 秒':'未留存')+'。\n\n- 时间（UTC，原记录）：'+reportCell(r.time)+'\n- 渠道／请求模型：'+reportCell(r.config.channel)+'／'+reportCell(r.config.model)+'\n- 用户指定参考型号：'+reportCell(r.config.geminiReferenceModel||'未指定')+'\n- 请求地址：'+reportCell(r.requestUrl)+'\n- 请求 ID：'+reportCell(r.requestId||'未返回')+'\n\n';
  out+='结论说明：'+reportCell(reportReason(r))+'。'+(reportManualBasis(r)?' '+reportCell(reportManualBasis(r))+'。':'')+'\n\n';
  if(r.error)out+='#### 执行错误与中断依据（已保存值）'+reportJson(r.error);
  out+='#### 请求参数（脱敏，内嵌图片在正文中省略）'+reportJson(r.request);
  out+='#### 响应与留档范围\n\n'+(r.rawResponse?.blob?'本次已保存脱敏响应 JSON（保留内嵌媒体）：[响应附件]('+reportResponsePath(r)+')。':'完整响应附件未留存或尚未恢复；以下仅为已保存的正文／提取字段，不能视为完整原始响应。')+' 响应头仅包含浏览器可读字段；Markdown 省略媒体数据，单独下载不包含附件。\n';
  out+='响应头：'+reportJson(r.responseHeaders)+'已保存的响应正文（凭证脱敏，媒体省略）：'+reportJson(r.response)+(r.response?.usageMetadata?'用量见上方响应中的 usageMetadata；属于渠道报告值，非已核实账单。\n':'原始 usageMetadata／独立提取用量（渠道报告值，非账单）：'+reportJson(r.usage));
  out+='#### 检查与人工评价\n\n| 检查 | 结论 | 依据 |\n| --- | --- | --- |\n'+(r.checks||[]).map(c=>'| '+reportCell(c.name)+' | '+reportCell(c.status)+(c.informational?'（提示）':'')+' | '+reportCell(c.detail)+' |').join('\n')+'\n\n人工评价：'+reportJson(r.review);
  out+='#### 图片与参考附件\n\n';for(const im of exportRecord(r).images)if(im.path)out+='!['+reportCell(im.name)+']('+im.path+')\n\n';for(const a of exportRecord(r).attachments)if(a.path)out+='- ['+reportCell(a.name)+']('+a.path+')\n';
  if(r.geminiInput)out+='参考图信息：'+reportJson(r.geminiInput);
  if(r.geminiResolution||r.geminiResolutionHistory?.length)out+='#### 像素尺寸自动核对'+reportJson({current:r.geminiResolution,history:r.geminiResolutionHistory||[]});
  out+='#### 价格快照与核算历史\n\n'+geminiAccountingText(r);if(r.geminiAccounting||r.geminiAccountingHistory?.length)out+=reportJson({current:r.geminiAccounting,history:r.geminiAccountingHistory||[]});
  if(r.geminiSafety||r.geminiSafetyHistory?.length||r.sop?.kind==='gemini-moderation')out+='#### 安全响应分类与历史'+reportJson({current:r.geminiSafety||null,history:r.geminiSafetyHistory||[]});
  if(r.concurrencySummary)out+='#### 浏览器并发'+reportJson(r.concurrencySummary);return out;
}
const reportLegacyDetailed=report,reportLegacySummary=summaryReport;
summaryReport=function(list){const rows=reportRows(list).map(r=>reportReadable(r)),gpt=rows.filter(r=>r.config?.protocol!=='gemini');return '# 渠道评测总结\n\n'+reportConciseSummary(rows)+(gpt.length?'\n## GPT 专项能力与核对依据\n\n'+reportLegacySummary(gpt).replace(/^# [^\n]+\n/, ''):'')+'\n完整请求、响应及图片见 [详细报告](report.md)。单独 Markdown 不包含图片与 JSON 附件，请下载完整 ZIP 留档。总结中的跨文件链接要求详细报告命名为 report.md 并位于同一文件夹。\n';};
report=function(list){const rows=reportRows(list),gpt=rows.filter(r=>r.config?.protocol!=='gemini');return '# 渠道评测报告\n\n'+reportReaderNote()+reportLocalLinks(reportConciseSummary(rows))+'\n## 逐次请求与响应证据\n\n编号与总结一致；原结论及历史按已保存记录展示，不重新请求、不静默重新验收。\n\n'+(gpt.length?reportLocalLinks(reportLegacyDetailed(gpt)).replace(/^# [^\n]+\n/, '## GPT 专项详细证据\n'):'')+(rows.some(r=>r.config?.protocol==='gemini')?'\n## Banana 渠道验收汇总 · 详细证据\n\n':'')+rows.map((r,i)=>r.config?.protocol==='gemini'?reportGeminiDetail(r,i):'').join('\n')+gpt.map(r=>'\n### '+reportCell(r.id)+' 响应留档\n\n'+(r.rawResponse?.blob?'[脱敏响应 JSON]('+reportResponsePath(r)+')':'完整响应附件未留存或未恢复。')+'\n已保存响应头：'+reportJson(r.responseHeaders)+'已保存响应正文（媒体省略）：'+reportJson(r.response)).join('\n');};
