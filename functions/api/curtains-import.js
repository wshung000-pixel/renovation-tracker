const rows=[{id:"curtains-deposit-10000",item:"窗簾－已付訂金",amount:10000,paid:true},{id:"curtains-balance-27143",item:"窗簾－未付尾款",amount:27143,paid:false}];
const norm=v=>String(v||"").replace(/[\s－—–\-]/g,"");
async function read(env){const raw=await env.RENOVATION_KV.get("entries");const entries=raw?JSON.parse(raw):[];if(!Array.isArray(entries))throw Error("Invalid data");return {raw,entries}}
function examine(entries){
 const issues=[],existing=[],missing=[];
 const related=entries.filter(e=>/窗簾/.test(String(e.item||"")));
 for(const row of rows){
  const hits=entries.filter(e=>String(e.id)===row.id||norm(e.item)===norm(row.item));
  if(hits.length>1||hits.length===1&&(Number(hits[0].amount)!==row.amount||Boolean(hits[0].paid)!==row.paid))issues.push(row.item+" 的既有資料不一致");
  else if(hits.length)existing.push(row);else missing.push(row)
 }
 const others=related.filter(e=>!rows.some(r=>String(e.id)===r.id||norm(e.item)===norm(r.item)));
 if(others.some(e=>Number(e.amount||0)!==0))issues.push("現有窗簾項目已有金額，請先核對");
 return {issues,existing,missing,others:others.map(e=>({item:e.item,amount:e.amount||0}))}
}
export async function onRequestGet({env}){try{const a=examine((await read(env)).entries);return Response.json({ok:true,missing:a.missing.length,existing:a.existing.length,issues:a.issues,others:a.others},{headers:{"Cache-Control":"no-store"}})}catch(e){return Response.json({ok:false,error:"讀取失敗"},{status:500})}}
export async function onRequestPost({request,env}){try{
 const body=await request.json();if(body?.confirm!=="curtains-37143")return Response.json({ok:false,error:"未確認"},{status:400});
 const {raw,entries}=await read(env),a=examine(entries);
 if(a.issues.length)return Response.json({ok:false,error:"偵測到可能重複的窗簾費用",issues:a.issues},{status:409});
 if(!a.missing.length)return Response.json({ok:true,added:0});
 await env.RENOVATION_KV.put("curtains-import-backup-"+Date.now()+"-"+crypto.randomUUID(),raw||"[]");
 if((await read(env)).raw!==raw)return Response.json({ok:false,error:"資料已變更，請重試檢查"},{status:409});
 const incoming=a.missing.map(r=>({...r,category:"家具",type:"裝潢",payment:"",date:"",notes:"窗簾總價 NT$37,143"}));
 await env.RENOVATION_KV.put("entries",JSON.stringify(entries.concat(incoming)));
 return Response.json({ok:true,added:incoming.length});
}catch(e){return Response.json({ok:false,error:"儲存失敗，請先核對資料"},{status:500})}}
