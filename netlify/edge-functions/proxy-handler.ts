// netlify/edge-functions/proxy-handler.ts
import type { Context } from "@netlify/edge-functions";

// 定义你的代理规则：路径前缀 => 目标基础 URL
const PROXY_CONFIG = {
  // API 服务器
  "/discord": "https://discord.com/api",
  "/telegraph": "https://telegra.ph",
  "/vc": "https://vocechat.xf-yun.cn",
  "/mhhf": "https://www.mhhf.com",
  "/cat-baike": "https://lolitalibrary.com",
  "/telegram": "https://api.telegram.org",
  "/openai": "https://api.openai.com",
  "/claude": "https://api.anthropic.com",
  "/gemini": "https://generativelanguage.googleapis.com",
  "/meta": "https://www.meta.ai/api",
  "/groq": "https://api.groq.com/openai",
  "/xai": "https://api.x.ai",
  "/cohere": "https://api.cohere.ai",
  "/huggingface": "https://api-inference.huggingface.co",
  "/together": "https://api.together.xyz",
  "/novita": "https://api.novita.ai",
  "/portkey": "https://api.portkey.ai",
  "/fireworks": "https://api.fireworks.ai",
  "/openrouter": "https://openrouter.ai/api",
  // 任意网址
  "/hexo": "https://hexo-gally.vercel.app", 
  "/hexo2": "https://hexo-987.pages.dev",
  "/halo": "https://blog.gally.dpdns.org",
  "/kuma": "https://kuma.gally.dpdns.org",
  "/hf": "https://huggingface.co",
  "/tv": "https://tv.gally.ddns-ip.net",
  "/news": "https://newsnow-ahm.pages.dev"
};

// 需要修复路径的内容类型
const HTML_CONTENT_TYPES = [
  'text/html',
  'application/xhtml+xml',
  'application/xml',
  'text/xml'
];

// 可能需要修复路径的 CSS 内容类型
const CSS_CONTENT_TYPES = [
  'text/css'
];

// JavaScript 内容类型
const JS_CONTENT_TYPES = [
  'application/javascript',
  'text/javascript',
  'application/x-javascript'
];

// =============================================================
// == 注入脚本替换部分：从 v8 升级到 v9 (Iframe)
// =============================================================

// 这是将要注入到 Iframe 内部的 HTML 结构
const TOOL_HTML = `
  <button id="mhhf-db-tool-btn">⚙️</button>
  <div id="mhhf-db-tool-panel">
    <div class="panel-header"><h3>IndexedDB 数据工具</h3><button class="close-btn" id="mhhf-close-panel-btn">&times;</button></div>
    <div class="content">
      <textarea id="mhhf-data-area" placeholder="导出数据将显示在此处，或在此处粘贴数据以导入。"></textarea>
      <div id="mhhf-actions-section" class="actions">
        <button id="mhhf-export-btn">导出数据</button>
        <button id="mhhf-paste-btn">粘贴</button>
        <button id="mhhf-copy-btn" disabled>复制</button>
        <button id="mhhf-import-btn">导入数据</button>
      </div>
      <div id="mhhf-confirm-section">
        <p><strong>警告：</strong>此操作将覆盖现有数据且无法撤销。确定要继续吗？</p>
        <div id="mhhf-confirm-actions">
          <button id="mhhf-confirm-import-btn">确认导入</button>
          <button id="mhhf-cancel-import-btn">取消</button>
        </div>
      </div>
      <div id="mhhf-status-area" class="status">准备就绪. (v9: Iframe Sandbox)</div>
    </div>
  </div>
`;

