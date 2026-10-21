const schedule=[
 {id:"engineering-phase-1-tax",item:"工程約－第一期含稅款",amount:74150,notes:"第一期含稅款"},
 {id:"engineering-phase-1-base",item:"工程約－第一期未稅款",amount:398575,notes:"第一期未稅工程款"},
 {id:"engineering-phase-2-tax",item:"工程約－第二期含稅款",amount:74150,notes:"第二期含稅款"},
 {id:"engineering-phase-2-base",item:"工程約－第二期未稅款",amount:398575,notes:"第二期未稅工程款"},
 {id:"engineering-phase-3-tax",item:"工程約－第三期含稅款",amount:74150,notes:"第三期含稅款"},
 {id:"engineering-phase-3-base",item:"工程約－第三期未稅款",amount:420207,notes:"原未稅款 398,575 元＋追加 21,632 元"}
];
const normalized=x=>String(x||"").replace(/[\s－—–\-（）()]/g,"").toLowerCase();
const asRow=r=>({...r,payment:"",date:"",paid:true,type:"裝潢",category:"設計與工程"});
async function read(env){
 const raw=await env.RENOVATION_KV.get("entries");
 const records=raw?JSON.parse(raw):[];
 if(!Array.isArray(records))throw Error("Invalid records");
 return {raw,records};
}
function analyze(records){
 const original=records.filter(x=>normalized(x.item)==="工程約");
 const conflicts=[];
 if(original.length!==1 || Number(original[0]?.amount)!==0)conflicts.push("找不到唯一一筆金額為 0 的「工程約」原項目");
 const existing=[],missing=[];
 for(const row of schedule){
   const match=records.filter(x=>x.id===row.id||normalized(x.item)===normalized(row.item));
   if(match.length>1 || match.length===1 && (Number(match[0].amount)!==row.amount||match[0].paid!==true))conflicts.push(row.item+" 與既有資料不一致");
   else if(match.length)existing.push(row);
   else missing.push(row);
 }
 const other=records.filter(x=>String(x.item||"").includes("工程約")&&normalized(x.item)!=="工程約"&&!schedule.some(row=>row.id===x.id||normalized(row.item)===normalized(x.item)));
 if(other.length)conflicts.push("另有 "+other.length+" 筆未識別的工程約相關紀錄，需先人工核對");
 return {conflicts,existing,missing,originalCount:original.length};
}
export async function onRequestGet({env}){
 try{
  const {records}=await read(env),a=analyze(records);
  return Response.json({ok:true,canImport:a.conflicts.length===0,pending:a.missing.length,already:a.existing.length,conflicts:a.conflicts,total:1439807},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return Response.json({ok:false,error:"無法讀取帳本"},{status:500});}
}
export async function onRequestPost({env,request}){
 try{
  const body=await request.json();
  if(body?.confirm!=="confirm-six-engineering-payments")return Response.json({ok:false,error:"尚未確認匯入"},{status:400});
  const {raw,records}=await read(env),a=analyze(records);
  if(a.conflicts.length)return Response.json({ok:false,error:"有需要人工確認的資料，未修改帳本",conflicts:a.conflicts},{status:409});
  if(!a.missing.length)return Response.json({ok:true,added:0,already:6});
  const backupKey="engineering-backup-"+new Date().toISOString()+"-"+crypto.randomUUID();
  await env.RENOVATION_KV.put(backupKey,raw||"[]");
  // Cloudflare KV is last-write-wins, not a transactional database; this check detects some concurrent changes.
  const latest=await read(env);
  if(latest.raw!==raw)return Response.json({ok:false,error:"資料剛被更新，請重新檢查後匯入"},{status:409});
  await env.RENOVATION_KV.put("entries",JSON.stringify(records.concat(a.missing.map(asRow))));
  return Response.json({ok:true,added:a.missing.length,already:a.existing.length});
 }catch(e){return Response.json({ok:false,error:"匯入失敗，請先檢查雲端紀錄"},{status:500});}
}
