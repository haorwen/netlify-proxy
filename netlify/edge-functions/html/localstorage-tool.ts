// LocalStorage 数据管理工具页面
export const LOCALSTORAGE_TOOL_HTML = `
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
    .cloud-section { margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; }
    .cloud-section h4 { margin: 0 0 15px 0; color: #495057; }
    .input-group { margin-bottom: 10px; }
    .input-group label { display: block; margin-bottom: 5px; font-size: 14px; color: #495057; }
    .input-group input { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-family: inherit; }
    #archive-list { max-height: 200px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 4px; padding: 10px; background-color: #f8f9fa; margin-top: 10px; display: none; }
    #archive-list ul { list-style: none; padding: 0; margin: 0; }
    #archive-list li { padding: 8px; margin-bottom: 5px; background-color: white; border: 1px solid #dee2e6; border-radius: 4px; cursor: pointer; font-size: 14px; }
    #archive-list li:hover { background-color: #e9ecef; }
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
      
      <div class="cloud-section">
        <h4>☁️ 云存档管理</h4>
        <p style="font-size: 14px; color: #6c757d; margin-bottom: 15px;">将当前数据保存到云端或从云端加载历史存档。</p>
        <div class="input-group">
          <label for="archive-name-input">存档名称：</label>
          <input type="text" id="archive-name-input" placeholder="输入存档名称（如：mysave）" />
        </div>
        <div class="actions">
          <button id="save-to-cloud-btn">保存到云端</button>
          <button id="list-archives-btn">查看存档列表</button>
        </div>
        <div id="archive-list">
          <p style="margin: 0 0 10px 0; font-weight: bold; font-size: 14px;">可用存档（点击加载）：</p>
          <ul id="archive-list-ul"></ul>
        </div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      // === Constants ===
      const API_BASE_URL = 'https://nlapi.xf-yun.cn';
      
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
      const archiveNameInput = document.getElementById('archive-name-input');
      const saveToCloudBtn = document.getElementById('save-to-cloud-btn');
      const listArchivesBtn = document.getElementById('list-archives-btn');
      const archiveListDiv = document.getElementById('archive-list');
      const archiveListUl = document.getElementById('archive-list-ul');
      
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

      // === Cloud Archive Functions ===
      async function saveToCloud() {
        const archiveName = archiveNameInput.value.trim();
        if (!archiveName) {
          setStatus('请输入存档名称。', true);
          return;
        }
        if (!dataArea.value.trim()) {
          setStatus('没有数据可保存，请先导出数据。', true);
          return;
        }
        setStatus('正在保存到云端...');
        try {
          const response = await fetch(\`\${API_BASE_URL}/mhhf/save\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              archiveName: archiveName,
              archiveContent: dataArea.value
            })
          });
          const result = await response.json();
          if (response.ok && result.success) {
            setStatus(\`保存成功！存档名：\${result.archiveName}\`);
          } else {
            throw new Error(result.error || '保存失败');
          }
        } catch (error) {
          setStatus('保存到云端失败: ' + error.message, true);
          console.error('Save to cloud error:', error);
        }
      }

      async function listArchives() {
        const archiveName = archiveNameInput.value.trim();
        if (!archiveName) {
          setStatus('请输入存档名称以查看列表。', true);
          return;
        }
        setStatus('正在获取存档列表...');
        try {
          const response = await fetch(\`\${API_BASE_URL}/mhhf/list\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archiveName: archiveName })
          });
          const result = await response.json();
          if (response.ok && result.success) {
            archiveListUl.innerHTML = '';
            if (result.archives.length === 0) {
              archiveListUl.innerHTML = '<li style="cursor: default; background-color: #f8f9fa;">暂无存档</li>';
            } else {
              result.archives.forEach(name => {
                const li = document.createElement('li');
                li.textContent = name;
                li.onclick = () => loadArchive(name);
                archiveListUl.appendChild(li);
              });
            }
            archiveListDiv.style.display = 'block';
            setStatus(\`找到 \${result.count} 个存档。\`);
          } else {
            throw new Error(result.error || '获取列表失败');
          }
        } catch (error) {
          setStatus('获取存档列表失败: ' + error.message, true);
          console.error('List archives error:', error);
        }
      }

      async function loadArchive(fullArchiveName) {
        setStatus(\`正在加载存档：\${fullArchiveName}...\`);
        try {
          const response = await fetch(\`\${API_BASE_URL}/mhhf/get\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archiveName: fullArchiveName })
          });
          const result = await response.json();
          if (response.ok && result.success) {
            dataArea.value = result.content;
            copyBtn.disabled = false;
            setStatus(\`存档加载成功：\${fullArchiveName}\`);
          } else {
            throw new Error(result.error || '加载失败');
          }
        } catch (error) {
          setStatus('加载存档失败: ' + error.message, true);
          console.error('Load archive error:', error);
        }
      }

      saveToCloudBtn.addEventListener('click', saveToCloud);
      listArchivesBtn.addEventListener('click', listArchives);

      // 页面加载时自动导出一次
      exportData();
    })();
  <\/script>
</body>
</html>
`;

