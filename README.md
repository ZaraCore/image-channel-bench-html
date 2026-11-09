# Image Channel Bench HTML

轻量的图片 API 渠道评测工具。只需浏览器，下载后双击 `index.html` 即可使用，无需安装依赖或启动服务。

## 开始使用

1. 点击本仓库 **Code → Download ZIP**，下载并解压。
2. 双击打开 `index.html`。
3. 填写渠道名称、Base URL、API Key 和模型名称。Base URL 填渠道域名，生成路径默认为 `/v1/images/generations`，编辑路径默认为 `/v1/images/edits`。
4. 在基础生成区填写提示词、尺寸和质量，点击执行一次生成。
5. 查看接口结果、图片和检查详情，填写人工结论、判断依据及实际扣费。
6. 点击下载完整报告 ZIP，保存本次评测。

## SOP 与专项测试

- **SOP 套件**：选择资源类型、参考图来源和多图数量后启动，按清单执行测试。
- **图生图**：选择本地 PNG 或填写参考图片 URL；文件编辑兼容入口可单独选择原图。
- **透明背景**：查看透明像素结果，结合深浅底色对照确认主体及边缘。
- **Mask**：选择原图与遮罩 PNG，执行后对照指定区域修改效果。
- **原生／超分**：生成海报，保存原图并放大文字边缘，填写识别分类、人工结论和依据。
- **多图与审核**：根据资源类型执行适用项目，分别查看数量及审核结果。
- **浏览器 10 请求测试**：在专项入口单独启动，查看成功率和耗时统计。

模型预置包含 gpt-image-2、gpt-image-2.5-sunburst、gpt-image-2.5-flare、gpt-image-2.6-sunburst 和 gpt-image-2.6-flare。选择 2.6 后可使用独立的复杂度对照、SVG 和 GIF 测试区，按页面提示填写对应参数。SVG 编写模型在该测试区单独填写。

## 费用估算

在页面录入参考价格，查看图片输出 Token 估算和接口报告用量的对照。估算不代替实际账单；可手动填写实际扣费，或对已有记录重新估算，无需重新生成。

## 保存与恢复

完整 ZIP 包含 `summary.md`、`report.md`、`record.json`、图片及人工附件。先查看总结，详细证据见完整报告。也可单独下载 Markdown。

刷新或关闭页面前先导出。恢复时选择解压后的完整报告文件夹；仅导入 JSON 时不会同时恢复图片。需要重新判读已有透明像素或额外字段时，使用对应的不发请求更新按钮。

每次生成可能产生费用，重跑由用户主动发起，没有自动重试。测试图片、遮罩和 API Key 由使用者自行准备；密钥只用于当前页面，不写入连接配置或标准导出文件。

## 开发验证（可选）

运行工具不需要 Node.js。开发者可安装 Node.js 后执行离线测试：

```text
node tests/verify-core.cjs
node tests/verify-sop.cjs
node tests/verify-viewer.cjs
node tests/verify-summary.cjs
node tests/verify-diagnostics.cjs
node tests/verify-protocol-differences.cjs
node tests/verify-image26.cjs
node tests/verify-output-tokens.cjs
```

测试使用模拟数据，不调用真实渠道。页面全部运行逻辑内嵌于 `index.html`；`tests/fixtures` 仅供开发验证使用。

## 许可证

源码采用 [MIT License](LICENSE)。
