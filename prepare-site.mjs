import fs from 'node:fs';
import {validateRecord} from './workspace-core.mjs';
const workspace=JSON.parse(fs.readFileSync('workspace.json','utf8'));workspace.records.forEach(validateRecord);
workspace.settings.schedule={enabled:true,label:'每周一北京时间上午；运行状态见GitHub Actions'};
fs.mkdirSync('site',{recursive:true});fs.copyFileSync('index.html','site/index.html');fs.writeFileSync('site/workspace.json',JSON.stringify(workspace,null,2));fs.writeFileSync('site/.nojekyll','');
console.log('Prepared static website with '+workspace.records.length+' records.');
