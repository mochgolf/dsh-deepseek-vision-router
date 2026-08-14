# dsh-deepseek-vision-router

[English](README.md) | [简体中文](README.zh-CN.md)

这是一个实验性的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
插件，让纯文本 DeepSeek 主代理可以直接接收从 DSH 聊天框输入的图片。

```text
DSH 图片附件 -> 视觉模型描述 -> deepseek-official
```

插件会新增独立的 `deepseek-vision` 提供方。它复用 DSH 的持久附件与凭据
服务，使用 `mcp-vision-bridge` 调用兼容 OpenAI 协议的视觉模型，再把完整
对话交给官方 DeepSeek 适配器处理推理、流式输出、工具调用、重试和模型配置。

## 兼容性

- DSH `0.1.0-rc.6`
- Node.js 24+
- `mcp-vision-bridge` `0.2.7`

其他版本可能也能运行，但尚未验证。

## 安装

```sh
dsh plugin --profile web add github:mochgolf/dsh-deepseek-vision-router
```

首次启动 DSH 后，通过其持久凭据服务录入一次视觉模型密钥：

```sh
dsh --profile web --host 127.0.0.1 --port 3080
read -rsp '视觉模型 API Key: ' key; echo
printf %s "$key" | dsh plugin --profile web exec dsh-vision-key
unset key
```

该命令会把 `VISION_OPENAI_API_KEY` 写入 DSH 管理的凭据库，而不是插件配置。
以后启动无需再传环境变量。若 DSH 使用其他回环地址，请把地址作为命令的最后一个
参数；同名启动环境变量仍可作为无头部署的后备方案。

插件默认使用 OpenCode Go 的 `mimo-v2.5`。如需接入其他兼容 OpenAI 协议的
视觉端点，可在插件的 Cordis 配置项中覆盖 `visionBaseURL`、`visionModel`、
`visionApiKeyEnv`、`visionMaxTokens` 或 `visionTimeoutMs`。

在 DSH 模型菜单中选择 **DeepSeek + Vision**。新会话可以将它设为默认提供方；
已有会话会保留之前记录的提供方，直到手动切换。

## 安全与隐私

- 凭据按引用解析、由 DSH 持久化，不会保存在插件配置中。
- 图片字节会发送到配置的视觉模型提供方；DeepSeek 接收的是文字描述，而非像素。
- 视觉描述在交给 DeepSeek 前会标记为不可信图片内容，避免图片中的文字被提升为
  系统指令。
- 成功生成的描述会进入有容量上限的进程内缓存。

## 已知限制

- DSH 重启后不会保留描述缓存。
- 当前实现引用了两个 `mcp-vision-bridge` 内部模块；其上游目录结构变化时可能需要
  更新兼容代码。
- 这是图片预处理桥接方案，不是 DeepSeek 原生多模态能力。

## 开发

```sh
npm ci
npm test
```
