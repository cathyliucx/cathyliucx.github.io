import { createArticlePage, createListItem, insertContent, markdownToHtml, nextItemNumber, normalizeSlug, targetFileFor } from './core.mjs';

const OWNER = 'cathyliucx';
const REPO = 'cathyliucx.github.io';
const BRANCH = 'main';
const API = 'https://api.github.com';
const form = document.querySelector('#contentForm');
const tokenInput = document.querySelector('#githubToken');
const connectButton = document.querySelector('#connectButton');
const publishButton = document.querySelector('#publishButton');
const resetButton = document.querySelector('#resetButton');
const imageButton = document.querySelector('#imageButton');
const imagePicker = document.querySelector('#imagePicker');
const imageStatus = document.querySelector('#imageStatus');
const codeBlockButton = document.querySelector('#codeBlockButton');
const inlineCodeButton = document.querySelector('#inlineCodeButton');
const connectionState = document.querySelector('#connectionState');
const publishStatus = document.querySelector('#publishStatus');
let connected = false;
let slugWasEdited = false;
let pendingImages = [];

tokenInput.value = sessionStorage.getItem('cathy_github_token') || '';
const token = () => tokenInput.value.trim();
const values = () => Object.fromEntries(new FormData(form).entries());

async function github(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token()}`, 'X-GitHub-Api-Version': '2022-11-28', ...(options.headers || {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `GitHub 请求失败 (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}

function setConnection(ok, message) {
  connected = ok;
  connectionState.classList.toggle('connected', ok);
  connectionState.querySelector('span').textContent = message;
  publishButton.disabled = !ok;
}

function defaultSlug(section) {
  const now = new Date();
  const stamp = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0'), String(now.getHours()).padStart(2, '0'), String(now.getMinutes()).padStart(2, '0')].join('');
  return `${section}-${stamp}`;
}

function updatePreview() {
  const data = values();
  const labels = { ai: 'AI RESEARCH', quant: 'QUANT RESEARCH', life: 'LIFE NOTES' };
  document.querySelector('#previewCategory').textContent = labels[data.section];
  document.querySelector('#previewType').textContent = data.contentType;
  document.querySelector('#previewTitle').textContent = data.title || '文章标题';
  document.querySelector('#previewSummary').textContent = data.summary || '文章摘要会显示在这里。';
  document.querySelector('#previewKeywords').textContent = data.keywords || '关键词';
  const previewBody = pendingImages.reduce((body, image) => body.replaceAll(`upload://${image.id}`, image.previewUrl), data.body || '');
  document.querySelector('#previewBody').innerHTML = previewBody ? markdownToHtml(previewBody) : '<p>正文预览会显示在这里。</p>';
}

function insertAtCursor(text, selectFrom = 0, selectLength = 0) {
  const body = form.elements.body;
  const start = body.selectionStart;
  const end = body.selectionEnd;
  body.setRangeText(text, start, end, 'end');
  body.focus();
  body.setSelectionRange(start + selectFrom, start + selectFrom + selectLength);
  body.dispatchEvent(new Event('input', { bubbles: true }));
}

imageButton.addEventListener('click', () => imagePicker.click());
imagePicker.addEventListener('change', () => {
  const files = [...imagePicker.files];
  for (const file of files) {
    if (file.size > 8 * 1024 * 1024) {
      imageStatus.textContent = `${file.name} 超过 8MB，未加入。`;
      continue;
    }
    const id = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const previewUrl = URL.createObjectURL(file);
    pendingImages.push({ id, file, previewUrl });
    insertAtCursor(`\n![${file.name.replace(/\.[^.]+$/, '')}](upload://${id})\n`);
  }
  imageStatus.textContent = pendingImages.length ? `已加入 ${pendingImages.length} 张图片，将随文章一起发布。` : '';
  imagePicker.value = '';
});

codeBlockButton.addEventListener('click', () => {
  const body = form.elements.body;
  const selected = body.value.slice(body.selectionStart, body.selectionEnd);
  const code = selected || '在这里粘贴代码';
  const text = `\n\`\`\`python\n${code}\n\`\`\`\n`;
  insertAtCursor(text, text.indexOf(code), code.length);
});

inlineCodeButton.addEventListener('click', () => {
  const body = form.elements.body;
  const selected = body.value.slice(body.selectionStart, body.selectionEnd) || '代码';
  insertAtCursor(`\`${selected}\``, 1, selected.length);
});

connectButton.addEventListener('click', async () => {
  if (!token()) { setConnection(false, '请先输入 Token'); tokenInput.focus(); return; }
  connectButton.disabled = true;
  connectButton.textContent = '验证中...';
  try {
    const repo = await github(`/repos/${OWNER}/${REPO}`);
    if (!repo.permissions?.push) throw new Error('这个 Token 没有仓库写入权限');
    sessionStorage.setItem('cathy_github_token', token());
    setConnection(true, `已连接 @${OWNER}`);
  } catch (error) {
    sessionStorage.removeItem('cathy_github_token');
    setConnection(false, error.message);
  } finally {
    connectButton.disabled = false;
    connectButton.textContent = '验证连接';
  }
});

