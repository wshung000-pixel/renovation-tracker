const rows=[
 ["第一期","含稅款",74150],["第一期","未稅款",398575],
 ["第二期","含稅款",74150],["第二期","未稅款",398575],
 ["第三期","含稅款",74150],["第三期","未稅款（含追加 21,632）",420207]
];
const resultRows=rows.map(([period,kind,amount],i)=>({
 id:"engineering-2026-phase1to3-"+(i+1),
 item:"工程約－"+period+kind,
 amount,payment:"轉帳",date:"",notes:kind.includes("追加")?"原工程款 398,575＋追加 21,632":"已確認付款；日期未提供",
 type:"裝潢",category:"設計與工程",paid:true
}));
function eq(a,b){return String(a.item||"").replace(/\s/g,"")===String(b.item||"").replace(/\s/g,"")}
async function read(env){
 const raw=await env.RENOVATION_KV.get("entries");
 const entries=raw?JSON.parse(raw):[];
 if(!Array.isArray(entries))throw new Error("Invalid records");
 return entries;
}
export async function onRequestGet({env}){
 try{
  const entries=await read(env);
  const conflicts=resultRows.filter(row=>entries.some(x=>(String(x.id)===row.id||eq(x,row))&&(!eq(x,row)||Number(x.amount)!==row.amount||x.paid!==true)));
  const pending=resultRows.filter(row=>!entries.some(x=>String(x.id)===row.id||eq(x,row)));
  return Response.json({ok:true,pending:pending.length,already:6-pending.length,conflicts:conflicts.map(r=>r.item),total:1439807},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return Response.json({ok:false,error:"讀取失敗"},{status:500});}
}
export async function onRequestPost({env,request}){
 try{
  const body=await request.json();
  if(body?.confirm!=="engineering-six-1439807")return Response.json({ok:false,error:"請先確認六筆工程款"},{status:400});
  const entries=await read(env);
  const conflicts=resultRows.filter(row=>entries.some(x=>(String(x.id)===row.id||eq(x,row))&&(!eq(x,row)||Number(x.amount)!==row.amount||x.paid!==true)));
  if(conflicts.length)return Response.json({ok:false,error:"帳本有同名但內容不同的工程款，已停止匯入，沒有修改資料。",conflicts:conflicts.map(r=>r.item)},{status:409});
  const pending=resultRows.filter(row=>!entries.some(x=>String(x.id)===row.id||eq(x,row)));
  if(pending.length===0)return Response.json({ok:true,added:0,already:6});
  // Create a recovery snapshot before adding records. Never overwrite the snapshot key.
  const backupKey="engineering-import-backup-"+Date.now()+"-"+crypto.randomUUID();
  await env.RENOVATION_KV.put(backupKey,JSON.stringify(entries));
  await env.RENOVATION_KV.put("entries",JSON.stringify([...entries,...pending]));
  return Response.json({ok:true,added:pending.length,already:6-pending.length});
 }catch(e){return Response.json({ok:false,error:"匯入失敗，請勿重複嘗試，先確認目前清單。"},{status:500});}
}
