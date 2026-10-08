import {restoreCampaignProgress,stages} from './stages.ts';
export type AccountProgress={version:1;current:unknown|null;completed:string[]};
export function validateProgress(raw:unknown):AccountProgress {
 const v=raw as AccountProgress;
 if(!v||v.version!==1||!Array.isArray(v.completed)||v.completed.length>stages.length||v.completed.some(id=>typeof id!=='string'||!stages.some(s=>s.id===id)))throw new Error('진행 기록 형식이 올바르지 않습니다.');
 if(v.current!==null)restoreCampaignProgress(v.current);
 return {version:1,current:v.current,completed:[...new Set(v.completed)]};
}
