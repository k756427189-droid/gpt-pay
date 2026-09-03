const express = require('express');
const app = express();

app.use(express.json({ limit: '5mb' }));

const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ChatGPT Plus 订阅链接生成器</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 sm:p-8">
    <div class="mb-6 text-center">
      <h1 class="text-xl font-bold text-emerald-400">ChatGPT Plus 账单链接生成器</h1>
      <p class="text-xs text-slate-400 mt-1">自动识别 session 数据并换取 Stripe 官方付款链接</p>
    </div>
    <div class="space-y-4">
      <div>
        <label class="block text-xs font-medium text-slate-300 mb-2">粘贴 Session 完整代码或 accessToken</label>
        <textarea id="input" rows="6" placeholder="直接粘贴客户发来的整段 JSON 或 eyJ... 字符串" 
          class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 transition"></textarea>
      </div>
      <button id="btn" onclick="submitData()" 
        class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg text-sm transition shadow-lg">
        立即生成 Stripe 支付链接
      </button>
      <div id="output" class="hidden mt-5 p-4 bg-slate-900/90 rounded-xl border border-emerald-500/40">
        <span class="text-xs font-bold text-emerald-400 block mb-1">🎉 官方结账链接生成成功：</span>
        <div id="urlText" class="text-xs font-mono text-slate-300 break-all p-2.5 bg-slate-950 rounded border border-slate-800 mb-3 select-all"></div>
        <div class="flex gap-2">
          <button onclick="window.open(targetUrl, '_blank')" class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 rounded font-medium transition">
            直接打开付款
          </button>
          <button id="copyBtn" onclick="copyUrl()" class="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs py-2 rounded font-medium transition">
            复制链接
          </button>
        </div>
      </div>
      <div id="error" class="hidden p-3 bg-red-950/60 border border-red-800 text-red-400 text-xs rounded-lg"></div>
    </div>
  </div>
  <script>
    let targetUrl = '';
    async function submitData() {
      const raw = document.getElementById('input').value.trim();
      const btn = document.getElementById('btn');
      const output = document.getElementById('output');
      const error = document.getElementById('error');
      output.classList.add('hidden');
      error.classList.add('hidden');
      if (!raw) {
        error.innerText = '请先粘贴 Session 数据或 Token！';
        error.classList.remove('hidden');
        return;
      }
      btn.disabled = true;
      btn.innerText = '正在调取官方接口生成链接...';
      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw })
        });
        const data = await res.json();
        if (data.url) {
          targetUrl = data.url;
          document.getElementById('urlText').innerText = targetUrl;
          output.classList.remove('hidden');
        } else {
          error.innerText = data.error || '获取失败，可能是 Token 已过期';
          error.classList.remove('hidden');
        }
      } catch (e) {
        error.innerText = '请求出错：' + e.message;
        error.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.innerText = '立即生成 Stripe 支付链接';
      }
    }
    function copyUrl() {
      if (!targetUrl) return;
      navigator.clipboard.writeText(targetUrl).then(() => {
        const b = document.getElementById('copyBtn');
        b.innerText = '已复制!';
        setTimeout(() => b.innerText = '复制链接', 2000);
      });
    }
  </script>
</body>
</html>`;

app.get('/', (req, res) => res.send(HTML_PAGE));

app.post('/api/checkout', async (req, res) => {
  try {
    const { raw } = req.body;
    if (!raw) return res.status(400).json({ error: '输入不能为空' });

    let token = raw.trim();
    if (token.includes('accessToken')) {
      const match = token.match(/"accessToken"\s*:\s*"([^"]+)"/);
      if (match && match[1]) {
        token = match[1];
      }
    }

    const response = await fetch('https://chatgpt.com/backend-api/payments/checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      }
    });

    const data = await response.json();
    if (data.url) {
      return res.json({ url: data.url });
    }
    return res.status(400).json({ error: data.detail || JSON.stringify(data) });
  } catch (err) {
    return res.status(500).json({ error: '请求接口失败：' + err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
