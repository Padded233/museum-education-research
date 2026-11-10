import fs from 'node:fs';
import {applySync} from './workspace-core.mjs';
export function parseSyncEvent(event,repositoryOwner){
 if(event.issue?.user?.login?.toLowerCase()!==repositoryOwner.toLowerCase())throw Error('Only the repository owner may publish updates through this workflow');
 if(!event.issue.title.startsWith('[Research Sync]'))throw Error('Not a research update');
 const body=event.issue.body||'';if(body.length>200000)throw Error('Update is too large');const match=body.match(/```json\s*([\s\S]*?)\s*```/);if(!match)throw Error('No JSON update block found');return JSON.parse(match[1]);
}
if(process.argv[1]?.endsWith('apply-sync.mjs')){const event=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));const owner=process.env.GITHUB_REPOSITORY.split('/')[0];const payload=parseSyncEvent(event,owner);const workspace=JSON.parse(fs.readFileSync('workspace.json','utf8'));const next=applySync(workspace,payload);fs.writeFileSync('workspace.json',JSON.stringify(next,null,2));console.log('Applied '+payload.changes.length+' research updates.');}