tokenInput.addEventListener('input', () => { if (connected) setConnection(false, 'Token 已更改，请重新验证'); });
form.elements.title.addEventListener('input', () => {
  if (!slugWasEdited) form.elements.slug.value = defaultSlug(form.elements.section.value);
  updatePreview();
});
form.elements.slug.addEventListener('input', () => { slugWasEdited = Boolean(form.elements.slug.value); });
form.elements.section.addEventListener('change', () => {
  if (!slugWasEdited) form.elements.slug.value = defaultSlug(form.elements.section.value);
  const life = form.elements.section.value === 'life';
  if (life && !['生活记录', '随感'].includes(form.elements.contentType.value)) form.elements.contentType.value = '生活记录';
  updatePreview();
});
form.addEventListener('input', updatePreview);
resetButton.addEventListener('click', () => {
  pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
  pendingImages = [];
  form.reset();
  slugWasEdited = false;
  imageStatus.textContent = '';
  publishStatus.textContent = '';
  updatePreview();
});

function decodeContent(encoded) {
  const bytes = Uint8Array.from(atob(encoded.replaceAll(/\s/g, '')), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function publishContent(data) {
  data.slug = normalizeSlug(data.slug);
  const imageUploads = pendingImages.filter((image) => data.body.includes(`upload://${image.id}`));
  const usedNames = new Set();
  const imageEntries = imageUploads.map((image, index) => {
    const extension = (image.file.name.match(/\.[a-z0-9]+$/i)?.[0] || '.jpg').toLowerCase();
    let stem = image.file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `image-${index + 1}`;
    while (usedNames.has(`${stem}${extension}`)) stem = `${stem}-${index + 1}`;
    usedNames.add(`${stem}${extension}`);
    const path = `assets/articles/${data.slug}/${stem}${extension}`;
    data.body = data.body.replaceAll(`upload://${image.id}`, `../${path}`);
    return { ...image, path };
  });
  const articlePath = `articles/${data.slug}.html`;
  const exists = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${articlePath}?ref=${BRANCH}`, { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token()}`, 'X-GitHub-Api-Version': '2022-11-28' } });
  if (exists.ok) throw new Error('这个页面地址已经存在，请换一个');
  if (exists.status !== 404) throw new Error('无法确认页面地址是否可用');

  const targetPath = targetFileFor(data.section);
  const [reference, targetFile] = await Promise.all([
    github(`/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`),
    github(`/repos/${OWNER}/${REPO}/contents/${targetPath}?ref=${BRANCH}`),
  ]);
  const headSha = reference.object.sha;
  const headCommit = await github(`/repos/${OWNER}/${REPO}/git/commits/${headSha}`);
  const currentTarget = decodeContent(targetFile.content);
  const number = nextItemNumber(currentTarget, data.section);
  const item = createListItem({ ...data, number });
  const nextTarget = insertContent(currentTarget, data.section, item);
  const articlePage = createArticlePage(data);
  const [targetBlob, articleBlob, ...imageBlobs] = await Promise.all([
    github(`/repos/${OWNER}/${REPO}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: nextTarget, encoding: 'utf-8' }) }),
    github(`/repos/${OWNER}/${REPO}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: articlePage, encoding: 'utf-8' }) }),
    ...imageEntries.map(async (image) => github(`/repos/${OWNER}/${REPO}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: await fileToBase64(image.file), encoding: 'base64' }) })),
  ]);
  const treeEntries = [
    { path: targetPath, mode: '100644', type: 'blob', sha: targetBlob.sha },
    { path: articlePath, mode: '100644', type: 'blob', sha: articleBlob.sha },
    ...imageEntries.map((image, index) => ({ path: image.path, mode: '100644', type: 'blob', sha: imageBlobs[index].sha })),
  ];
  const tree = await github(`/repos/${OWNER}/${REPO}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: headCommit.tree.sha, tree: treeEntries }),
  });
  const commit = await github(`/repos/${OWNER}/${REPO}/git/commits`, { method: 'POST', body: JSON.stringify({ message: `feat: publish ${data.title}`, tree: tree.sha, parents: [headSha] }) });
  await github(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });
  return `https://${OWNER}.github.io/${articlePath}`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error(`无法读取图片：${file.name}`));
    reader.readAsDataURL(file);
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!connected) { publishStatus.textContent = '请先验证 GitHub 连接。'; return; }
  const data = values();
  try { normalizeSlug(data.slug); } catch (error) { publishStatus.textContent = error.message; form.elements.slug.focus(); return; }
  if (!window.confirm(`确认公开发布“${data.title}”？`)) return;
  publishButton.disabled = true;
  publishStatus.textContent = '正在创建文章并更新栏目...';
  try {
    const url = await publishContent(data);
    publishStatus.innerHTML = `发布成功。页面通常在一分钟内更新。<a href="${url}" target="_blank" rel="noreferrer">打开文章 ↗</a>`;
  } catch (error) {
    publishStatus.textContent = `发布失败：${error.message}`;
  } finally {
    publishButton.disabled = false;
  }
});

updatePreview();
if (token()) setConnection(false, '已有会话 Token，请验证连接');
