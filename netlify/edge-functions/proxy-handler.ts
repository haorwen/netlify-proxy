// netlify/edge-functions/proxy-handler.ts
import type { Context } from "@netlify/edge-functions";
import { INDEXEDDB_TOOL_HTML } from "./html/indexeddb-tool.ts";
import { LOCALSTORAGE_TOOL_HTML } from "./html/localstorage-tool.ts";

// 定义你的代理规则：路径前缀 => 目标基础 URL
const PROXY_CONFIG = {
  // API 服务器
  "/discord": "https://discord.com/api",
  "/telegraph": "https://telegra.ph",
  "/vc": "https://vocechat.xf-yun.cn",
  "/ao3": "https://ao3-mirror.cc",
  "/ao3o": "https://archiveofourown.org",
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

const MHHF_SW_PATH = '/mhhf-sw.js';
const MHHF_SW_SCOPE = '/mhhf';
const MHHF_SW_SOURCE = `
const CACHE_NAME = 'mhhf-proxy-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => cache.match(event.request));
    })
  );
});
`;// 特定网站的替换规则 (针对某些站点的特殊处理)

const AO3DOWN_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AO3 EPUB 下载器</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #0f172a;
      --card: #1e293b;
      --text: #e2e8f0;
      --muted: #94a3b8;
      --primary: #22d3ee;
      --primary-hover: #06b6d4;
      --danger: #f87171;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f8fafc;
        --card: #ffffff;
        --text: #0f172a;
        --muted: #64748b;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: radial-gradient(circle at 20% 20%, #0ea5e980, transparent 35%), var(--bg);
      color: var(--text);
    }
    .card {
      width: min(760px, 100%);
      background: color-mix(in srgb, var(--card), transparent 8%);
      border: 1px solid color-mix(in srgb, var(--muted), transparent 75%);
      border-radius: 18px;
      padding: 28px;
      box-shadow: 0 20px 60px #00000030;
      backdrop-filter: blur(8px);
    }
    h1 { margin: 0 0 8px; font-size: 1.6rem; }
    p { margin: 0 0 14px; color: var(--muted); }
    code {
      background: color-mix(in srgb, var(--muted), transparent 85%);
      border-radius: 8px;
      padding: 2px 6px;
    }
    .form-wrap {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      margin-top: 18px;
    }
    input {
      width: 100%;
      border: 1px solid color-mix(in srgb, var(--muted), transparent 70%);
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 15px;
      color: var(--text);
      background: color-mix(in srgb, var(--bg), transparent 15%);
    }
    button {
      border: none;
      border-radius: 10px;
      background: var(--primary);
      color: #06202a;
      font-weight: 700;
      padding: 0 18px;
      cursor: pointer;
      transition: 0.2s ease;
    }
    button:hover { background: var(--primary-hover); }
    .hint { margin-top: 16px; font-size: 13px; }
    .warn { color: var(--danger); }
  </style>
</head>
<body>
  <main class="card">
    <h1>AO3 EPUB 下载器</h1>
    <p>输入 AO3 作品链接（例如 <code>https://archiveofourown.org/works/12345678</code>），点击下载即可直接返回 <code>.epub</code> 文件。</p>
    <form class="form-wrap" action="/ao3down" method="GET">
      <input name="url" type="url" required placeholder="粘贴 AO3 作品地址（/works/数字）" />
      <button type="submit">下载 EPUB</button>
    </form>
    <p class="hint">也可直接使用：<code>/ao3down?url={AO3作品链接}</code> 跳过前端。</p>
    <p class="hint warn">提示：仅支持公开作品。</p>
  </main>
