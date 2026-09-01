import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createArticlePage,
  createListItem,
  insertContent,
  markdownToHtml,
  normalizeSlug,
} from './core.mjs';

test('normalizeSlug produces a safe article path', () => {
  assert.equal(normalizeSlug('  LNP Agent / Study  '), 'lnp-agent-study');
  assert.throws(() => normalizeSlug('中文标题'), /页面地址/);
});

test('insertContent adds an AI article before the AI end marker', () => {
  const index = [
    '<!-- AI_PROJECTS_START -->',
    '<li>existing</li>',
    '<!-- AI_PROJECTS_END -->',
  ].join('\n');
  const item = createListItem({
    section: 'ai',
    number: 3,
    title: 'A Method Review',
    slug: 'method-review',
    keywords: '学习 · 综述',
    summary: 'A concise summary.',
  });
  const updated = insertContent(index, 'ai', item);
  assert.match(updated, /articles\/method-review\.html/);
  assert.ok(updated.indexOf('A Method Review') < updated.indexOf('AI_PROJECTS_END'));
});

test('insertContent supports life notes', () => {
  const life = '<!-- LIFE_POSTS_START -->\n<!-- LIFE_POSTS_END -->';
  const item = createListItem({
    section: 'life',
    title: '一次旅行',
    slug: 'a-trip',
    summary: '旅行随感。',
    keywords: '旅行',
  });
  assert.match(insertContent(life, 'life', item), /articles\/a-trip\.html/);
});

test('markdownToHtml creates flexible headings, paragraphs and lists', () => {
  const html = markdownToHtml('## 我学到的方法\n\n一段感想。\n\n- 第一点\n- 第二点');
  assert.match(html, /<h2>我学到的方法<\/h2>/);
  assert.match(html, /<p>一段感想。<\/p>/);
  assert.match(html, /<ul><li>第一点<\/li><li>第二点<\/li><\/ul>/);
});

test('createArticlePage does not force research section headings', () => {
  const page = createArticlePage({
    section: 'ai',
    contentType: '方法学习与综述',
    title: '<script>alert(1)</script>',
    slug: 'safe-page',
    summary: 'Summary',
    keywords: 'Agent',
    body: '## 我的理解\n\n自由正文。',
  });
  assert.doesNotMatch(page, /<script>alert/);
  assert.match(page, /我的理解/);
  assert.match(page, /自由正文/);
  assert.doesNotMatch(page, /方法与设计/);
  assert.doesNotMatch(page, /研究结果/);
});
