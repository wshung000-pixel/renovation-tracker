// Cloudflare Pages Function
// 路徑：functions/api/data.js
// 自動對應到 /api/data

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

// GET /api/data → 讀取所有資料
export async function onRequestGet({ env }) {
  try {
    const data = await env.RENOVATION_KV.get("entries");
    return Response.json(
      { ok: true, entries: data ? JSON.parse(data) : [] },
      { headers: CORS }
    );
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500, headers: CORS });
  }
}

// POST /api/data → 儲存所有資料
export async function onRequestPost({ request, env }) {
  try {
    const { entries } = await request.json();
    await env.RENOVATION_KV.put("entries", JSON.stringify(entries));
    return Response.json({ ok: true }, { headers: CORS });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500, headers: CORS });
  }
}