// 这是将要注入到 Iframe 内部的 CSS 样式
const TOOL_CSS = `
    /* Iframe内部的元素可以捕获事件 */
    #mhhf-db-tool-btn, #mhhf-db-tool-panel {
        pointer-events: auto;
    }
    #mhhf-db-tool-btn { position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; background-color: #007bff; color: white; border-radius: 50%; border: none; display: flex; justify-content: center; align-items: center; font-size: 24px; cursor: grab; z-index: 2147483646; box-shadow: 0 4px 8px rgba(0,0,0,0.2); transition: transform 0.1s ease-out; }
    #mhhf-db-tool-panel { display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; max-width: 600px; background-color: white; border: 1px solid #ccc; box-shadow: 0 5px 15px rgba(0,0,0,0.3); z-index: 2147483647; padding: 20px; border-radius: 8px; font-family: sans-serif; }
    #mhhf-db-tool-panel .panel-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }
    #mhhf-db-tool-panel .panel-header h3 { margin: 0; }
    #mhhf-db-tool-panel .close-btn { font-size: 24px; border: none; background: none; cursor: pointer; }
    #mhhf-db-tool-panel textarea { width: 100%; box-sizing: border-box; height: 300px; margin-top: 10px; font-family: monospace; }
    #mhhf-db-tool-panel .actions { margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap; }
    #mhhf-db-tool-panel .actions button:disabled { cursor: not-allowed; background-color: #e9ecef; }
    #mhhf-db-tool-panel #mhhf-confirm-section { display: none; margin-top: 15px; padding: 10px; border: 1px solid #fd7e14; border-radius: 4px; background-color: #fff4e6; }
    #mhhf-db-tool-panel #mhhf-confirm-section p { margin: 0 0 10px 0; font-size: 14px; color: #d9480f; }
    #mhhf-db-tool-panel #mhhf-confirm-actions button { margin-right: 10px; }
    #mhhf-db-tool-panel button { padding: 8px 12px; border: 1px solid #ccc; background-color: #f0f0f0; cursor: pointer; border-radius: 4px; }
    #mhhf-db-tool-panel button:hover:not(:disabled) { background-color: #e0e0e0; }
    #mhhf-db-tool-panel #mhhf-confirm-import-btn { background-color: #fa5252; color: white; border-color: #fa5252; }
    #mhhf-db-tool-panel #mhhf-confirm-import-btn:hover { background-color: #c92a2a; }
    #mhhf-db-tool-panel .status { margin-top: 10px; font-size: 14px; color: #333; }
`;

