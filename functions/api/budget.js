// Separate KV key preserves all existing renovation entries.
export async function onRequestGet({env}) {
  try {
    const raw=await env.RENOVATION_KV.get("budgets-v1");
    return Response.json({ok:true,budgets:raw?JSON.parse(raw):{"裝潢":0,"家電":0}},{headers:{"Cache-Control":"no-store"}});
  } catch(e) {return Response.json({ok:false,error:"Unable to read budget"},{status:500});}
}
export async function onRequestPost({request,env}) {
  try {
    const body=await request.json();
    const obj=body&&body.budgets;
    if(!obj||typeof obj!=="object"||!["裝潢","家電"].every(k=>Number.isSafeInteger(Number(obj[k]))&&Number(obj[k])>=0&&Number(obj[k])<=10000000000))return Response.json({ok:false,error:"Invalid budget"},{status:400});
    const budgets={"裝潢":Number(obj["裝潢"]),"家電":Number(obj["家電"])};
    await env.RENOVATION_KV.put("budgets-v1",JSON.stringify(budgets));
    return Response.json({ok:true,budgets});
  } catch(e) {return Response.json({ok:false,error:"Unable to save budget"},{status:500});}
}