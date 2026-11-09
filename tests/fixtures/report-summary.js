function summaryReport(list) {
  const clean = value => md(String(value ?? '').replace(/[\r\n]+/g, ' '));
  const short = value => clean(String(value ?? '').slice(0, 180));
  const names = {basic:'单次文生图',text:'文生图与协议',base64:'显式 base64 返回',edit:'JSON 图生图',transparent:'透明背景',multi:'多图生成',moderation:'审核拦截',native:'原生／超分',editcompat:'图生图兼容测试',mask:'Mask 编辑',concurrency:'10 并发',complexity26:'2.6 复杂度对照',svg26:'2.6 SVG 矢量图',gif26:'2.6 GIF 动画'};
  const kind = r => r.sop?.kind || 'basic';
  const applicable = r => r.review?.verdict !== 'na';
  const status = r => state(r);
  const readable = r => r.interfaceSuccess && r.images?.some(im => im.width > 0 && im.height > 0);
  const ref = r => '[' + clean(r.id) + '](report.md#' + String(r.id).toLowerCase().replace(/[^a-z0-9_-]/g, '') + ')';
  let out = '# 渠道评测总结\n\n生成时间：' + new Date().toISOString() + '\n\n';
  if (!list.length) return out + '暂无已完成的测试记录。\n';
  out += '> 根据已保存的检查与人工评价自动整理，不调用额外模型。覆盖本次导出的全部记录，包含重跑；不是独立测试轮数，不判断底层模型身份；错误分析区分事实、服务端原话与待核实原因。完整证据见 [report.md](report.md)。\n\n';
  const groups = new Map();
  for (const r of list) {
    const c = r.config || {}, key = JSON.stringify([c.channel,c.baseUrl,c.model,c.group]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  for (const rows of groups.values()) {
    const c = rows[0].config, tested = rows.filter(applicable), counts = {};
    for (const r of rows) counts[status(r)] = (counts[status(r)] || 0) + 1;
    const failures = tested.filter(r => status(r) === '失败');
    const pending = tested.filter(r => status(r) === '待确认');
    const count = s => counts[s] || 0;
    out += '## ' + clean(c.channel || '未命名渠道') + ' · ' + clean(c.model) + '\n\n';
    out += '- 地址：' + clean(c.baseUrl) + '；分组：' + clean(c.group || '未填写') + '\n';
    const times = rows.map(r => r.time).filter(Boolean).sort();
    out += '- 记录时间：' + clean(times[0]) + ' 至 ' + clean(times.at(-1)) + '（记录原始时间）\n';
    out += '- 执行记录 ' + rows.length + ' 条；接口成功 ' + rows.filter(r => r.interfaceSuccess).length + ' 条；功能通过 ' + count('通过') + ' 条；失败 ' + count('失败') + ' 条；待确认 ' + count('待确认') + ' 条；不适用 ' + count('不适用') + ' 条。\n\n';
    out += '**结论：' + (!tested.length ? '本组没有适用测试，无法评价。' : failures.length ? '当前记录存在验收失败项，尚不能认定符合本次验收要求。' : pending.length ? '尚有待确认项目，暂不能给出完整通过结论。' : '已执行的适用项目通过；结论仅覆盖这些项目。') + '**\n\n';
    if(rows.some(r=>protocolDifferences(r).some(x=>x.signal)))out+='> 扩展字段存在错误、降级或计费相关线索，请结合完整响应、渠道说明和账单核查；功能通过不等于这些线索已核实。\n\n';
    out += '### 已验证的表现\n\n';
    const good = [];
    const readableRows = tested.filter(readable);
    if (readableRows.length) good.push(readableRows.length + ' 条记录成功返回可解码图片；这不代表尺寸、编辑效果或画质已通过。证据：' + ref(readableRows[0]));
    const moderation = tested.filter(r => kind(r) === 'moderation' && r.expectedOutcomeMet);
    if (moderation.length) good.push('审核拦截符合该用例预期，共 ' + moderation.length + ' 条；不代表所有审核场景均已覆盖。证据：' + ref(moderation[0]));
    const transparent = tested.filter(r => kind(r) === 'transparent' && r.checks.some(x => /透明.*像素/.test(x.name) && x.status === 'pass'));
    if (transparent.length) good.push('透明背景检查检测到透明像素，共 ' + transparent.length + ' 条；边缘效果仍需人工确认。证据：' + ref(transparent[0]));
    const accepted = tested.filter(r => status(r) === '通过' && kind(r) !== 'moderation');
    if (accepted.length) good.push('功能通过的项目：' + [...new Set(accepted.map(r => names[kind(r)] || kind(r)))].map(clean).join('、') + '。');
    out += good.length ? good.map(x => '- ' + x).join('\n') + '\n\n' : '- 暂无足够证据列出已验证的优势。\n\n';
    out += '### 主要问题与限制\n\n';
    const issues = new Map();
    for (const r of tested) {
      for (const check of r.checks.filter(x => x.status === 'fail')) {
        const name = check.name.replace(/图片 \d+/g, '图片');
        if (!issues.has(name)) issues.set(name, {name,rows:new Set(),samples:new Set(),record:r});
        const issue = issues.get(name);issue.rows.add(r.id);issue.samples.add(check.detail || '未提供详情');
      }
    }
    const sorted = [...issues.values()].sort((a,b) => b.rows.size-a.rows.size);
    for (const issue of sorted.slice(0,6)) out += '- **' + clean(issue.name) + '**：涉及 ' + issue.rows.size + ' 条记录。示例：' + short([...issue.samples][0]) + '。证据：' + ref(issue.record) + '\n';
    if (sorted.length > 6) out += '- 另有 ' + (sorted.length-6) + ' 类失败检查，详见完整报告。\n';
    if (!sorted.length) out += failures.length ? '- 存在人工判定或接口失败，请查看下表及完整报告。\n' : '- 当前记录没有自动检查失败项；未覆盖的能力仍不能视为通过。\n';
    const diagnosticRows = tested.filter(r=>diagnosticFor(r,rows));
    if(diagnosticRows.length) {
      out += '\n### 错误原因与解决路径\n\n> 验收未通过不等于模型整体不可用。服务端只返回笼统错误时，以下给出排查路径，不把猜测写成根因；所有新请求均须手动执行。\n\n';
      const diagnosticGroups = new Map();
      for (const r of diagnosticRows) {
        const d=diagnosticFor(r,rows), q=r.request||{};
        const key=JSON.stringify([kind(r),r.httpStatus,d.rule,d.serverMessage,q.size,q.quality,q.n,q.response_format]);
        if(!diagnosticGroups.has(key))diagnosticGroups.set(key,[]);
        diagnosticGroups.get(key).push(r);
      }
      for(const items of diagnosticGroups.values()) {
        const r=items[0];
        out += '#### '+clean(names[kind(r)]||kind(r))+' · '+(r.httpStatus?'HTTP '+r.httpStatus:'未取得完整响应')+'（'+items.length+' 条同类记录）\n\n'+diagnosticMarkdown(r,rows)+'证据：'+ref(r)+'。\n\n';
      }
    }
    const extensions=new Map();
    for(const r of rows)for(const field of protocolDifferences(r)) {
      const path=field.path.replace(/\[\d+\]/g,'[*]'), key=path+'|'+field.type;
      if(!extensions.has(key))extensions.set(key,{...field,path,records:new Set(),count:0,record:r});
      const item=extensions.get(key);item.records.add(r.id);item.count++;item.signal ||= field.signal;
    }
    if(extensions.size) {
      out += '\n### 协议扩展字段（合并展示）\n\n普通额外字段仅作差异记录，不阻挡验收；错误、降级或计费相关字段只提供核查线索，不能据此推断根因或扣费。下表合并同路径和类型，值仅展示一个脱敏样例。\n\n| 字段路径 | 类型 | 涉及记录／出现次数 | 脱敏值示例 | 建议 |\n| --- | --- | --- | --- | --- |\n';
      for(const x of extensions.values())out+='| '+clean(x.path)+' | '+clean(x.type)+' | '+x.records.size+'／'+x.count+' | '+short(x.sample)+' | '+(x.sensitive?'敏感值已隐藏':x.signal?'重点核查渠道说明与账单':'记录观察，无需逐次确认')+'；'+ref(x.record)+' |\n';
      out+='\n';
    }
    out += '\n### 功能一览\n\n| 项目 | 记录数 | 通过／失败／待确认／不适用 | 主要证据或限制 |\n| --- | ---: | --- | --- |\n';
    const byKind = new Map();
    for (const r of rows) {const k=kind(r);if(!byKind.has(k))byKind.set(k,[]);byKind.get(k).push(r);}
    for (const [k,items] of byKind) {
      const countState = s => items.filter(r=>status(r)===s).length;
      const bad = items.flatMap(r=>r.checks.filter(x=>x.status==='fail').map(x=>x.name));
      let note = [...new Set(bad)].slice(0,2).join('、') || (items.every(r=>!applicable(r)) ? '未执行，不代表支持或不支持' : k==='moderation' && items.some(r=>r.expectedOutcomeMet) ? '按预期拦截；原始 HTTP 状态保留' : '参见人工结论及检查详情');
      out += '| ' + clean(names[k]||k) + ' | ' + items.length + ' | ' + ['通过','失败','待确认','不适用'].map(countState).join('／') + ' | ' + short(note) + '；' + ref(items[0]) + ' |\n';
    }
    out += '\n### 仍需确认与建议\n\n';
    const unreviewed = tested.filter(r=>!r.automaticVerdict && (!r.review?.verdict || r.review.verdict==='pending'));
    if (unreviewed.length) out += '- ' + unreviewed.length + ' 条记录尚未完成人工确认；图生图、Mask 修改效果及提示词符合程度不能只凭 HTTP 成功判断。\n';
    if (tested.some(r=>kind(r)==='native')) out += '- 原生／超分结论以保存原图后的人工识别和备注为依据，不根据尺寸或锐利度自动断言。\n';
    if (sorted.some(x=>/尺寸匹配/.test(x.name))) out += '- 优先核对请求尺寸与原图真实尺寸，向渠道确认尺寸支持及映射规则；现有记录不能确定底层原因。\n';
    if(tested.some(r=>kind(r)==='complexity26')){
      const absent=['low','medium','high'].filter(level=>!tested.some(r=>kind(r)==='complexity26'&&r.request?.complexity===level));
      if(absent.length)out+='- 复杂度三档对照尚缺：'+absent.join('、')+'；不能认定对照已完成。\n';
      out+='- 复杂度参数被接受不证明规划程度生效；单轮耗时与视觉差异不能确定因果。\n';
    }
    if(tested.some(r=>kind(r)==='svg26'))out+='- SVG 涉及参考图与矢量编写费用，不使用简单费用估算；实际扣费需核对账单。\n';
    const expectedKinds = ['text','base64','edit','transparent','multi','moderation','native','mask','concurrency',...((c.model||'').startsWith('gpt-image-2.6-')?['complexity26','svg26','gif26']:[])];
    const missing = expectedKinds.filter(k=>!tested.some(r=>kind(r)===k));
    if (missing.length) out += '- 未执行或不适用的项目：' + missing.map(k=>names[k]).join('、') + '。不计为失败，也不计为通过。\n';
    if (tested.some(r=>r.review?.actualCost==null || r.review.actualCost==='')) out += '- 存在未核对实际账单的记录；不据此判断价格优势或实际扣费准确性。\n';
    for (const r of rows.filter(r=>r.concurrencySummary)) {
      const s=r.concurrencySummary;
      out += '- 并发批次：HTTP 成功 ' + s.httpSuccess + '/' + s.count + '；符合检查的 1K 图片 ' + s.validImages + '/' + s.count + '；有效样本平均耗时 ' + (s.averageMs==null?'无有效样本':(s.averageMs/1000).toFixed(2)+' 秒') + '。浏览器可能限制并行连接，渠道实际并发程度未验证。失败不纳入成功平均耗时，不能只凭 HTTP 成功率认定验收通过。证据：' + ref(r) + '\n';
    }
    const notes = rows.filter(r=>r.review?.notes || r.review?.questions);
    for (const r of notes.slice(0,3)) out += '- 人工补充（' + ref(r) + '）：' + short(r.review.notes || r.review.questions) + '\n';
    if(notes.length>3) out+='- 更多人工备注见完整报告。\n';
    out += '\n';
  }
  return out;
}