// 这是将要注入到 Iframe 内部的 JavaScript 逻辑
const TOOL_JS = `
  (function() {
    const indexedDB = window.top.indexedDB;
    if (!indexedDB) {
      console.error("MHHHF Tool: Could not access indexedDB from top window.");
      return;
    }
    const btn = document.getElementById('mhhf-db-tool-btn'), panel = document.getElementById('mhhf-db-tool-panel'), closeBtn = document.getElementById('mhhf-close-panel-btn'), exportBtn = document.getElementById('mhhf-export-btn'), importBtn = document.getElementById('mhhf-import-btn'), copyBtn = document.getElementById('mhhf-copy-btn'), pasteBtn = document.getElementById('mhhf-paste-btn'), dataArea = document.getElementById('mhhf-data-area'), statusArea = document.getElementById('mhhf-status-area'), actionsSection = document.getElementById('mhhf-actions-section'), confirmSection = document.getElementById('mhhf-confirm-section'), confirmImportBtn = document.getElementById('mhhf-confirm-import-btn'), cancelImportBtn = document.getElementById('mhhf-cancel-import-btn');
    let isDragging = false, wasDragged = false, initialX, initialY, currentX, currentY, xOffset = 0, yOffset = 0;
    btn.addEventListener('mousedown', (e) => { isDragging = true; wasDragged = false; initialX = e.clientX - xOffset; initialY = e.clientY - yOffset; btn.style.cursor = 'grabbing'; });
    document.addEventListener('mousemove', (e) => { if (!isDragging) return; wasDragged = true; e.preventDefault(); currentX = e.clientX - initialX; currentY = e.clientY - initialY; xOffset = currentX; yOffset = currentY; btn.style.transform = \`translate(\${currentX}px, \${currentY}px)\`; });
    document.addEventListener('mouseup', () => { if (isDragging) { isDragging = false; initialX = currentX; initialY = currentY; btn.style.cursor = 'grab'; } });
    btn.addEventListener('click', () => { if (!wasDragged) { panel.style.display = panel.style.display === 'block' ? 'none' : 'block'; } });
    closeBtn.addEventListener('click', () => { panel.style.display = 'none'; });
    const setStatus = (msg, isError = false) => { statusArea.textContent = msg; statusArea.style.color = isError ? 'red' : 'green'; };
    const promisifyRequest = (request) => new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    function arrayBufferToBase64(buffer) { let b='';new Uint8Array(buffer).forEach(B=>{b+=String.fromCharCode(B)}); return window.btoa(b) }
    function base64ToArrayBuffer(base64) { const s=window.atob(base64),b=new Uint8Array(s.length);for(let i=0;i<s.length;i++){b[i]=s.charCodeAt(i)}return b.buffer }
    async function serializeAsync(data) { if (data instanceof Blob) return { "$type": "blob", "$mime": data.type, "$data": arrayBufferToBase64(await data.arrayBuffer()) }; if (data instanceof ArrayBuffer) return { "$type": "arraybuffer", "$data": arrayBufferToBase64(data) }; if (Array.isArray(data)) return Promise.all(data.map(serializeAsync)); if (data && typeof data === 'object' && data.constructor === Object) { const obj = {}; for (const key in data) { obj[key] = await serializeAsync(data[key]); } return obj; } return data; }
    function deserializeReviver(key, value) { if (value && typeof value === 'object' && !Array.isArray(value)) { if (value['$type'] === 'blob') return new Blob([base64ToArrayBuffer(value['$data'])], { type: value['$mime'] }); if (value['$type'] === 'arraybuffer') return base64ToArrayBuffer(value['$data']); } return value; }
    function resetUiToActions() { confirmSection.style.display = 'none'; actionsSection.style.display = 'flex'; dataArea.readOnly = false; }
    importBtn.addEventListener('click', () => { if (!dataArea.value.trim()) { setStatus('导入失败: 文本框为空。', true); return; } actionsSection.style.display = 'none'; confirmSection.style.display = 'block'; dataArea.readOnly = true; });
    cancelImportBtn.addEventListener('click', () => { resetUiToActions(); setStatus('导入已取消。'); });
    copyBtn.addEventListener('click', () => { if (!dataArea.value) return; navigator.clipboard.writeText(dataArea.value).then(() => { setStatus('已成功复制到剪贴板！'); }).catch(err => { setStatus('复制失败: ' + err.message, true); }); });
    pasteBtn.addEventListener('click', async () => { try { if (!navigator.clipboard || !navigator.clipboard.readText) { throw new Error('浏览器不支持剪贴板读取 API。'); } const text = await navigator.clipboard.readText(); dataArea.value = text; setStatus('已从剪贴板粘贴。'); copyBtn.disabled = dataArea.value.trim() === ''; } catch (err) { setStatus('粘贴失败: ' + err.message, true); console.error('Paste Error:', err); } });
    dataArea.addEventListener('input', () => { copyBtn.disabled = dataArea.value.trim() === ''; });
    async function exportAllData() { setStatus('开始导出...'); try { const dbsInfo = await indexedDB.databases(); if (!dbsInfo || dbsInfo.length === 0) { setStatus('未找到任何 IndexedDB 数据库。', true); return; } let allData = {}, exportedDbCount = 0; for (const dbInfo of dbsInfo) { if (!dbInfo.name) continue; const db = await promisifyRequest(indexedDB.open(dbInfo.name)); const storeNames = Array.from(db.objectStoreNames); if (storeNames.length === 0) { db.close(); continue; } const dbData = {}; const transaction = db.transaction(storeNames, 'readonly'); for (const storeName of storeNames) { const store = transaction.objectStore(storeName); const keys = await promisifyRequest(store.getAllKeys()); const values = await promisifyRequest(store.getAll()); const serializedKeys = await serializeAsync(keys); const serializedValues = await serializeAsync(values); dbData[storeName] = serializedKeys.map((key, index) => ({ key: key, value: serializedValues[index] })); } allData[dbInfo.name] = dbData; db.close(); exportedDbCount++; } if (exportedDbCount > 0) { dataArea.value = JSON.stringify(allData, null, 2); copyBtn.disabled = false; setStatus(\`成功导出 \${exportedDbCount} 个数据库的数据！\`); } else { setStatus('没有找到包含任何数据的数据库。', true); } } catch (error) { setStatus('导出失败: ' + error.message, true); console.error('Export Error:', error); } }
    async function executeImport() { setStatus('开始导入...'); let dataToImport; try { dataToImport = JSON.parse(dataArea.value, deserializeReviver); } catch(e) { setStatus('导入失败: 无效的 JSON 格式或解析错误。', true); console.error('Parse Error:', e); return; } try { for (const dbName in dataToImport) { if (!Object.prototype.hasOwnProperty.call(dataToImport, dbName)) continue; const db = await promisifyRequest(indexedDB.open(dbName)); const storeNamesToImport = Object.keys(dataToImport[dbName]); const availableStoreNames = Array.from(db.objectStoreNames); const validStoreNames = storeNamesToImport.filter(name => availableStoreNames.includes(name)); if (validStoreNames.length === 0) { db.close(); continue; } const transaction = db.transaction(validStoreNames, 'readwrite'); for (const storeName of validStoreNames) { const store = transaction.objectStore(storeName); await promisifyRequest(store.clear()); const pairs = dataToImport[dbName][storeName]; if (Array.isArray(pairs)) { pairs.forEach(pair => { if (pair && pair.key !== undefined && pair.value !== undefined) store.put(pair.value, pair.key); }); } } await new Promise((resolve, reject) => { transaction.oncomplete = resolve; transaction.onerror = reject; }); db.close(); } setStatus('导入成功！页面可能需要刷新以应用更改。'); } catch (error) { setStatus('导入失败: ' + error.message, true); console.error('Import Error:', error); } }
    confirmImportBtn.addEventListener('click', async () => { await executeImport(); resetUiToActions(); });
    exportBtn.addEventListener('click', exportAllData);
  })();
`;

