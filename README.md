# dsh-deepseek-vision-router

[English](README.md) | [简体中文](README.zh-CN.md)

An experimental [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
plugin that lets a text-only DeepSeek main agent accept images directly from
the DSH chat composer.

```text
DSH image attachment -> vision model description -> deepseek-official
```

The plugin adds a separate `deepseek-vision` provider. It reuses DSH's durable
attachment and credential services, `mcp-vision-bridge` for OpenAI-compatible
vision calls, and the official DeepSeek adapter for reasoning, streaming, tool
calls, retries, and model configuration.

## Compatibility

- DSH `0.1.0-rc.6`
- Node.js 24+
- `mcp-vision-bridge` `0.2.7`

Other versions may work but have not been tested.

## Install

```sh
dsh plugin --profile web add github:mochgolf/dsh-deepseek-vision-router
```

Provide the vision credential through DSH's credential service or the launch
environment:

```sh
export VISION_OPENAI_API_KEY='your-key'
dsh --profile web --host 127.0.0.1 --port 3080
```

The bundled defaults use OpenCode Go with `mimo-v2.5`. Override
`visionBaseURL`, `visionModel`, `visionApiKeyEnv`, `visionMaxTokens`, or
`visionTimeoutMs` in the plugin's Cordis entry when using another
OpenAI-compatible vision endpoint.

Select **DeepSeek + Vision** in DSH's model menu. New sessions can use it as
their default provider; existing sessions retain their recorded provider until
switched.

## Security and privacy

- Credentials are resolved by reference and are never stored in plugin config.
- Image bytes are sent to the configured vision provider; DeepSeek receives the
  resulting text description, not the pixels.
- Descriptions are marked as untrusted image content before reaching DeepSeek,
  so text visible inside an image is not promoted to system instructions.
- Successful descriptions use a bounded, process-local cache.

## Limitations

- The cache is not persisted across DSH restarts.
- The current implementation imports two `mcp-vision-bridge` internal modules;
  an upstream directory change may require a compatibility update.
- This is a preprocessing bridge, not native DeepSeek multimodality.

## Development

```sh
npm ci
npm test
```
