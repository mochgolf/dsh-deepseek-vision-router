# dsh-deepseek-vision-router

[English](README.md) | [简体中文](README.zh-CN.md)

这是一个实验性的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
插件，让纯文本 DeepSeek 主代理可以直接接收从 DSH 聊天框输入的图片。

```text
DSH 图片附件 -> 视觉模型描述 -> deepseek-official
```

插件会新增独立的 `deepseek-vision` 路由。图片分析通过 DSH“模型”设置中已有的
提供方运行；主对话仍由官方 DeepSeek 适配器负责推理、流式输出、工具调用和重试。

## 兼容性

- DSH `0.1.0-rc.6`
- Node.js 24+
- `mcp-vision-bridge` `0.2.7`

其他版本可能也能运行，但尚未验证。

## 安装

```sh
dsh plugin --profile web add github:mochgolf/dsh-deepseek-vision-router
```

1. 打开 **设置 → 模型**，新增或复用一个支持图片输入的提供方；端点和凭据仍由
   模型页管理。
2. 打开 **设置 → 插件 → DeepSeek 视觉**，选择该提供方并保存视觉模型。模型字段
   默认是 `mimo-v2.5`，也可输入所选提供方支持的其他模型 ID。

提供方的新增、修改和删除始终在 **设置 → 模型** 完成。插件只在 DSH 原生 settings
命名空间保存 `visionProvider` 和 `visionModel`，下一次图片请求会直接使用新配置，
无需重启。

在 DSH 模型菜单中选择 **DeepSeek + Vision**。新会话可以将它设为默认提供方；
已有会话会保留之前记录的提供方，直到手动切换。

## 安全与隐私

- 提供方端点和凭据仍由 DSH“模型”设置管理；插件不会复制或保存它们。
- 图片字节会发送到配置的视觉模型提供方；DeepSeek 接收的是文字描述，而非像素。
- 视觉描述在交给 DeepSeek 前会标记为不可信图片内容，避免图片中的文字被提升为
  系统指令。
- 成功生成的描述会进入有容量上限的进程内缓存。

## 已知限制

- DSH 重启后不会保留描述缓存。
- 分析提示词来自一个 `mcp-vision-bridge` 内部模块；其上游目录结构变化时可能需要
  更新兼容代码。
- 这是图片预处理桥接方案，不是 DeepSeek 原生多模态能力。

## 开发

```sh
npm ci
npm test
```