// 这是最终的注入脚本，它创建 iframe 并将上述内容填入
const MHHFINJECTION_SCRIPT = `
<script>
  (function() {
    if (document.getElementById('mhhf-tool-iframe')) return; // 防止重复注入

    const iframe = document.createElement('iframe');
    iframe.id = 'mhhf-tool-iframe';
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;border:none;z-index:2147483645;pointer-events:none;';

    document.body.appendChild(iframe);

    iframe.addEventListener('load', () => {
        const doc = iframe.contentDocument;
        if (!doc) return;

        // 注入 CSS
        const style = doc.createElement('style');
        style.textContent = \`${TOOL_CSS.replace(/`/g, '\\`')}\`;
        doc.head.appendChild(style);
        
        // 注入 HTML
        doc.body.innerHTML = \`${TOOL_HTML.replace(/`/g, '\\`')}\`;

        // 注入 JS
        const script = doc.createElement('script');
        script.textContent = \`${TOOL_JS.replace(/`/g, '\\`')}\`;
        doc.body.appendChild(script);
    });

    // 使用 srcdoc 来初始化 iframe 的内容，确保同源
    iframe.srcdoc = '<!DOCTYPE html><html><head></head><body></body></html>';

  })();
<\/script>
`;

// 特定网站的替换规则 (针对某些站点的特殊处理)
const SPECIAL_REPLACEMENTS: Record<string, Array<{pattern: RegExp, replacement: Function}>> = {
  'telegra.ph': [
    {
      pattern: /(?:src|href|content)=['"](?:\.?\/)?([^"']*\.(css|js|png|jpg|jpeg|gif|svg|webp|ico))["']/gi,
      replacement: (match: string, path: string) => {
        if (path.startsWith('http')) {
          return match.replace(`"${path}`, `"/proxy/${path}`);
        }
        if (path.startsWith('/')) {
          return match.replace(`"/${path.slice(1)}`, `"/telegraph/${path.slice(1)}`);
        }
        return match.replace(`"${path}`, `"/telegraph/${path}`);
      }
    },
  ],
  'www.mhhf.com': [
    {
      pattern: /(?:src|href|content)=['"](?:\.?\/)?([^"']*\.(css|js|png|jpg|jpeg|gif|svg|webp|ico))["']/gi,
      replacement: (match: string, path: string) => {
        if (path.startsWith('http')) {
          return match.replace(`"${path}`, `"/proxy/${path}`);
        }
        if (path.startsWith('/')) {
          return match.replace(`"/${path.slice(1)}`, `"/mhhf/${path.slice(1)}`);
        }
        return match.replace(`"${path}`, `"/mhhf/${path}`);
      }
    },
  ],
  'vocechat.xf-yun.cn': [
    {
      pattern: /(?:src|href|content)=['"](?:\.?\/)?([^"']*\.(css|js|png|jpg|jpeg|gif|svg|webp|ico))["']/gi,
      replacement: (match: string, path: string) => {
        if (path.startsWith('http')) {
          return match.replace(`"${path}`, `"/proxy/${path}`);
        }
        if (path.startsWith('/')) {
          return match.replace(`"/${path.slice(1)}`, `"/vc/${path.slice(1)}`);
        }
        return match.replace(`"${path}`, `"/vc/${path}`);
      }
    },
  ], // <--- 修正了这里的语法错误
  'lolitalibrary.com': [
    {
      pattern: /(?:src|href|content)=['"](?:\.?\/)?([^"']*\.(css|js|png|jpg|jpeg|gif|svg|webp|ico))["']/gi,
      replacement: (match: string, path: string) => {
        if (path.startsWith('http')) {
          return match.replace(`"${path}`, `"/proxy/${path}`);
        }
        if (path.startsWith('/')) {
          return match.replace(`"/${path.slice(1)}`, `"/cat-baike/${path.slice(1)}`);
        }
        return match.replace(`"${path}`, `"/cat-baike/${path}`);
      }
    },
  ],
  'hexo-gally.vercel.app': [
    {
      pattern: /(?:src|href|content)=['"](?:\.?\/)?([^"']*\.(css|js|png|jpg|jpeg|gif|svg|webp|ico))["']/gi,
      replacement: (match: string, path: string) => {
        if (path.startsWith('http')) return match;
        if (path.startsWith('/')) {
          return match.replace(`"/${path.slice(1)}`, `"/telegraph/${path.slice(1)}`);
        }
        return match.replace(`"${path}`, `"/telegraph/${path}`);
      }
    },
    {
      pattern: /url\(['"]?(?:\.?\/)?([^'")]*\.(png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot))['"]?\)/gi,
      replacement: (match: string, path: string) => {
        if (path.startsWith('http')) return match;
        if (path.startsWith('/')) {
          return match.replace(`(/${path.slice(1)}`, `(/hexo/${path.slice(1)}`);
        }
        return match.replace(`(${path}`, `(/hexo/${path}`);
      }
    },
    {
      pattern: /(src|href)=["']((?:\/_next\/)[^"']*)["']/gi,
      replacement: (match: string, attr: string, path: string) => {
        return `${attr}="/hexo${path}"`;
      }
    },
    {
      pattern: /"(\/_next\/static\/chunks\/[^"]+)"/gi,
      replacement: (match: string, path: string) => {
        return `"/hexo${path}"`;
      }
    },
    {
      pattern: /"(\/api\/[^"]+)"/gi,
      replacement: (match: string, path: string) => {
        return `"/hexo${path}"`;
      }
    },
    {
      pattern: /data-href=["']((?:\/_next\/)[^"']*)["']/gi,
      replacement: (match: string, path: string) => {
        return `data-href="/hexo${path}"`;
      }
    }
  ],
  'tv.gally.ddns-ip.net': [
    {
      pattern: /(?:src|href|content)=['"](?:\.?\/)?([^"']*\.(css|js|png|jpg|jpeg|gif|svg|webp|ico))["']/gi,
      replacement: (match: string, path: string) => {
        if (path.startsWith('http')) return match;
        if (path.startsWith('/')) {
          return match.replace(`"/${path.slice(1)}`, `"/tv/${path.slice(1)}`);
        }
        return match.replace(`"${path}`, `"/tv/${path}`);
      }
    },
    {
      pattern: /url\(['"]?(?:\.?\/)?([^'")]*\.(png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot))['"]?\)/gi,
      replacement: (match: string, path: string) => {
        if (path.startsWith('http')) return match;
        if (path.startsWith('/')) {
          return match.replace(`(/${path.slice(1)}`, `(/tv/${path.slice(1)}`);
        }
        return match.replace(`(${path}`, `(/tv/${path}`);
      }
    }
  ]
};

