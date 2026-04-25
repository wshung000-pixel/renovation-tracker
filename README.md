# 新家裝潢費用紀錄 — Cloudflare Pages + KV

## 部署步驟

### Step 1 — 建立 KV Namespace
1. 登入 [dash.cloudflare.com](https://dash.cloudflare.com)
2. 左側選 **Workers & Pages** → **KV**
3. 點「**Create a namespace**」
4. 名稱輸入 `RENOVATION_KV` → Create
5. 複製產生的 **KV ID**（一串英數字）

### Step 2 — 修改 wrangler.toml
把 `wrangler.toml` 裡的 `REPLACE_WITH_YOUR_KV_ID` 換成你剛才複製的 KV ID：
```toml
[[kv_namespaces]]
binding = "RENOVATION_KV"
id = "你的KV_ID"
```

### Step 3 — 上傳到 GitHub
把整個資料夾（包含 `functions/`、`public/`、`wrangler.toml`）push 到 GitHub repo

### Step 4 — 部署到 Cloudflare Pages
1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create**
2. 選 **Pages** → **Connect to Git**
3. 選你的 GitHub repo
4. Build settings：
   - Framework preset：**None**
   - Build command：**留空**
   - Build output directory：**`public`**
5. 點 **Save and Deploy**

### Step 5 — 綁定 KV 到 Pages
部署完成後：
1. 進到你的 Pages 專案 → **Settings** → **Functions**
2. 找到 **KV namespace bindings**
3. 點「Add binding」：
   - Variable name：`RENOVATION_KV`
   - KV namespace：選剛才建立的 `RENOVATION_KV`
4. 儲存 → **重新部署一次**（Deployments → Retry deployment）

### 完成！
- 開啟 `xxx.pages.dev`，右上角顯示「✓ 已同步」表示 KV 連線成功
- 所有裝置共用同一份資料，新增/編輯會在 0.8 秒後自動同步

## 加到 iPhone 桌面
Safari 開啟網址 → 分享按鈕 → 加入主畫面
