// Extensions are observations, not proof of compatibility or model identity.
function protocolField(value, key, parent) {
  const type=value===null?'null':Array.isArray(value)?'array':typeof value;
  const sensitive=/authorization|api.?key|secret|password|cookie|credential|(?:^|_)token$/i.test(key);
  const safe=sensitive?'[REDACTED]':scrub({[key]:value},$('apiKey').value.trim())[key];
  const sample=(typeof safe==='string'?safe:JSON.stringify(safe)??String(safe)).slice(0,160);
  const active=value!==null && value!==false && value!=='' && value!==undefined && (!Array.isArray(value)||value.length>0) && (typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>0);
  const signal=active && (/^(?:errors?|warnings?|fallback|degraded|partial_success|billing|cost|price|charged|actual_cost|charged_amount)$/i.test(key) || /^(?:status|finish_reason)$/i.test(key)&&/^(?:error|failed|partial|partial_success|degraded|fallback)$/i.test(String(value)));
  return {path:parent+'.'+key,type,sample,signal:!!signal,sensitive};
}
function protocolDifferences(r) {
  if(!r.interfaceSuccess || !r.response || typeof r.response!=='object' || Array.isArray(r.response))return [];
  const root=['created','data','usage','background','output_format','quality','size'];
  const result=Object.keys(r.response).filter(k=>!root.includes(k)).map(k=>protocolField(r.response[k],k,'$'));
  if(Array.isArray(r.response.data))r.response.data.forEach((im,i)=>{
    if(im && typeof im==='object' && !Array.isArray(im))
      for(const key of Object.keys(im).filter(k=>k!=='b64_json'))result.push(protocolField(im[key],key,'$.data['+i+']'));
  });
  return result;
}
function describeProtocolFields(body, keys, parent) {
  return keys.map(k=>{const f=protocolField(body[k],k,parent);return f.path+' ('+f.type+')：'+f.sample+(f.signal?'；含错误、降级或计费相关线索，建议核查':'');}).join('；');
}
function protocolDifferencesHtml(r) {
  const items=protocolDifferences(r);if(!items.length)return '';
  return '<details><summary>协议差异记录 · '+items.length+' 项'+(items.some(x=>x.signal)?'（含需重点核查的线索）':'（不阻挡验收）')+'</summary><p>额外字段不等于功能失败，也不代表已验证字段含义。错误、降级和计费线索需结合渠道说明与账单核查。</p><table><thead><tr><th>字段路径</th><th>类型</th><th>脱敏值（节选）</th><th>处理建议</th></tr></thead><tbody>'+items.map(x=>'<tr><td>'+esc(x.path)+'</td><td>'+esc(x.type)+'</td><td>'+esc(x.sample)+'</td><td>'+(x.sensitive?'敏感值已隐藏':x.signal?'重点核查，不能仅凭字段名归因':'记录观察，无需逐次确认')+'</td></tr>').join('')+'</tbody></table></details>';
}
