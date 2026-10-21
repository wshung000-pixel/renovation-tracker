const target=[
 {id:"hvac-2026-paid-240000",item:"冷氣＋除濕機－已付設備款",amount:240000,paid:true,notes:"世傳冷氣空調 2026/07/28 估價單；先前已付設備款",category:"家電",type:"家電",payment:"",date:""},
 {id:"hvac-2026-balance-117810",item:"冷氣＋除濕機－未付尾款",amount:117810,paid:false,notes:"世傳冷氣空調 2026/07/28 估價單；待付安裝尾款",category:"家電",type:"家電",payment:"",date:""}
];
const norm=s=>String(s||"").replace(/[\s－—–\-＋+（）()]/g,"").toLowerCase();
async function read(env){const raw=await env.RENOVATION_KV.get("entries");const data=raw?JSON.parse(raw):[];if(!Array.isArray(data))throw Error("invalid data");return {raw,entries:data}}
function inspect(entries){
 const conflicts=[],existing=[],missing=[];
 for(const row of target){
  const matches=entries.filter(e=>String(e.id)===row.id||norm(e.item)===norm(row.item));
  if(matches.length>1||(matches.length===1&&(Number(matches[0].amount)!==row.amount||Boolean(matches[0].paid)!==row.paid)))conflicts.push(row.item+" 與現有紀錄不一致");
  else if(matches.length)existing.push(row);else missing.push(row);
 }
 const placeholders=entries.filter(e=>["冷氣","除濕機"].includes(norm(e.item)));
 if(placeholders.some(e=>Number(e.amount||0)!==0))conflicts.push("原本「冷氣」或「除濕機」已有非零金額，需人工核對");
 const other=entries.filter(e=>/冷氣|除濕/.test(String(e.item||""))&&!placeholders.includes(e)&&!target.some(row=>row.id===String(e.id)||norm(row.item)===norm(e.item)));
 if(other.length)conflicts.push("另有 "+other.length+" 筆冷氣或除濕相關紀錄，請先確認是否重複");
 return {conflicts,existing,missing,placeholders:placeholders.map(e=>({item:e.item,amount:Number(e.amount||0),paid:!!e.paid}))};
}
export async function onRequestGet({env}){
 try{const {entries}=await read(env),a=inspect(entries);return Response.json({ok:true,missing:a.missing.length,existing:a.existing.length,conflicts:a.conflicts,placeholders:a.placeholders},{headers:{"Cache-Control":"no-store"}})}
 catch(e){return Response.json({ok:false,error:"資料讀取失敗"},{status:500})}
}
export async function onRequestPost({env,request}){
 try{
  const body=await request.json();
  if(body?.confirm!=="hvac-240000-117810-confirm")return Response.json({ok:false,error:"尚未確認匯入"},{status:400});
  const {raw,entries}=await read(env),a=inspect(entries);
  if(a.conflicts.length)return Response.json({ok:false,error:"資料可能重複，匯入已取消",conflicts:a.conflicts},{status:409});
  if(!a.missing.length)return Response.json({ok:true,added:0,existing:2});
  const backup="hvac-import-backup-"+Date.now()+"-"+crypto.randomUUID();
  await env.RENOVATION_KV.put(backup,raw||"[]");
  const latest=await read(env);
  if(latest.raw!==raw)return Response.json({ok:false,error:"資料剛被更新，請重新核對"},{status:409});
  await env.RENOVATION_KV.put("entries",JSON.stringify([...entries,...a.missing]));
  return Response.json({ok:true,added:a.missing.length,existing:a.existing.length});
 }catch(e){return Response.json({ok:false,error:"匯入未確認成功，請先核對清單，避免重複操作"},{status:500})}
}
