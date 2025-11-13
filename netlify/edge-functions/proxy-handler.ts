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

// 独立的 IndexedDB 工具页面 (v10: Standalone Page)
const INDEXEDDB_TOOL_HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IndexedDB 数据管理工具</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      background-color: #f4f4f9;
      color: #333;
    }
    /* The host is now the body, but we'll keep the panel logic separate */
    #mhhf-db-tool-panel, #ls-tool-panel {
      display: block; /* Always visible on this page */
      position: relative;
      top: 0;
      left: 0;
      transform: none;
      width: 90%;
      max-width: 800px;
      margin: 20px auto;
      background-color: white;
      border: 1px solid #ccc;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      padding: 20px;
      border-radius: 8px;
    }
    .panel-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }
    .panel-header h3 { margin: 0; }
    textarea { width: 100%; box-sizing: border-box; height: 40vh; margin-top: 10px; font-family: monospace; border: 1px solid #ccc; border-radius: 4px; padding: 10px; resize: vertical; }
    .actions { margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap; }
    .actions button:disabled { cursor: not-allowed; background-color: #e9ecef; }
    #mhhf-confirm-section, #ls-confirm-section { display: none; margin-top: 15px; padding: 10px; border: 1px solid #fd7e14; border-radius: 4px; background-color: #fff4e6; }
    #mhhf-confirm-section p, #ls-confirm-section p { margin: 0 0 10px 0; font-size: 14px; color: #d9480f;}
    #mhhf-confirm-actions button, #ls-confirm-actions button { margin-right: 10px; }
    button { padding: 8px 12px; border: 1px solid #ccc; background-color: #f0f0f0; cursor: pointer; border-radius: 4px; font-family: inherit; }
    button:hover:not(:disabled) { background-color: #e0e0e0; }
    #mhhf-confirm-import-btn, #ls-confirm-import-btn { background-color: #fa5252; color: white; border-color: #fa5252; }
    #mhhf-confirm-import-btn:hover, #ls-confirm-import-btn:hover { background-color: #c92a2a; }
    .status { margin-top: 15px; padding: 10px; border-radius: 4px; font-size: 14px; color: #333; background-color: #f8f9fa; border: 1px solid #dee2e6;}
  </style>
</head>
<body>
  <div id="mhhf-db-tool-panel">
    <div class="panel-header"><h3>IndexedDB 数据管理工具</h3></div>
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
      <div id="mhhf-status-area" class="status">准备就绪. (v10: Standalone Page)</div>
    </div>
  </div>

  <script>
    (function() {
      // === UI Element References ===
      const exportBtn = document.getElementById('mhhf-export-btn');
      const importBtn = document.getElementById('mhhf-import-btn');
      const copyBtn = document.getElementById('mhhf-copy-btn');
      const pasteBtn = document.getElementById('mhhf-paste-btn');
      const dataArea = document.getElementById('mhhf-data-area');
      const statusArea = document.getElementById('mhhf-status-area');
      const actionsSection = document.getElementById('mhhf-actions-section');
      const confirmSection = document.getElementById('mhhf-confirm-section');
      const confirmImportBtn = document.getElementById('mhhf-confirm-import-btn');
      const cancelImportBtn = document.getElementById('mhhf-cancel-import-btn');
      
      // === Helper & Serialization Functions ===
      const setStatus = (msg, isError = false) => { statusArea.textContent = msg; statusArea.style.color = isError ? '#d9480f' : '#2b9a2b'; statusArea.style.backgroundColor = isError ? '#fff4e6' : '#e6fcf5'; };
      const promisifyRequest = (request) => new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      function isBinaryIshString(str) { return /[\\x00-\\x08\\x0B\\x0E-\\x1F\\x7F-\\x9F]/.test(str); }
      function stringToBase64(str) { const bytes = new Uint8Array(str.length); for (let i = 0; i < str.length; i++) { bytes[i] = str.charCodeAt(i); } let binary = ''; for (let i = 0; i < bytes.byteLength; i++) { binary += String.fromCharCode(bytes[i]); } return window.btoa(binary); }
      function base64ToString(base64) { const binaryString = window.atob(base64); const bytes = new Uint8Array(binaryString.length); for(let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); } return String.fromCharCode.apply(null, bytes); }
      function arrayBufferToBase64(buffer) { let b='';new Uint8Array(buffer).forEach(B=>{b+=String.fromCharCode(B)}); return window.btoa(b) }
      function base64ToArrayBuffer(base64) { const s=window.atob(base64),b=new Uint8Array(s.length);for(let i=0;i<s.length;i++){b[i]=s.charCodeAt(i)}return b.buffer }
      async function serializeAsync(data) { if (data instanceof Blob) return { "$type": "blob", "$mime": data.type, "$data": arrayBufferToBase64(await data.arrayBuffer()) }; if (data instanceof ArrayBuffer) return { "$type": "arraybuffer", "$data": arrayBufferToBase64(data) }; if (typeof data === 'string' && isBinaryIshString(data)) return { "$type": "binary-string", "$data": stringToBase64(data) }; if (Array.isArray(data)) return Promise.all(data.map(serializeAsync)); if (data && typeof data === 'object' && Object.prototype.toString.call(data) === '[object Object]') { const obj = {}; for (const key in data) { if (Object.prototype.hasOwnProperty.call(data, key)) obj[key] = await serializeAsync(data[key]); } return obj; } return data; }
      function deserializeReviver(key, value) { if (value && typeof value === 'object' && !Array.isArray(value)) { if (value['$type'] === 'blob') return new Blob([base64ToArrayBuffer(value['$data'])], { type: value['$mime'] }); if (value['$type'] === 'arraybuffer') return base64ToArrayBuffer(value['$data']); if (value['$type'] === 'binary-string') return base64ToString(value['$data']); } return value; }
      
      // === UI Interaction Logic ===
      function resetUiToActions() { confirmSection.style.display = 'none'; actionsSection.style.display = 'flex'; dataArea.readOnly = false; }
      importBtn.addEventListener('click', () => { if (!dataArea.value.trim()) { setStatus('导入失败: 文本框为空。', true); return; } actionsSection.style.display = 'none'; confirmSection.style.display = 'block'; dataArea.readOnly = true; });
      cancelImportBtn.addEventListener('click', () => { resetUiToActions(); setStatus('导入已取消。'); });
      copyBtn.addEventListener('click', () => { if (!dataArea.value) return; navigator.clipboard.writeText(dataArea.value).then(() => { setStatus('已成功复制到剪贴板！'); }).catch(err => { setStatus('复制失败: ' + err.message, true); }); });
      pasteBtn.addEventListener('click', async () => { try { if (!navigator.clipboard || !navigator.clipboard.readText) { throw new Error('浏览器不支持剪贴板读取 API。'); } const text = await navigator.clipboard.readText(); dataArea.value = text; setStatus('已从剪贴板粘贴。'); copyBtn.disabled = dataArea.value.trim() === ''; } catch (err) { setStatus('粘贴失败: ' + err.message, true); console.error('Paste Error:', err); } });
      dataArea.addEventListener('input', () => { copyBtn.disabled = dataArea.value.trim() === ''; });
      
      // === Core IndexedDB Functions ===
      async function exportAllData() { setStatus('开始导出...'); try { if (!('indexedDB' in window)) throw new Error('浏览器不支持 IndexedDB。'); const dbsInfo = window.indexedDB.databases ? await window.indexedDB.databases() : []; if (!dbsInfo || dbsInfo.length === 0) { setStatus('未找到任何 IndexedDB 数据库。', true); return; } let allData = {}, exportedDbCount = 0; for (const dbInfo of dbsInfo) { if (!dbInfo.name) continue; const db = await promisifyRequest(indexedDB.open(dbInfo.name)); const storeNames = Array.from(db.objectStoreNames); if (storeNames.length === 0) { db.close(); continue; } const dbData = {}; const transaction = db.transaction(storeNames, 'readonly'); for (const storeName of storeNames) { const store = transaction.objectStore(storeName); const keys = await promisifyRequest(store.getAllKeys()); const values = await promisifyRequest(store.getAll()); const serializedKeys = await serializeAsync(keys); const serializedValues = await serializeAsync(values); dbData[storeName] = serializedKeys.map((key, index) => ({ key: key, value: serializedValues[index] })); } allData[dbInfo.name] = dbData; db.close(); exportedDbCount++; } if (exportedDbCount > 0) { dataArea.value = JSON.stringify(allData, null, 2); copyBtn.disabled = false; setStatus(\`成功导出 \${exportedDbCount} 个数据库的数据！\`); } else { setStatus('没有找到包含任何数据的数据库。', true); } } catch (error) { setStatus('导出失败: ' + error.message, true); console.error('Export Error:', error); } }
      async function executeImport() { setStatus('开始导入...'); let dataToImport; try { dataToImport = JSON.parse(dataArea.value, deserializeReviver); } catch(e) { setStatus('导入失败: 无效的 JSON 格式或解析错误。', true); console.error('Parse Error:', e); return; } try { for (const dbName in dataToImport) { if (!Object.prototype.hasOwnProperty.call(dataToImport, dbName)) continue; const db = await promisifyRequest(indexedDB.open(dbName)); const storeNamesToImport = Object.keys(dataToImport[dbName]); const availableStoreNames = Array.from(db.objectStoreNames); const validStoreNames = storeNamesToImport.filter(name => availableStoreNames.includes(name)); if (validStoreNames.length === 0) { db.close(); continue; } const transaction = db.transaction(validStoreNames, 'readwrite'); for (const storeName of validStoreNames) { const store = transaction.objectStore(storeName); await promisifyRequest(store.clear()); const pairs = dataToImport[dbName][storeName]; if (Array.isArray(pairs)) { pairs.forEach(pair => { if (pair && pair.key !== undefined && pair.value !== undefined) store.put(pair.value, pair.key); }); } } await new Promise((resolve, reject) => { transaction.oncomplete = resolve; transaction.onerror = reject; }); db.close(); } setStatus('导入成功！页面可能需要刷新以应用更改。'); } catch (error) { setStatus('导入失败: ' + error.message, true); console.error('Import Error:', error); } }
      
      confirmImportBtn.addEventListener('click', async () => { await executeImport(); resetUiToActions(); });
      exportBtn.addEventListener('click', exportAllData);
    })();
  <\/script>
</body>
</html>
`;

// *** 新增 ***
// LocalStorage 数据管理工具页面 (v1)
const LOCALSTORAGE_TOOL_HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LocalStorage 数据管理工具</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 0; background-color: #f4f4f9; color: #333; }
    #ls-tool-panel { display: block; position: relative; width: 90%; max-width: 800px; margin: 20px auto; background-color: white; border: 1px solid #ccc; box-shadow: 0 5px 15px rgba(0,0,0,0.1); padding: 20px; border-radius: 8px; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }
    .panel-header h3 { margin: 0; }
    textarea { width: 100%; box-sizing: border-box; height: 40vh; margin-top: 10px; font-family: monospace; border: 1px solid #ccc; border-radius: 4px; padding: 10px; resize: vertical; }
    .actions { margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap; }
    .actions button:disabled { cursor: not-allowed; background-color: #e9ecef; }
    #ls-confirm-section { display: none; margin-top: 15px; padding: 10px; border: 1px solid #fd7e14; border-radius: 4px; background-color: #fff4e6; }
    #ls-confirm-section p { margin: 0 0 10px 0; font-size: 14px; color: #d9480f;}
    #ls-confirm-actions button { margin-right: 10px; }
    button { padding: 8px 12px; border: 1px solid #ccc; background-color: #f0f0f0; cursor: pointer; border-radius: 4px; font-family: inherit; }
    button:hover:not(:disabled) { background-color: #e0e0e0; }
    #ls-confirm-import-btn { background-color: #fa5252; color: white; border-color: #fa5252; }
    #ls-confirm-import-btn:hover { background-color: #c92a2a; }
    .status { margin-top: 15px; padding: 10px; border-radius: 4px; font-size: 14px; color: #333; background-color: #f8f9fa; border: 1px solid #dee2e6;}
  </style>
</head>
<body>
  <div id="ls-tool-panel">
    <div class="panel-header"><h3>LocalStorage 数据管理工具</h3></div>
    <div class="content">
      <p>管理当前域名的 LocalStorage 数据。您可以导出所有数据为 JSON，或从 JSON 导入数据以覆盖现有内容。</p>
      <textarea id="ls-data-area" placeholder="导出数据将显示在此处，或在此处粘贴 JSON 数据以导入。"></textarea>
      <div id="ls-actions-section" class="actions">
        <button id="ls-export-btn">导出数据</button>
        <button id="ls-paste-btn">粘贴</button>
        <button id="ls-copy-btn" disabled>复制</button>
        <button id="ls-import-btn">导入数据</button>
      </div>
      <div id="ls-confirm-section">
        <p><strong>警告：</strong>此操作将清空当前域名的所有 LocalStorage，然后导入文本框中的数据。该操作无法撤销。确定要继续吗？</p>
        <div id="ls-confirm-actions">
          <button id="ls-confirm-import-btn">确认导入</button>
          <button id="ls-cancel-import-btn">取消</button>
        </div>
      </div>
      <div id="ls-status-area" class="status">准备就绪.</div>
    </div>
  </div>

  <script>
    (function() {
      // === UI Element References ===
      const exportBtn = document.getElementById('ls-export-btn');
      const importBtn = document.getElementById('ls-import-btn');
      const copyBtn = document.getElementById('ls-copy-btn');
      const pasteBtn = document.getElementById('ls-paste-btn');
      const dataArea = document.getElementById('ls-data-area');
      const statusArea = document.getElementById('ls-status-area');
      const actionsSection = document.getElementById('ls-actions-section');
      const confirmSection = document.getElementById('ls-confirm-section');
      const confirmImportBtn = document.getElementById('ls-confirm-import-btn');
      const cancelImportBtn = document.getElementById('ls-cancel-import-btn');
      
      // === Helper Functions ===
      const setStatus = (msg, isError = false) => {
        statusArea.textContent = msg;
        statusArea.style.color = isError ? '#d9480f' : '#2b9a2b';
        statusArea.style.backgroundColor = isError ? '#fff4e6' : '#e6fcf5';
      };

      // === Core Functions ===
      function exportData() {
        setStatus('开始导出...');
        try {
          if (!window.localStorage) {
            throw new Error('浏览器不支持 LocalStorage。');
          }
          const data = {};
          const keys = Object.keys(localStorage);
          if (keys.length === 0) {
            setStatus('LocalStorage 为空，无需导出。', true);
            dataArea.value = '{}';
            copyBtn.disabled = true;
            return;
          }
          keys.forEach(key => {
            data[key] = localStorage.getItem(key);
          });
          dataArea.value = JSON.stringify(data, null, 2);
          copyBtn.disabled = false;
          setStatus(\`成功导出 \${keys.length} 个条目！\`);
        } catch (error) {
          setStatus('导出失败: ' + error.message, true);
          console.error('Export Error:', error);
        }
      }

      function importData() {
        setStatus('开始导入...');
        let dataToImport;
        try {
          dataToImport = JSON.parse(dataArea.value);
          if (typeof dataToImport !== 'object' || dataToImport === null || Array.isArray(dataToImport)) {
            throw new Error('数据必须是一个 JSON 对象。');
          }
        } catch(e) {
          setStatus('导入失败: 无效的 JSON 格式或数据类型错误。', true);
          console.error('Parse Error:', e);
          return;
        }

        try {
          if (!window.localStorage) {
            throw new Error('浏览器不支持 LocalStorage。');
          }
          localStorage.clear();
          let importCount = 0;
          for (const key in dataToImport) {
            if (Object.prototype.hasOwnProperty.call(dataToImport, key)) {
              const value = dataToImport[key];
              // LocalStorage 只能存储字符串
              localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
              importCount++;
            }
          }
          setStatus(\`导入成功！共导入 \${importCount} 个条目。页面可能需要刷新以应用更改。\`);
        } catch (error) {
          setStatus('导入失败: ' + error.message, true);
          console.error('Import Error:', error);
        }
      }

      // === UI Interaction Logic ===
      function resetUiToActions() {
        confirmSection.style.display = 'none';
        actionsSection.style.display = 'flex';
        dataArea.readOnly = false;
      }
      
      exportBtn.addEventListener('click', exportData);
      
      importBtn.addEventListener('click', () => {
        if (!dataArea.value.trim()) {
          setStatus('导入失败: 文本框为空。', true);
          return;
        }
        actionsSection.style.display = 'none';
        confirmSection.style.display = 'block';
        dataArea.readOnly = true;
      });
      
      cancelImportBtn.addEventListener('click', () => {
        resetUiToActions();
        setStatus('导入已取消。');
      });

      confirmImportBtn.addEventListener('click', () => {
        importData();
        resetUiToActions();
      });

      copyBtn.addEventListener('click', () => {
        if (!dataArea.value) return;
        navigator.clipboard.writeText(dataArea.value)
          .then(() => { setStatus('已成功复制到剪贴板！'); })
          .catch(err => { setStatus('复制失败: ' + err.message, true); });
      });

      pasteBtn.addEventListener('click', async () => {
        try {
          if (!navigator.clipboard || !navigator.clipboard.readText) {
            throw new Error('浏览器不支持剪贴板读取 API。');
          }
          const text = await navigator.clipboard.readText();
          dataArea.value = text;
          setStatus('已从剪贴板粘贴。');
          copyBtn.disabled = dataArea.value.trim() === '';
        } catch (err) {
          setStatus('粘贴失败: ' + err.message, true);
          console.error('Paste Error:', err);
        }
      });
      
      dataArea.addEventListener('input', () => {
        copyBtn.disabled = dataArea.value.trim() === '';
      });

      // 页面加载时自动导出一次
      exportData();
    })();
  <\/script>
</body>
</html>
`;


// 特定网站的替换规则 (针对某些站点的特殊处理)
const SPECIAL_REPLACEMENTS: Record<string, Array<{pattern: RegExp, replacement: Function}>> = {
  // ... （此处省略了您原有的 SPECIAL_REPLACEMENTS 内容，保持不变）
  'telegra.ph': [
    // 替换所有 /css/, /js/, /images/ 等资源路径
    {
      pattern: /(?:src|href|content)=['"](?:\.?\/)?([^"']*\.(css|js|png|jpg|jpeg|gif|svg|webp|ico))["']/gi,
      replacement: (match: string, path: string, ext: string) => {
        // 如果路径已经以 http 开头，不处理
        if (path.startsWith('http')) {
          return match.replace(`"${path}`, `"/proxy/${path}`);
        }
        // 如果路径已经以 / 开头，添加前缀
        if (path.startsWith('/')) {
          return match.replace(`"/${path.slice(1)}`, `"/telegraph/${path.slice(1)}`);
        }
        // 相对路径
        return match.replace(`"${path}`, `"/telegraph/${path}`);
      }
    },],
  'www.mhhf.com': [
    // 替换所有 /css/, /js/, /images/ 等资源路径
    {
      pattern: /(?:src|href|content)=['"](?:\.?\/)?([^"']*\.(css|js|png|jpg|jpeg|gif|svg|webp|ico))["']/gi,
      replacement: (match: string, path: string, ext: string) => {
        // 如果路径已经以 http 开头，不处理
        if (path.startsWith('http')) {
          return match.replace(`"${path}`, `"/proxy/${path}`);
        }
        // 如果路径已经以 / 开头，添加前缀
        if (path.startsWith('/')) {
          return match.replace(`"/${path.slice(1)}`, `"/mhhf/${path.slice(1)}`);
        }
        // 相对路径
        return match.replace(`"${path}`, `"/mhhf/${path}`);
      }
    },],
  'vocechat.xf-yun.cn': [
    // 替换所有 /css/, /js/, /images/ 等资源路径
    {
      pattern: /(?:src|href|content)=['"](?:\.?\/)?([^"']*\.(css|js|png|jpg|jpeg|gif|svg|webp|ico))["']/gi,
      replacement: (match: string, path: string, ext: string) => {
        // 如果路径已经以 http 开头，不处理
        if (path.startsWith('http')) {
          return match.replace(`"${path}`, `"/proxy/${path}`);
        }
        // 如果路径已经以 / 开头，添加前缀
        if (path.startsWith('/')) {
          return match.replace(`"/${path.slice(1)}`, `"/vc/${path.slice(1)}`);
        }
        // 相对路径
        return match.replace(`"${path}`, `"/vc/${path}`);
      }
    },],'lolitalibrary.com': [
    // 替换所有 /css/, /js/, /images/ 等资源路径
    {
      pattern: /(?:src|href|content)=['"](?:\.?\/)?([^"']*\.(css|js|png|jpg|jpeg|gif|svg|webp|ico))["']/gi,
      replacement: (match: string, path: string, ext: string) => {
        // 如果路径已经以 http 开头，不处理
        if (path.startsWith('http')) {
          return match.replace(`"${path}`, `"/proxy/${path}`);
        }
        // 如果路径已经以 / 开头，添加前缀
        if (path.startsWith('/')) {
          return match.replace(`"/${path.slice(1)}`, `"/cat-baike/${path.slice(1)}`);
        }
        // 相对路径
        return match.replace(`"${path}`, `"/cat-baike/${path}`);
      }
    },],
  // hexo 博客特殊处理 (Vercel 部署)
  'hexo-gally.vercel.app': [
    // 替换所有 /css/, /js/, /images/ 等资源路径
    {
      pattern: /(?:src|href|content)=['"](?:\.?\/)?([^"']*\.(css|js|png|jpg|jpeg|gif|svg|webp|ico))["']/gi,
      replacement: (match: string, path: string, ext: string) => {
        // 如果路径已经以 http 开头，不处理
        if (path.startsWith('http')) return match;
        // 如果路径已经以 / 开头，添加前缀
        if (path.startsWith('/')) {
          return match.replace(`"/${path.slice(1)}`, `"/telegraph/${path.slice(1)}`);
        }
        // 相对路径
        return match.replace(`"${path}`, `"/telegraph/${path}`);
      }
    },
    // 处理内联 CSS 中的 url()
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
    // 处理 Vercel 特殊部署路径，如 /_next/ 资源
    {
      pattern: /(src|href)=["']((?:\/_next\/)[^"']*)["']/gi,
      replacement: (match: string, attr: string, path: string) => {
        return `${attr}="/hexo${path}"`;
      }
    },
    // 处理 Vercel 动态导入的 chunk
    {
      pattern: /"(\/_next\/static\/chunks\/[^"]+)"/gi,
      replacement: (match: string, path: string) => {
        return `"/hexo${path}"`;
      }
    },
    // 处理可能的 Next.js API 路径
    {
      pattern: /"(\/api\/[^"]+)"/gi,
      replacement: (match: string, path: string) => {
        return `"/hexo${path}"`;
      }
    },
    // 修复 Next.js data-script
    {
      pattern: /data-href=["']((?:\/_next\/)[^"']*)["']/gi,
      replacement: (match: string, path: string) => {
        return `data-href="/hexo${path}"`;
      }
    }
  ],
  // TV 站点特殊处理
  'tv.gally.ddns-ip.net': [
    // 替换所有资源路径
    {
      pattern: /(?:src|href|content)=['"](?:\.?\/)?([^"']*\.(css|js|png|jpg|jpeg|gif|svg|webp|ico))["']/gi,
      replacement: (match: string, path: string, ext: string) => {
        if (path.startsWith('http')) return match;
        if (path.startsWith('/')) {
          return match.replace(`"/${path.slice(1)}`, `"/tv/${path.slice(1)}`);
        }
        return match.replace(`"${path}`, `"/tv/${path}`);
      }
    },
    // 处理内联 CSS 中的 url()
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

  // *** 新增：/localstorage 路径，返回 LocalStorage 工具页面 ***
  if (path === '/localstorage' || path.startsWith('/localstorage/')) {
    context.log("Serving LocalStorage tool page.");
    return new Response(LOCALSTORAGE_TOOL_HTML, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
  }

  // 特殊处理 /indexdb/ 路径，返回 IndexedDB 工具页面
  if (path.startsWith('/indexdb/')) {
    context.log("Serving IndexedDB tool page.");
    return new Response(INDEXEDDB_TOOL_HTML, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
  }

  // 特殊处理 /proxy/ 路径 - 用于代理任意URL
  if (path.startsWith('/proxy/')) {
    try {
      // 从路径中提取目标URL
      let targetUrlString = path.substring('/proxy/'.length);
      
      // 解码URL（如果已编码）
      if (targetUrlString.startsWith('http%3A%2F%2F') || targetUrlString.startsWith('https%3A%2F%2F')) {
        targetUrlString = decodeURIComponent(targetUrlString);
      }
      
      // 确保URL以http://或https://开头
      if (!targetUrlString.startsWith('http://') && !targetUrlString.startsWith('https://')) {
        targetUrlString = 'https://' + targetUrlString;
      }
      
      const targetUrl = new URL(targetUrlString);
      
      // 继承原始请求的查询参数
      if (url.search && !targetUrlString.includes('?')) {
        targetUrl.search = url.search;
      }
      
      context.log(`Proxying generic request to: ${targetUrl.toString()}`);
      
      // 重要：创建一个新的 Request 对象以避免潜在问题
      const proxyRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'manual', // 防止 fetch 自动处理重定向
      });
      
      // 设置 Host 头以匹配目标主机
      proxyRequest.headers.set("Host", targetUrl.host);
      
      // 添加常用代理头
      const clientIp = context.ip || request.headers.get('x-nf-client-connection-ip') || "";
      proxyRequest.headers.set('X-Forwarded-For', clientIp);
      proxyRequest.headers.set('X-Forwarded-Host', url.host);
      proxyRequest.headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));
      
      // 确保 accept-encoding 不会导致压缩响应
      proxyRequest.headers.delete('accept-encoding');
      
      // 检查请求来源是否来自 /telegraph/ 路径
      const referer = request.headers.get('referer') || '';
      const isFromTelegraph = referer.includes('/telegraph/');
      
      // 设置 Host 头
      proxyRequest.headers.set("Host", targetUrl.host);
      
      // 特殊处理：如果来源是 /telegraph/ 则强制修改 referer
      if (isFromTelegraph) {
        proxyRequest.headers.set('referer', 'https://telegra.ph/');
        context.log(`Modified referer for telegraph proxy: ${targetUrl.toString()}`);
      } else {
        // 原有的 referer 处理逻辑
        const originalReferer = request.headers.get('referer');
        if (originalReferer) {
          try {
            const refUrl = new URL(originalReferer);
            const newReferer = `${targetUrl.protocol}//${targetUrl.host}${refUrl.pathname}${refUrl.search}`;
            proxyRequest.headers.set('referer', newReferer);
          } catch(e) {
            proxyRequest.headers.set('referer', `${targetUrl.protocol}//${targetUrl.host}/`);
          }
        } else {
          proxyRequest.headers.set('referer', `${targetUrl.protocol}//${targetUrl.host}/`);
        }
      }
      
      // 发起代理请求
      const response = await fetch(proxyRequest);
      
      // 创建新的响应对象
      let newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
      
      // 添加 CORS 头
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Range');
      
      // 移除可能导致问题的安全头部
      newResponse.headers.delete('Content-Security-Policy');
      newResponse.headers.delete('Content-Security-Policy-Report-Only');
      newResponse.headers.delete('X-Frame-Options');
      newResponse.headers.delete('X-Content-Type-Options');
      
      // 处理重定向
      if (response.status >= 300 && response.status < 400 && response.headers.has('location')) {
        const location = response.headers.get('location')!;
        const redirectedUrl = new URL(location, targetUrl);
        
        // 将重定向URL也通过代理
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

  // 倒序遍历，以便更具体的路径（如 /api/v2）优先于 /api
  const prefixes = Object.keys(PROXY_CONFIG).sort().reverse();

  for (const prefix of prefixes) {
    // 确保匹配的是完整的前缀部分，避免 /apixyz 匹配 /api
    if (path === prefix || path.startsWith(prefix + '/')) {
      targetBaseUrl = PROXY_CONFIG[prefix as keyof typeof PROXY_CONFIG];
      matchedPrefix = prefix;
      break; // 找到第一个（最具体的）匹配就停止
    }
  }

  // 如果找到了匹配的规则
  if (targetBaseUrl && matchedPrefix) {
    // 构造目标 URL
    const remainingPath = path.substring(matchedPrefix.length);
    const targetUrlString = targetBaseUrl.replace(/\/$/, '') + remainingPath;
    const targetUrl = new URL(targetUrlString);

    // 继承原始请求的查询参数
    targetUrl.search = url.search;

    context.log(`Proxying "${path}" to "${targetUrl.toString()}"`);

    try {
      // 重要：创建一个新的 Request 对象以避免潜在问题
      const proxyRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'manual', // 防止 fetch 自动处理重定向
      });

      // 设置 Host 头以匹配目标主机
      proxyRequest.headers.set("Host", targetUrl.host);
      
      // 添加常用代理头
      const clientIp = context.ip || request.headers.get('x-nf-client-connection-ip') || "";
      proxyRequest.headers.set('X-Forwarded-For', clientIp);
      proxyRequest.headers.set('X-Forwarded-Host', url.host);
      proxyRequest.headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));
      
      // 确保 accept-encoding 不会导致压缩响应，这样我们才能修改内容
      proxyRequest.headers.delete('accept-encoding');
      
      // 保留原始 referer (如果存在)，但修正域名 - 这对于防止某些网站的防盗链很重要
      const referer = request.headers.get('referer');
      if (referer) {
        try {
          const refUrl = new URL(referer);
          const newReferer = `${targetUrl.protocol}//${targetUrl.host}${refUrl.pathname}${refUrl.search}`;
          proxyRequest.headers.set('referer', newReferer);
        } catch(e) {
          // 如果解析 referer 出错，保持原样
        }
      } else {
        // 如果没有 referer，添加一个目标域名的 referer
        proxyRequest.headers.set('referer', `${targetUrl.protocol}//${targetUrl.host}/`);
      }
      
      // 发起代理请求
      const response = await fetch(proxyRequest);
      
      // 获取内容类型
      const contentType = response.headers.get('content-type') || '';
      
      // 创建新的响应对象，以便我们可以修改头部
      let newResponse: Response;
      
      // 处理需要内容替换的资源类型
      const needsRewrite = HTML_CONTENT_TYPES.some(type => contentType.includes(type)) || 
                           CSS_CONTENT_TYPES.some(type => contentType.includes(type)) ||
                           JS_CONTENT_TYPES.some(type => contentType.includes(type));
                           
      if (needsRewrite) {
        // 克隆响应以获取其内容
        const clonedResponse = response.clone();
        let content = await clonedResponse.text();
        
        // 目标网站的域名和协议
        const targetDomain = targetUrl.host;
        const targetOrigin = targetUrl.origin;
        const targetPathBase = targetUrl.pathname.substring(0, targetUrl.pathname.lastIndexOf('/') + 1);
        
        // 替换 HTML/CSS 中的绝对 URL
        if (HTML_CONTENT_TYPES.some(type => contentType.includes(type))) {
          // 替换 HTML 中的链接、脚本和图片引用
          
          // 1. 替换以协议开头的绝对路径 (http:// 或 https://)
          content = content.replace(
            new RegExp(`(href|src|action|content)=["']https?://${targetDomain}(/[^"']*?)["']`, 'gi'),
            `$1="${url.origin}${matchedPrefix}$2"`
          );
          
          // 2. 替换以 // 开头的协议相对路径
          content = content.replace(
            new RegExp(`(href|src|action|content)=["']//${targetDomain}(/[^"']*?)["']`, 'gi'),
            `$1="${url.origin}${matchedPrefix}$2"`
          );
          
          // 3. 替换以根目录 / 开头的路径
          content = content.replace(
            new RegExp(`(href|src|action|content)=["'](/[^"']*?)["']`, 'gi'),
            `$1="${url.origin}${matchedPrefix}$2"`
          );
          
          // 4. 替换 CSS 中的 url() 引用
          content = content.replace(
            new RegExp(`url\\(['"]?https?://${targetDomain}(/[^)'"]*?)['"]?\\)`, 'gi'),
            `url(${url.origin}${matchedPrefix}$1)`
          );
          
          // 5. 替换 CSS 中 url(//...) 的引用
          content = content.replace(
            new RegExp(`url\\(['"]?//${targetDomain}(/[^)'"]*?)['"]?\\)`, 'gi'),
            `url(${url.origin}${matchedPrefix}$1)`
          );
          
          // 6. 替换 CSS 中 url(/...) 根目录引用
          content = content.replace(
            new RegExp(`url\\(['"]?(/[^)'"]*?)['"]?\\)`, 'gi'),
            `url(${url.origin}${matchedPrefix}$1)`
          );
          
          // 7. 处理 <base> 标签
          content = content.replace(
            new RegExp(`<base[^>]*href=["']https?://${targetDomain}(?:/[^"']*?)?["'][^>]*>`, 'gi'),
            `<base href="${url.origin}${matchedPrefix}/">`
          );
          
          // 8. 处理相对路径的修正 (不以 / 或 http:// 开头的)
          // 这里使用更精确的正则表达式，处理常见标签属性中的相对路径
          content = content.replace(
            /(href|src|action|data-src|data-href)=["']((?!https?:\/\/|\/\/|\/)[^"']+)["']/gi,
            `$1="${url.origin}${matchedPrefix}/${targetPathBase}$2"`
          );
          
          // 9. 处理可能的 JSON 资源路径
          content = content.replace(
            new RegExp(`"(url|path|endpoint|src|href)"\\s*:\\s*"https?://${targetDomain}(/[^"]*?)"`, 'gi'),
            `"$1":"${url.origin}${matchedPrefix}$2"`
          );
          
          // 9.1 处理 JSON 路径中的根路径引用
          content = content.replace(
            /"(url|path|endpoint|src|href)"\s*:\s*"(\/[^"]*?)"/gi,
            `"$1":"${url.origin}${matchedPrefix}$2"`
          );
          
          // 10. 处理可能的内联 JavaScript 中的路径
          content = content.replace(
            new RegExp(`['"]https?://${targetDomain}(/[^"']*?)['"]`, 'gi'),
            `"${url.origin}${matchedPrefix}$1"`
          );
          
          // 11. 处理 JavaScript 中的根路径引用
          content = content.replace(
            /([^a-zA-Z0-9_])(['"])(\/[^\/'"]+\/[^'"]*?)(['"])/g,
            `$1$2${url.origin}${matchedPrefix}$3$4`
          );
          
          // 12. 处理 srcset 属性
          content = content.replace(
            /srcset=["']([^"']+)["']/gi,
            (match, srcset) => {
              // 处理 srcset 中的每个 URL
              const newSrcset = srcset.split(',').map((src: string) => {
                const [srcUrl, descriptor] = src.trim().split(/\s+/);
                let newUrl = srcUrl;
                
                if (srcUrl.startsWith('http://') || srcUrl.startsWith('https://')) {
                  if (srcUrl.includes(targetDomain)) {
                    newUrl = srcUrl.replace(
                      new RegExp(`https?://${targetDomain}(/[^\\s]*)`, 'i'),
                      `${url.origin}${matchedPrefix}$1`
                    );
                  }
                } else if (srcUrl.startsWith('//')) {
                  if (srcUrl.includes(targetDomain)) {
                    newUrl = srcUrl.replace(
                      new RegExp(`//${targetDomain}(/[^\\s]*)`, 'i'),
                      `${url.origin}${matchedPrefix}$1`
                    );
                  }
                } else if (srcUrl.startsWith('/')) {
                  newUrl = `${url.origin}${matchedPrefix}${srcUrl}`;
                }
                
                return descriptor ? `${newUrl} ${descriptor}` : newUrl;
              }).join(', ');
              
              return `srcset="${newSrcset}"`;
            }
          );
          
          // 应用特定网站的替换规则
          if (SPECIAL_REPLACEMENTS[targetDomain as keyof typeof SPECIAL_REPLACEMENTS]) {
            const replacements = SPECIAL_REPLACEMENTS[targetDomain as keyof typeof SPECIAL_REPLACEMENTS];
            for (const replacement of replacements) {
              content = content.replace(replacement.pattern, replacement.replacement as any);
            }
          }
          
          // 在页面底部添加修复脚本，用于动态加载的内容
          const fixScript = `
          <script>
          // 修复动态加载的资源路径
          (function() {
            // 特殊处理 Vercel 的 Next.js 动态加载
            if (window.location.pathname.startsWith('/hexo')) {
              // 拦截 fetch 请求
              const originalFetch = window.fetch;
              window.fetch = function(resource, init) {
                if (typeof resource === 'string') {
                  // 对于 next-data 请求特殊处理
                  if (resource.includes('/_next/data/') && !resource.startsWith('/hexo')) {
                    resource = '/hexo' + resource;
                  }
                }
                return originalFetch.call(this, resource, init);
              };

              // 处理 Next.js 的路由变化
              const observer = new MutationObserver(function(mutations) {
                // 查找并修复 next/script 加载的脚本
                document.querySelectorAll('script[src^="/_next/"]').forEach(function(el) {
                  const src = el.getAttribute('src');
                  if (src && !src.startsWith('/hexo')) {
                    el.setAttribute('src', '/hexo' + src);
                  }
                });
                
                // 修复 next/link 预加载
                document.querySelectorAll('link[rel="preload"][href^="/_next/"]').forEach(function(el) {
                  const href = el.getAttribute('href');
                  if (href && !href.startsWith('/hexo')) {
                    el.setAttribute('href', '/hexo' + href);
                  }
                });
              });

              // 确保页面加载完成后再添加观察器
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                  observer.observe(document.documentElement, {
                    childList: true,
                    subtree: true
                  });
                });
              } else {
                observer.observe(document.documentElement, {
                  childList: true,
                  subtree: true
                });
              }
            }

            // 通用修复处理
            const observer = new MutationObserver(function(mutations) {
              mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                  mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // 元素节点
                       const fixElement = (el) => {
                         ['src', 'href', 'data-src', 'data-href'].forEach(function(attr) {
                           if (el.hasAttribute(attr)) {
                             let val = el.getAttribute(attr);
                             if (val && !val.startsWith("https://") && !val.startsWith("http://") && !val.startsWith("blob:") && !val.startsWith("data:")) {
                               if (val.startsWith('/')) {
                                 el.setAttribute(attr, '${matchedPrefix}' + val);
                               }
                             }
                           }
                         });
                         // 修复内联样式中的 url()
                         if (el.hasAttribute('style') && el.getAttribute('style').includes('url(')) {
                           let style = el.getAttribute('style');
                           style = style.replace(/url\\(['"]?(\\/[^)'"]*?)['"]?\\)/gi, 'url(${matchedPrefix}$1)');
                           el.setAttribute('style', style);
                         }
                       };
                       
                       if (node.matches('script[src], link[href], img[src], a[href], [data-src], [data-href], [style*="url("]')) {
                           fixElement(node);
                       }
                       
                       node.querySelectorAll('script[src], link[href], img[src], a[href], [data-src], [data-href], [style*="url("]').forEach(fixElement);
                    }
                  });
                }
              });
            });
            
            if(document.body) {
                observer.observe(document.body, {
                  childList: true,
                  subtree: true
                });
            } else {
                window.addEventListener('DOMContentLoaded', () => {
                   observer.observe(document.body, {childList: true, subtree: true});
                });
            }
          })();
          <\/script>
          `;
          
          // 在 </body> 前插入修复脚本
          const bodyCloseTagPos = content.lastIndexOf('</body>');
          if (bodyCloseTagPos !== -1) {
            content = content.substring(0, bodyCloseTagPos) + fixScript + content.substring(bodyCloseTagPos);
          } else {
            // 如果没有 </body> 标签，直接添加到末尾
            content += fixScript;
          }
        }
        
        // 对于 CSS 文件，修复 URL 引用
        if (CSS_CONTENT_TYPES.some(type => contentType.includes(type))) {
          // 1. 替换绝对路径 url(http://...)
          content = content.replace(
            new RegExp(`url\\(['"]?https?://${targetDomain}(/[^)'"]*?)['"]?\\)`, 'gi'),
            `url(${url.origin}${matchedPrefix}$1)`
          );
          
          // 2. 替换协议相对路径 url(//...)
          content = content.replace(
            new RegExp(`url\\(['"]?//${targetDomain}(/[^)'"]*?)['"]?\\)`, 'gi'),
            `url(${url.origin}${matchedPrefix}$1)`
          );
          
          // 3. 替换根目录相对路径 url(/...)
          content = content.replace(
            new RegExp(`url\\(['"]?(/[^)'"]*?)['"]?\\)`, 'gi'),
            `url(${url.origin}${matchedPrefix}$1)`
          );
          
          // 4. 处理相对路径 (不以 / 开头)
          const cssPath = targetUrl.pathname;
          const cssDir = cssPath.substring(0, cssPath.lastIndexOf('/') + 1);
          
          content = content.replace(
            /url\(['"]?(?!https?:\/\/|\/\/|\/|data:|#)([^)'"]*)['"]?\)/gi,
            `url(${url.origin}${matchedPrefix}${cssDir}$1)`
          );
        }
        
        // 对于 JavaScript 文件，处理可能的 URL 引用
        if (JS_CONTENT_TYPES.some(type => contentType.includes(type))) {
          // 1. 替换绝对 URL
          content = content.replace(
            new RegExp(`(['"])https?://${targetDomain}(/[^'"]*?)(['"])`, 'gi'),
            `$1${url.origin}${matchedPrefix}$2$3`
          );
          
          // 2. 替换协议相对 URL
          content = content.replace(
            new RegExp(`(['"])//${targetDomain}(/[^'"]*?)(['"])`, 'gi'),
            `$1${url.origin}${matchedPrefix}$2$3`
          );
          
          // 3. 替换根路径 URL
          content = content.replace(
            /(['"])(\/[^'"]*?\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|json|mp3|mp4|webm|ogg|woff|woff2|ttf|eot))(['"])/gi,
            `$1${url.origin}${matchedPrefix}$2$3`
          );
        }
        
        // 创建新的响应对象，包含修改后的内容
        newResponse = new Response(content, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      } else {
        // 对于非 HTML/CSS/JS 内容，直接使用原始响应体
        newResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      }
      
      // 添加 CORS 头
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Range');
      
      // 移除可能导致问题的安全头部
      newResponse.headers.delete('Content-Security-Policy');
      newResponse.headers.delete('Content-Security-Policy-Report-Only');
      newResponse.headers.delete('X-Frame-Options');
      newResponse.headers.delete('X-Content-Type-Options');
      
      // 确保不缓存可能包含动态内容的响应
      if (HTML_CONTENT_TYPES.some(type => contentType.includes(type))) {
        newResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        newResponse.headers.set('Pragma', 'no-cache');
        newResponse.headers.set('Expires', '0');
      } else {
        // 对于静态资源，设置较长的缓存时间
        newResponse.headers.set('Cache-Control', 'public, max-age=86400'); // 1天
      }
      
      // 如果目标服务器返回重定向，需要构造正确的重定向URL
      if (response.status >= 300 && response.status < 400 && response.headers.has('location')) {
          const location = response.headers.get('location')!;
          const redirectedUrl = new URL(location, targetUrl); // 解析相对或绝对 Location

          // 如果重定向回代理源本身，则需要重写为原始主机名下的路径
          if (redirectedUrl.origin === targetUrl.origin) {
              const newLocation = url.origin + matchedPrefix + redirectedUrl.pathname + redirectedUrl.search;
              context.log(`Rewriting redirect from ${location} to ${newLocation}`);
              newResponse.headers.set('Location', newLocation);
          } else {
              // 如果重定向到外部域，则直接使用
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

  // 如果没有匹配的代理规则，则不处理此请求，交由 Netlify 的其他规则处理
  return;
};
