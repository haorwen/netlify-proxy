// IndexedDB 数据管理工具页面
export const INDEXEDDB_TOOL_HTML = `
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

