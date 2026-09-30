import {ENGINE,type Stage} from './engine.ts';
export function fromRows(id:string,title:string,description:string,hint:string,rows:string[],maxGhosts=3):Stage{
 const width=rows[0].length,m:Stage={id,title,description,hint,schemaVersion:1,engineVersion:ENGINE,width,height:rows.length,tickHz:10,loopTicks:300,maxGhosts,tiles:[],spawn:{x:1,y:1},goal:{x:width-2,y:rows.length-2},plates:[],doors:[]};
 rows.forEach((row,y)=>[...row].forEach((c,x)=>{m.tiles.push(c==='#'?1:0);if(c==='S')m.spawn={x,y};if(c==='G')m.goal={x,y};if('ABC'.includes(c))m.plates.push({id:`plate-${c.toLowerCase()}`,x,y});if('abc'.includes(c))m.doors.push({id:`door-${c}`,x,y,mode:'OR',plateIds:[`plate-${c}`]});}));return m;
}
