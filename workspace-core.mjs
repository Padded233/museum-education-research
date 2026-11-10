export function normalize(s){return String(s||'').toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//,'').replace(/[^\p{L}\p{N}]/gu,'')}
export function duplicateRecords(r,records){return records.filter(x=>x.id!==r.id&&((r.doi&&normalize(r.doi)===normalize(x.doi))||(r.url&&r.url.split('?')[0].replace(/\/$/,'')===x.url.split('?')[0].replace(/\/$/,''))||normalize(r.subtitle||r.title)===normalize(x.subtitle||x.title)))}
export function validateRecord(r){
 if(!r||typeof r!=='object'||typeof r.id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(r.id))throw Error('Invalid record identifier');
 const strings=['title','subtitle','authors','source','url','doi','date','type','strength','status','findings','advantages','limits','advice','location','pending','notes','checkedAt'];
 for(const k of strings)if(typeof r[k]!=='string'||r[k].length>20000)throw Error('Invalid field: '+k);
 if(!r.title.trim()||!r.authors.trim())throw Error('Title and author are required');
 const u=new URL(r.url);if(!['http:','https:'].includes(u.protocol))throw Error('Invalid source URL');
 for(const k of ['ages','topics'])if(!Array.isArray(r[k])||r[k].some(s=>typeof s!=='string'||s.length>100))throw Error('Invalid list: '+k);
 if(r.status.startsWith('已核验')&&(!r.location.trim()||!r.checkedAt))throw Error('Verified records require source location and check date');
 if(typeof r.reading!=='boolean'||typeof r.applied!=='boolean')throw Error('Invalid boolean fields');
}
export function applySync(workspace,payload){
 if(payload.version!==1||!Array.isArray(payload.changes)||!Array.isArray(payload.events)||payload.changes.length>100||payload.events.length>200)throw Error('Invalid sync envelope');
 const next=structuredClone(workspace),ids=new Set();
 for(const change of payload.changes){const r=change.record;validateRecord(r);if(ids.has(r.id))throw Error('Repeated identifier');ids.add(r.id);const i=next.records.findIndex(x=>x.id===r.id),current=next.records[i];if((current?.revision||0)!==change.baseRevision)throw Error('Conflict: '+r.id+'. Reload public records and merge changes.');
 if(duplicateRecords(r,next.records).length)throw Error('Duplicate source: '+r.id);
 const record={...r,revision:(current?.revision||0)+1,reading:current?.reading||false};if(i<0)next.records.push(record);else next.records[i]=record;
 next.events.unshift({id:crypto.randomUUID(),record_id:r.id,type:'公开资料更新',title:r.title,before:current||null,after:record,revision:record.revision,created_at:new Date().toISOString()});}
 const allowed=new Set(['待核验事项','完成核验事项','应用记录']);
 for(const e of payload.events){if(typeof e.id!=='string'||!allowed.has(e.type))throw Error('Invalid activity type');if(next.events.some(x=>x.id===e.id))continue;for(const [k,v]of Object.entries(e))if(v!==null&&typeof v!=='string')throw Error('Invalid activity field: '+k);if(JSON.stringify(e).length>20000)throw Error('Activity too long');if(e.record_id&&!next.records.some(r=>r.id===e.record_id))throw Error('Missing activity source');next.events.unshift({...e,created_at:new Date().toISOString()});}
 next.updatedAt=new Date().toISOString();return next;
}