export default async (request: Request, context: Context) => {
  // 处理 CORS 预检请求 (OPTIONS)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin, Range",
        "Access-Control-Max-Age": "86400", // 24小时缓存预检响应
        "Cache-Control": "public, max-age=86400"
      }
    });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  // 特殊处理 /proxy/ 路径 - 用于代理任意URL
  if (path.startsWith('/proxy/')) {
    try {
      let targetUrlString = path.substring('/proxy/'.length);
      if (targetUrlString.startsWith('http%3A%2F%2F') || targetUrlString.startsWith('https%3A%2F%2F')) {
        targetUrlString = decodeURIComponent(targetUrlString);
      }
      if (!targetUrlString.startsWith('http://') && !targetUrlString.startsWith('https://')) {
        targetUrlString = 'https://' + targetUrlString;
      }
      const targetUrl = new URL(targetUrlString);
      if (url.search && !targetUrlString.includes('?')) {
        targetUrl.search = url.search;
      }
      context.log(`Proxying generic request to: ${targetUrl.toString()}`);
      const proxyRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'manual',
      });
      proxyRequest.headers.set("Host", targetUrl.host);
      const clientIp = context.ip || request.headers.get('x-nf-client-connection-ip') || "";
      proxyRequest.headers.set('X-Forwarded-For', clientIp);
      proxyRequest.headers.set('X-Forwarded-Host', url.host);
      proxyRequest.headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));
      proxyRequest.headers.delete('accept-encoding');
      const referer = request.headers.get('referer');
      if (referer) {
        try {
          const refUrl = new URL(referer);
          const newReferer = `${targetUrl.protocol}//${targetUrl.host}${refUrl.pathname}${refUrl.search}`;
          proxyRequest.headers.set('referer', newReferer);
        } catch(e) {}
      } else {
        proxyRequest.headers.set('referer', `${targetUrl.protocol}//${targetUrl.host}/`);
      }
      const response = await fetch(proxyRequest);
      let newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Range');
      newResponse.headers.delete('Content-Security-Policy');
      newResponse.headers.delete('Content-Security-Policy-Report-Only');
      newResponse.headers.delete('X-Frame-Options');
      newResponse.headers.delete('X-Content-Type-Options');
      if (response.status >= 300 && response.status < 400 && response.headers.has('location')) {
        const location = response.headers.get('location')!;
        const redirectedUrl = new URL(location, targetUrl);
        const newLocation = `${url.origin}/proxy/${encodeURIComponent(redirectedUrl.toString())}`;
        newResponse.headers.set('Location', newLocation);
      }
      return newResponse;
    } catch (error) {
      context.log(`Error proxying generic URL: ${error}`);
      return new Response(`代理请求失败: ${error}`, { 
        status: 502,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'text/plain;charset=UTF-8'
        }
      });
    }
  }

  // 查找匹配的代理配置
  let targetBaseUrl: string | null = null;
  let matchedPrefix: string | null = null;
  const prefixes = Object.keys(PROXY_CONFIG).sort().reverse();
  for (const prefix of prefixes) {
    if (path === prefix || path.startsWith(prefix + '/')) {
      targetBaseUrl = PROXY_CONFIG[prefix as keyof typeof PROXY_CONFIG];
      matchedPrefix = prefix;
      break;
    }
  }

  // 如果找到了匹配的规则
  if (targetBaseUrl && matchedPrefix) {
    const remainingPath = path.substring(matchedPrefix.length);
    const targetUrlString = targetBaseUrl.replace(/\/$/, '') + remainingPath;
    const targetUrl = new URL(targetUrlString);
    targetUrl.search = url.search;
    context.log(`Proxying "${path}" to "${targetUrl.toString()}"`);

    try {
      const proxyRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'manual',
      });
      proxyRequest.headers.set("Host", targetUrl.host);
      const clientIp = context.ip || request.headers.get('x-nf-client-connection-ip') || "";
      proxyRequest.headers.set('X-Forwarded-For', clientIp);
      proxyRequest.headers.set('X-Forwarded-Host', url.host);
      proxyRequest.headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));
      proxyRequest.headers.delete('accept-encoding');
      const referer = request.headers.get('referer');
      if (referer) {
        try {
          const refUrl = new URL(referer);
          const newReferer = `${targetUrl.protocol}//${targetUrl.host}${refUrl.pathname}${refUrl.search}`;
          proxyRequest.headers.set('referer', newReferer);
        } catch(e) {}
      } else {
        proxyRequest.headers.set('referer', `${targetUrl.protocol}//${targetUrl.host}/`);
      }
      
      const response = await fetch(proxyRequest);
      const contentType = response.headers.get('content-type') || '';
      let newResponse: Response;
      
      const needsRewrite = HTML_CONTENT_TYPES.some(type => contentType.includes(type)) || 
                           CSS_CONTENT_TYPES.some(type => contentType.includes(type)) ||
                           JS_CONTENT_TYPES.some(type => contentType.includes(type));
                           
      if (needsRewrite) {
        const clonedResponse = response.clone();
        let content = await clonedResponse.text();
        const targetDomain = targetUrl.host;
        const targetPathBase = targetUrl.pathname.substring(0, targetUrl.pathname.lastIndexOf('/') + 1);
        
        if (HTML_CONTENT_TYPES.some(type => contentType.includes(type))) {
          content = content.replace(new RegExp(`(href|src|action|content)=["']https?://${targetDomain}(/[^"']*?)["']`, 'gi'), `$1="${url.origin}${matchedPrefix}$2"`);
          content = content.replace(new RegExp(`(href|src|action|content)=["']//${targetDomain}(/[^"']*?)["']`, 'gi'), `$1="${url.origin}${matchedPrefix}$2"`);
          content = content.replace(new RegExp(`(href|src|action|content)=["'](/[^"']*?)["']`, 'gi'), `$1="${url.origin}${matchedPrefix}$2"`);
          content = content.replace(new RegExp(`url\\(['"]?https?://${targetDomain}(/[^)'"]*?)['"]?\\)`, 'gi'), `url(${url.origin}${matchedPrefix}$1)`);
          content = content.replace(new RegExp(`url\\(['"]?//${targetDomain}(/[^)'"]*?)['"]?\\)`, 'gi'), `url(${url.origin}${matchedPrefix}$1)`);
          content = content.replace(new RegExp(`url\\(['"]?(/[^)'"]*?)['"]?\\)`, 'gi'), `url(${url.origin}${matchedPrefix}$1)`);
          content = content.replace(new RegExp(`<base[^>]*href=["']https?://${targetDomain}(?:/[^"']*?)?["'][^>]*>`, 'gi'), `<base href="${url.origin}${matchedPrefix}/">`);
          content = content.replace(/(href|src|action|data-src|data-href)=["']((?!https?:\/\/|\/\/|\/)[^"']+)["']/gi, `$1="${url.origin}${matchedPrefix}/${targetPathBase}$2"`);
          content = content.replace(new RegExp(`"(url|path|endpoint|src|href)"\\s*:\\s*"https?://${targetDomain}(/[^"]*?)"`, 'gi'), `"$1":"${url.origin}${matchedPrefix}$2"`);
          content = content.replace(/"(url|path|endpoint|src|href)"\s*:\s*"(\/[^"]*?)"/gi, `"$1":"${url.origin}${matchedPrefix}$2"`);
          content = content.replace(new RegExp(`['"]https?://${targetDomain}(/[^"']*?)['"]`, 'gi'), `"${url.origin}${matchedPrefix}$1"`);
          content = content.replace(/([^a-zA-Z0-9_])(['"])(\/[^\/'"]+\/[^'"]*?)(['"])/g, `$1$2${url.origin}${matchedPrefix}$3$4`);
          content = content.replace(/srcset=["']([^"']+)["']/gi, (match, srcset) => {
            const newSrcset = srcset.split(',').map((src: string) => {
              const [srcUrl, descriptor] = src.trim().split(/\s+/);
              let newUrl = srcUrl;
              if (srcUrl.startsWith('http://') || srcUrl.startsWith('https://')) {
                if (srcUrl.includes(targetDomain)) { newUrl = srcUrl.replace(new RegExp(`https?://${targetDomain}(/[^\\s]*)`, 'i'), `${url.origin}${matchedPrefix}$1`); }
              } else if (srcUrl.startsWith('//')) {
                if (srcUrl.includes(targetDomain)) { newUrl = srcUrl.replace(new RegExp(`//${targetDomain}(/[^\\s]*)`, 'i'), `${url.origin}${matchedPrefix}$1`); }
              } else if (srcUrl.startsWith('/')) { newUrl = `${url.origin}${matchedPrefix}${srcUrl}`; }
              return descriptor ? `${newUrl} ${descriptor}` : newUrl;
            }).join(', ');
            return `srcset="${newSrcset}"`;
          });
          
          if (SPECIAL_REPLACEMENTS[targetDomain as keyof typeof SPECIAL_REPLACEMENTS]) {
            const replacements = SPECIAL_REPLACEMENTS[targetDomain as keyof typeof SPECIAL_REPLACEMENTS];
            for (const replacement of replacements) {
              content = content.replace(replacement.pattern, replacement.replacement as any);
            }
          }
          
          let injectedContent = '';
          const fixScript = `
          <script>
          (function() {
            if (window.location.pathname.startsWith('/hexo')) {
              const originalFetch = window.fetch;
              window.fetch = function(resource, init) {
                if (typeof resource === 'string' && resource.includes('/_next/data/') && !resource.startsWith('/hexo')) {
                  resource = '/hexo' + resource;
                }
                return originalFetch.call(this, resource, init);
              };
              const observer = new MutationObserver(function(mutations) {
                document.querySelectorAll('script[src^="/_next/"]').forEach(function(el) {
                  const src = el.getAttribute('src');
                  if (src && !src.startsWith('/hexo')) { el.setAttribute('src', '/hexo' + src); }
                });
                document.querySelectorAll('link[rel="preload"][href^="/_next/"]').forEach(function(el) {
                  const href = el.getAttribute('href');
                  if (href && !href.startsWith('/hexo')) { el.setAttribute('href', '/hexo' + href); }
                });
              });
              const startObserver = () => observer.observe(document.documentElement, { childList: true, subtree: true });
              if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', startObserver); } else { startObserver(); }
            }
            const observer = new MutationObserver(function(mutations) {
              mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                  mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                       const fixElement = (el) => {
                         ['src', 'href', 'data-src', 'data-href'].forEach(function(attr) {
                           if (el.hasAttribute(attr)) {
                             let val = el.getAttribute(attr);
                             if (val && !val.startsWith("https://") && !val.startsWith("http://") && !val.startsWith("blob:") && !val.startsWith("data:") && val.startsWith('/')) {
                               el.setAttribute(attr, '${matchedPrefix}' + val);
                             }
                           }
                         });
                         if (el.hasAttribute('style') && el.getAttribute('style').includes('url(')) {
                           let style = el.getAttribute('style');
                           style = style.replace(/url\\(['"]?(\\/[^)'"]*?)['"]?\\)/gi, 'url(${matchedPrefix}$1)');
                           el.setAttribute('style', style);
                         }
                       };
                       if (node.matches('script[src], link[href], img[src], a[href], [data-src], [data-href], [style*="url("]')) { fixElement(node); }
                       node.querySelectorAll('script[src], link[href], img[src], a[href], [data-src], [data-href], [style*="url("]').forEach(fixElement);
                    }
                  });
                }
              });
            });
            const startObserver = () => observer.observe(document.body, { childList: true, subtree: true });
            if (document.body) { startObserver(); } else { window.addEventListener('DOMContentLoaded', startObserver); }
          })();
          <\/script>
          `;
          injectedContent += fixScript;

          // **针对 mhhf.com，注入 IndexedDB 工具**
          if (targetDomain === 'www.mhhf.com') {
            injectedContent += MHHFINJECTION_SCRIPT; // <--- 这里使用新的 Iframe 注入脚本
          }
          
          const bodyCloseTagPos = content.lastIndexOf('</body>');
          if (bodyCloseTagPos !== -1) {
            content = content.substring(0, bodyCloseTagPos) + injectedContent + content.substring(bodyCloseTagPos);
          } else {
            content += injectedContent;
          }
        }
        
        if (CSS_CONTENT_TYPES.some(type => contentType.includes(type))) {
          content = content.replace(new RegExp(`url\\(['"]?https?://${targetDomain}(/[^)'"]*?)['"]?\\)`, 'gi'), `url(${url.origin}${matchedPrefix}$1)`);
          content = content.replace(new RegExp(`url\\(['"]?//${targetDomain}(/[^)'"]*?)['"]?\\)`, 'gi'), `url(${url.origin}${matchedPrefix}$1)`);
          content = content.replace(new RegExp(`url\\(['"]?(/[^)'"]*?)['"]?\\)`, 'gi'), `url(${url.origin}${matchedPrefix}$1)`);
          const cssPath = targetUrl.pathname;
          const cssDir = cssPath.substring(0, cssPath.lastIndexOf('/') + 1);
          content = content.replace(/url\(['"]?(?!https?:\/\/|\/\/|\/|data:|#)([^)'"]*)['"]?\)/gi, `url(${url.origin}${matchedPrefix}${cssDir}$1)`);
        }
        
        if (JS_CONTENT_TYPES.some(type => contentType.includes(type))) {
          content = content.replace(new RegExp(`(['"])https?://${targetDomain}(/[^'"]*?)(['"])`, 'gi'), `$1${url.origin}${matchedPrefix}$2$3`);
          content = content.replace(new RegExp(`(['"])//${targetDomain}(/[^'"]*?)(['"])`, 'gi'), `$1${url.origin}${matchedPrefix}$2$3`);
          content = content.replace(/(['"])(\/[^'"]*?\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|json|mp3|mp4|webm|ogg|woff|woff2|ttf|eot))(['"])/gi, `$1${url.origin}${matchedPrefix}$2$3`);
        }
        
        newResponse = new Response(content, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      } else {
        newResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      }
      
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Range');
      newResponse.headers.delete('Content-Security-Policy');
      newResponse.headers.delete('Content-Security-Policy-Report-Only');
      newResponse.headers.delete('X-Frame-Options');
      newResponse.headers.delete('X-Content-Type-Options');
      
      if (HTML_CONTENT_TYPES.some(type => contentType.includes(type))) {
        newResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        newResponse.headers.set('Pragma', 'no-cache');
        newResponse.headers.set('Expires', '0');
      } else {
        newResponse.headers.set('Cache-Control', 'public, max-age=86400');
      }
      
      if (response.status >= 300 && response.status < 400 && response.headers.has('location')) {
          const location = response.headers.get('location')!;
          const redirectedUrl = new URL(location, targetUrl);
          if (redirectedUrl.origin === targetUrl.origin) {
              const newLocation = url.origin + matchedPrefix + redirectedUrl.pathname + redirectedUrl.search;
              context.log(`Rewriting redirect from ${location} to ${newLocation}`);
              newResponse.headers.set('Location', newLocation);
          } else {
              context.log(`Proxying redirect to external location: ${location}`);
              newResponse.headers.set('Location', location);
          }
      }
      
      return newResponse;

    } catch (error) {
      context.log("Error fetching target URL:", error);
      return new Response("代理请求失败: " + (error instanceof Error ? error.message : String(error)), { 
        status: 502,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'text/plain;charset=UTF-8'
        }
      });
    }
  }

  return;
};
