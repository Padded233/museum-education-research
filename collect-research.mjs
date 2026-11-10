import fs from 'node:fs';
import {duplicateRecords,validateRecord} from './workspace-core.mjs';
export function relevantStudy(w){
 const text=[w.title,...Object.keys(w.abstract_inverted_index||{})].join(' ').toLowerCase();
 return /(museum|cultural heritage|heritage education|博物馆|文化遗产)/.test(text)&&/(primary|elementary|\bchild(?:ren)?\b|\bpupil|schoolchildren|小学|儿童)/.test(text)&&/(educat|learn|teach|curricul|教育|学习|课程)/.test(text);
}
export async function collect(workspace,fetcher=fetch){
 const queries=['museum education primary school','museum hands-on elementary evaluation','cultural heritage education children'];
 const next=structuredClone(workspace),run={at:new Date().toISOString(),added:0,skipped:0,irrelevant:0,failures:[],mode:'OpenAlex小学博物馆教育候选检索'};
 const legacy=next.records.filter(r=>r.id.startsWith('oa-')&&!r.screening&&r.status==='待核验'&&r.notes.startsWith('检索词：'));
 if(legacy.length){const ids=new Set(legacy.map(r=>r.id));next.records=next.records.filter(r=>!ids.has(r.id));next.excludedCandidates=[...(next.excludedCandidates||[]),...legacy.map(r=>({record:r,reason:'旧检索未进行小学博物馆教育主题筛选；本轮重筛',at:run.at}))];next.events.unshift({id:crypto.randomUUID(),record_id:null,type:'检索范围复核',summary:'移出'+legacy.length+'条旧自动候选，按博物馆/遗产、儿童/小学、教育/学习三组条件重新筛选；原记录保留在版本与排除清单中。',created_at:run.at})}
 const today=new Date().toISOString().slice(0,10),since=new Date(Date.now()-370*86400000).toISOString().slice(0,10);
 for(const query of queries){try{const u=new URL('https://api.openalex.org/works');u.searchParams.set('search',query);u.searchParams.set('filter','from_publication_date:'+since);u.searchParams.set('sort','publication_date:desc');u.searchParams.set('per-page','8');
 u.searchParams.set('per-page','50');
 const response=await fetcher(u,{headers:{'User-Agent':'MuseumEducationResearch/1.0'},signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();
 for(const w of data.results||[]){if(!w.id||!w.title||!w.publication_date||w.publication_date>today)continue;if(!relevantStudy(w)){run.irrelevant++;continue}
 const r={id:'oa-'+w.id.split('/').pop(),title:w.title,subtitle:w.title,authors:(w.authorships||[]).map(a=>a.author.display_name).join('；')||'作者待核验',source:w.primary_location?.source?.display_name||'OpenAlex索引',url:w.doi||w.primary_location?.landing_page_url||w.id,doi:(w.doi||'').replace(/^https:\/\/doi.org\//,''),date:w.publication_date,ages:[],topics:[],type:'待分类',strength:'待评估',status:'待核验',findings:'已获取索引书目信息，研究对象、方法与结论待核验。',advantages:'待审读研究方法。',limits:'自动检索候选，尚未确认小学适用性。',advice:'核验一手原文后补充课程与图册转化建议。',location:'OpenAlex索引：'+w.id+'；研究原文定位待核验。',pending:'核对作者、发表信息、研究对象与方法；确认小学适用性，补充原文出处与重复数据集检查。',reading:false,applied:false,notes:'检索词：'+query,checkedAt:'',revision:1};
 r.screening='题名与索引摘要同时包含：博物馆/文化遗产、儿童/小学、教育/学习；适用性仍待全文核验。';
 validateRecord(r);if(next.records.some(x=>x.id===r.id)||duplicateRecords(r,next.records).length){run.skipped++;continue}next.records.push(r);next.events.unshift({id:crypto.randomUUID(),record_id:r.id,type:'自动收集候选',title:r.title,after:r,revision:1,created_at:new Date().toISOString()});run.added++}
 }catch(e){run.failures.push(query+'：'+e.message)}}
 next.settings.lastDiscovery=run;next.events.unshift({id:crypto.randomUUID(),record_id:null,type:'检索更新',created_at:run.at,...run});next.updatedAt=run.at;return {workspace:next,run};
}
if(process.argv[1]?.endsWith('collect-research.mjs')){const x=JSON.parse(fs.readFileSync('workspace.json','utf8'));const result=await collect(x);fs.writeFileSync('workspace.json',JSON.stringify(result.workspace,null,2));console.log(JSON.stringify(result.run));}
