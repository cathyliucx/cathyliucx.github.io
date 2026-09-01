const SECTION = {
  ai: { marker: 'AI_PROJECTS', label: 'AI RESEARCH', name: 'AI 研究', bodyClass: 'ai-article', target: 'index.html', back: 'index.html#ai' },
  quant: { marker: 'QUANT_PROJECTS', label: 'QUANT RESEARCH', name: '量化研究', bodyClass: 'quant-article', target: 'index.html', back: 'index.html#quant' },
  life: { marker: 'LIFE_POSTS', label: 'LIFE NOTES', name: '个人生活', bodyClass: 'life-article', target: 'life.html', back: 'life.html' },
};

export function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

export function normalizeSlug(value) {
  const slug = String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!slug) throw new Error('页面地址需要使用英文字母或数字');
  return slug;
}

export function markdownToHtml(markdown = '') {
  const output = [];
  let list = [];
  const flushList = () => {
    if (!list.length) return;
    output.push(`<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`);
    list = [];
  };
  for (const sourceLine of String(markdown).split('\n')) {
    const line = sourceLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    const heading = line.match(/^(##|###)\s+(.+)$/);
    if (heading) {
      flushList();
      const level = heading[1] === '##' ? 2 : 3;
      output.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
      continue;
    }
    const item = line.match(/^-\s+(.+)$/);
    if (item) {
      list.push(item[1]);
      continue;
    }
    flushList();
    output.push(`<p>${escapeHtml(line)}</p>`);
  }
  flushList();
  return output.join('\n');
}

export function createListItem({ section, number, title, slug, summary, keywords, contentType = '' }) {
  const safeSlug = normalizeSlug(slug);
  if (section === 'life') {
    return `        <a class="life-post-link" href="articles/${safeSlug}.html"><span>${escapeHtml(contentType || '生活记录')}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(summary)}</p></a>`;
  }
  const projectNumber = String(number).padStart(2, '0');
  return `          <li><span>${projectNumber}</span><div><h3><a class="project-link" href="articles/${safeSlug}.html">${escapeHtml(title)}</a></h3><p>${escapeHtml(keywords)}</p></div></li>`;
}

export function nextItemNumber(html, section) {
  const config = SECTION[section];
  if (!config || section === 'life') return 1;
  const start = `<!-- ${config.marker}_START -->`;
  const end = `<!-- ${config.marker}_END -->`;
  const from = html.indexOf(start);
  const to = html.indexOf(end);
  if (from < 0 || to < 0 || to <= from) throw new Error('栏目页缺少发布标记');
  return (html.slice(from, to).match(/class="project-link"/g) || []).length + 1;
}

export function insertContent(html, section, itemHtml) {
  const config = SECTION[section];
  if (!config) throw new Error('不支持的栏目');
  const end = `<!-- ${config.marker}_END -->`;
  if (!html.includes(end)) throw new Error('栏目页缺少发布标记');
  return html.replace(end, `${itemHtml}\n        ${end}`);
}

export function targetFileFor(section) {
  const config = SECTION[section];
  if (!config) throw new Error('不支持的栏目');
  return config.target;
}

export function createArticlePage(data) {
  const config = SECTION[data.section];
  if (!config) throw new Error('不支持的栏目');
  const title = escapeHtml(data.title);
  const slug = normalizeSlug(data.slug);
  const summary = escapeHtml(data.summary);
  const updated = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} · Cathy Liu</title>
  <meta name="description" content="${summary}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@500;600;700;800&family=Noto+Sans+SC:wght@400;500;700;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../styles.css">
  <link rel="stylesheet" href="article.css">
</head>
<body class="${config.bodyClass}">
  <header class="site-header">
    <a class="wordmark" href="../index.html">CATHY LIU</a>
    <nav class="nav-links"><a href="../index.html#ai">AI</a><a href="../index.html#quant">QUANT</a><a href="../life.html">LIFE</a><a href="../index.html#contact">ABOUT</a></nav>
    <span class="availability"><i></i> ${config.label}</span>
  </header>
  <main class="article-page">
    <div class="article-topline"><span>${escapeHtml(data.contentType)}</span><a href="../${config.back}">← 返回${config.name}</a></div>
    <header class="article-hero">
      <h1>${title}</h1>
      <p>${summary}</p>
      <div class="article-meta"><span>${escapeHtml(data.keywords)}</span><time>${updated}</time></div>
    </header>
    <article class="article-body">
      ${markdownToHtml(data.body)}
    </article>
    <div class="article-edit"><span>这篇内容可以继续更新。</span><a href="https://github.com/cathyliucx/cathyliucx.github.io/edit/main/articles/${slug}.html" target="_blank" rel="noreferrer">在 GitHub 编辑 ↗</a></div>
  </main>
</body>
</html>`;
}
