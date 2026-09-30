# Cathy Publisher v2 规格

## 目标

为 Cathy Liu 的个人站点提供仅供本人本地使用的 macOS 发布器。发布器登录 GitHub 后，可创建 AI / Quant 课题或生活文章，并原子更新对应列表。发布器生成的页面必须与公开站点现有模板一致，且不得暴露任何编辑或管理入口。

## 技术栈

- macOS arm64 应用，Swift 6 + AppKit + WebKit。
- 编辑界面使用随 App 打包的 HTML、CSS 与原生 JavaScript。
- 使用 GitHub Git Data API 向 `cathyliucx/cathyliucx.github.io` 的 `main` 分支创建非强制原子提交。
- 不引入第三方运行时依赖。

## 内容模型

### AI / Quant 课题

- 方向：AI、Quant 或 AI × Quant。
- 标题、首页关键词、简介；页面地址由 Publisher 在后台自动生成，不在界面显示。
- TYPE：自由输入，提供 `AI AGENT`、`AI × QUANT`、`QUANT RESEARCH` 等建议值。
- STATUS：持续研究、已完成、暂停或自定义。
- UPDATED：默认当天，可编辑。
- 固定正文：挑战与贡献、方法与设计、研究结果、综述与见解。
- 输出到 `projects/<slug>.html`，并更新 `index.html` 的 AI 或 Quant 项目列表。

### 生活文章

- 生活主题：吉他、打球或旅行；主题下不再设置任何二次分类或内容类型。
- 标题、摘要、标签、日期；页面地址由 Publisher 在后台自动生成，不在界面显示。
- 自由正文，支持二三级标题、列表、图片、代码块与行内代码。
- 输出到 `articles/<slug>.html`。
- 更新 `life.html` 的最近记录，并将文章直接加入对应生活主题页。

### 最近在想

- 两种发布模式均提供“加入最近在想”选项。
- AI / Quant 默认开启，生活默认关闭。
- 开启后将新条目插入 `index.html#notes` 顶部；不设置研究或生活二次分组。

## 界面与预览

- 第一步连接 GitHub；Token 只放在当前 App 会话，不写入磁盘、源码或提交。
- 第二步选择“AI / Quant 课题”或“生活文章”，动态显示对应字段。
- 实时预览必须使用与最终公开页面相同的字段、顺序和视觉语义。
- 发布前显示将创建和修改的文件，并要求最终确认。

## 项目结构

- `.publisher-src/app/`：Swift App 壳。
- `.publisher-src/web/`：发布器界面与发布逻辑。
- `.publisher-src/tests/`：Node 单元测试。
- `.publisher-src/scripts/`：构建、验证与 DMG 打包脚本。
- `Cathy-Publisher.dmg`：本地交付物，不纳入 Git；重新打包时直接替换，不保留旧包。
- `docs/publisher-v2-spec.md`：可公开的行为规格，不包含凭证。

## 命令

- 测试：`node --test .publisher-src/tests/*.test.mjs`
- 构建：`.publisher-src/scripts/build.sh`
- 打包：`.publisher-src/scripts/package-dmg.sh`
- 验证：`.publisher-src/scripts/verify.sh Cathy-Publisher.dmg`

## 测试策略

- 单元测试覆盖 slug、安全转义、Markdown 转换、课题页与生活页生成、列表插入、最近在想插入。
- 每种发布模式至少生成一个完整页面并断言字段、顺序、路径和返回链接。
- 回归测试断言所有生成页面均不包含 GitHub 编辑入口。
- 构建后验证 `.app` 结构、签名、DMG 可挂载性和资源完整性。

## 边界

- 始终：发布前校验字段；使用非强制提交；更新列表时保留标记外内容；打包成功后替换旧 DMG。
- 需确认：更换仓库、分支或认证方式。
- 禁止：持久化 Token；将发布器源码或安装包提交到公开站点；在公开页面生成编辑入口；强制推送。

## 成功标准

- AI / Quant 课题包含 TYPE、STATUS、UPDATED 和四个固定章节，顺序完全一致。
- 生活文章使用自由正文，并自动进入生活总览及其分类页。
- 两种内容均可按默认策略加入“最近在想”。
- App 预览与发布结果字段一致。
- 所有自动化测试通过，DMG 可正常挂载并包含可启动的 arm64 macOS App。
- 公开站点和生成页面中不存在 GitHub 编辑按钮或管理入口。

## 已确认决策

- 使用以上内容模型与发布流程。
- 不保留旧安装包，最终交付物固定为 `Cathy-Publisher.dmg`。
