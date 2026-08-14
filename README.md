# dsh-deepseek-vision-router

[English](README.md) | [简体中文](README.zh-CN.md)

An experimental [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
plugin that lets a text-only DeepSeek main agent accept images directly from
the DSH chat composer.

```text
DSH image attachment -> vision model description -> deepseek-official
```

The plugin adds a separate `deepseek-vision` route. Image analysis runs through
an existing provider from DSH's Models settings; the official DeepSeek adapter
still owns the main conversation, reasoning, streaming, tools, and retries.

## Compatibility

- DSH `0.1.0-rc.6`
- Node.js 24+
- `mcp-vision-bridge` `0.2.7`

Other versions may work but have not been tested.

## Install

```sh
dsh plugin --profile web add github:mochgolf/dsh-deepseek-vision-router
```

1. Open **Settings → Models** and add or reuse an image-capable provider. Its
   endpoint and credential stay owned by the Models page.
2. Open **Settings → Plugins → DeepSeek Vision**, select that provider, and
   save the vision model. The model field defaults to `mimo-v2.5` but accepts
   any model ID exposed by the selected provider.

Provider additions, edits, and removals remain in **Settings → Models**. The
plugin stores only `visionProvider` and `visionModel` in DSH's native settings
namespace and applies changes to the next image request without a restart.

Select **DeepSeek + Vision** in DSH's model menu. New sessions can use it as
their default provider; existing sessions retain their recorded provider until
switched.

## Security and privacy

- Provider endpoints and credentials remain managed by DSH's Models settings;
  this plugin never copies or stores them.
- Image bytes are sent to the configured vision provider; DeepSeek receives the
  resulting text description, not the pixels.
- Descriptions are marked as untrusted image content before reaching DeepSeek,
  so text visible inside an image is not promoted to system instructions.
- Successful descriptions use a bounded, process-local cache.

## Limitations

- The cache is not persisted across DSH restarts.
- The analysis prompt comes from an internal `mcp-vision-bridge` module; an
  upstream directory change may require a compatibility update.
- This is a preprocessing bridge, not native DeepSeek multimodality.

## Development

```sh
npm ci
npm test
```