</body>
</html>`;

function extractAo3WorkId(inputUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(inputUrl);
  } catch {
    return null;
  }

  const validHosts = new Set([
    'archiveofourown.org',
    'www.archiveofourown.org',
    'ao3-mirror.cc',
    'nightalk.cc'
  ]);

  if (!validHosts.has(parsed.hostname)) {
    return null;
  }

  const match = parsed.pathname.match(/\/works\/(\d+)/);
  return match?.[1] ?? null;
}

function pickFilenameFromContentDisposition(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) {
    return fallback;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] ?? fallback;
}

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
  'archiveofourown.org': [
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
          return match.replace(`"/${path.slice(1)}`, `"/ao3o/${path.slice(1)}`);
        }
        // 相对路径
        return match.replace(`"${path}`, `"/ao3o/${path}`);
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

  if (path === MHHF_SW_PATH) {
    context.log('Serving MHHF service worker.');
    return new Response(MHHF_SW_SOURCE, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }

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

  if (path === '/ao3down') {
    const rawInputUrl = url.searchParams.get('url')?.trim() ?? '';

    if (!rawInputUrl) {
      context.log('Serving AO3 download page.');
      return new Response(AO3DOWN_HTML, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    const workId = extractAo3WorkId(rawInputUrl);
    if (!workId) {
      return new Response('无效的 AO3 作品链接，请提供 /works/{id} 格式。', {
        status: 400,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const downloadUrl = `https://archiveofourown.org/downloads/${workId}/work.epub`;
    context.log(`Downloading AO3 epub: ${downloadUrl}`);

    const forwardHeaders = new Headers();
    forwardHeaders.set('User-Agent', request.headers.get('user-agent') ?? 'Mozilla/5.0 (Netlify Edge AO3 Downloader)');
    forwardHeaders.set('Accept', 'application/epub+zip,*/*;q=0.8');
    forwardHeaders.set('Referer', `https://archiveofourown.org/works/${workId}`);

    const upstreamResponse = await fetch(downloadUrl, {
      method: 'GET',
      headers: forwardHeaders,
      redirect: 'follow'
    });

    if (!upstreamResponse.ok) {
      const errBody = await upstreamResponse.text();
      context.log(`AO3 download failed: ${upstreamResponse.status} ${errBody.slice(0, 300)}`);
      return new Response('下载失败：上游返回错误，请确认作品可公开访问。', {
        status: 502,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const fallbackName = `ao3-work-${workId}.epub`;
    const upstreamDisposition = upstreamResponse.headers.get('content-disposition');
    const filename = pickFilenameFromContentDisposition(upstreamDisposition, fallbackName);

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.set('Content-Type', 'application/epub+zip');
    responseHeaders.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    return new Response(upstreamResponse.body, {
      status: 200,
      headers: responseHeaders
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
      let contentType = response.headers.get('content-type') || '';
      
      // 强制将 .html 文件识别为 HTML 类型
      if (path.endsWith('.html') || path.endsWith('.htm')) {
        contentType = 'text/html; charset=utf-8';
      }
      
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
          const injectIntoBody = (snippet: string) => {
            const bodyCloseTagPos = content.lastIndexOf('</body>');
            if (bodyCloseTagPos !== -1) {
              content = content.substring(0, bodyCloseTagPos) + snippet + content.substring(bodyCloseTagPos);
            } else {
              content += snippet;
            }
          };

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
          injectIntoBody(fixScript);

          if (matchedPrefix === MHHF_SW_SCOPE) {
            const swRegistrationScript = `
            <script>
            (function() {
              if (!('serviceWorker' in navigator)) {
                return;
              }

              const register = () => {
                navigator.serviceWorker.register('${MHHF_SW_PATH}', { scope: '${MHHF_SW_SCOPE}/' })
                  .then((registration) => {
                    console.log('[MHHF] Service worker registered:', registration.scope);
                  })
                  .catch((error) => {
                    console.error('[MHHF] Service worker registration failed:', error);
                  });
              };

              if (document.readyState === 'complete') {
                register();
              } else {
                window.addEventListener('load', register, { once: true });
              }
            })();
            <\/script>
            `;
            injectIntoBody(swRegistrationScript);
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
