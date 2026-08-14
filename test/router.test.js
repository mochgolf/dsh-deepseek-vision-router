import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:http'
import test from 'node:test'
import { DeepSeekVisionRouter, resolveConfig } from '../index.js'

test('images are described once and delegated to the official DeepSeek route', async () => {
  const delegated = []
  let visionCalls = 0
  const ctx = {
    attachments: {
      async readImage(ref) {
        return { ref, data: new Uint8Array([1, 2, 3]) }
      },
    },
    credentials: {
      async resolve() {
        return { value: 'test-key', source: 'test' }
      },
    },
    llm: {
      providerRetryPolicy() {
        return { mode: 'normal', maxRetries: 0, retryableCodes: [], initialDelayMs: 1, maxDelayMs: 1, jitterRatio: 0 }
      },
      async listModels(provider) {
        return [{ provider, id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', inputModalities: ['text'] }]
      },
      async resolveModelInfo(provider, model) {
        return { provider, id: model, name: model, inputModalities: ['text'], context: { contextWindow: 1_000_000 } }
      },
      async prepareCall(config) {
        return {
          config,
          stream(options) {
            delegated.push(options)
            return (async function* () {
              yield { type: 'text-delta', index: 0, text: 'ok' }
              yield { type: 'finish', reason: { kind: 'stop' } }
            })()
          },
        }
      },
    },
  }
  const fetchFn = async (_url, init) => {
    visionCalls += 1
    const body = JSON.parse(init.body)
    assert.equal(body.model, 'mimo-v2.5')
    assert.equal(body.messages[1].content[0].type, 'image_url')
    return new Response(JSON.stringify({
      model: 'mimo-v2.5',
      choices: [{ message: { content: 'A green square containing the word OK.' } }],
    }))
  }
  const adapter = new DeepSeekVisionRouter(ctx, {}, fetchFn)
  const image = {
    type: 'image',
    attachment: {
      attachmentId: 'sha256:test',
      mediaType: 'image/png',
      bytes: 3,
      width: 1,
      height: 1,
    },
  }
  const options = {
    provider: 'deepseek-vision',
    model: 'deepseek-v4-pro',
    messages: [{ id: 'message:test', role: 'user', source: { kind: 'user' }, content: [image] }],
  }

  for await (const _chunk of adapter.stream(options)) {}
  for await (const _chunk of adapter.stream(options)) {}

  assert.equal(visionCalls, 1)
  assert.equal(delegated.length, 2)
  assert.equal(delegated[0].provider, 'deepseek-official')
  assert.equal(delegated[0].messages[0].content.some((block) => block.type === 'image'), false)
  assert.match(delegated[0].messages[0].content[0].text, /Untrusted visual description/)
  assert.match(delegated[0].messages[0].content[0].text, /green square/)
  assert.deepEqual((await adapter.resolveModel('deepseek-vision', 'deepseek-v4-pro')).inputModalities, ['text', 'image'])
  assert.throws(() => resolveConfig({ provider: 'same', targetProvider: 'same' }), /must differ/)
})

test('credential CLI stores a piped key without printing it', async (t) => {
  let request
  const server = createServer(async (req, res) => {
    let raw = ''
    req.setEncoding('utf8')
    for await (const chunk of req) raw += chunk
    request = JSON.parse(raw)
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({
      type: 'server-response',
      rpcId: request.rpcId,
      result: { ok: true, value: {} },
    }))
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise((resolve) => server.close(resolve)))

  const child = spawn(process.execPath, [
    new URL('../bin/dsh-vision-key.js', import.meta.url).pathname,
    `http://127.0.0.1:${server.address().port}`,
  ])
  let output = ''
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (chunk) => { output += chunk })
  child.stderr.on('data', (chunk) => { output += chunk })
  child.stdin.end('test-secret\n')
  const [code] = await once(child, 'close')

  assert.equal(code, 0, output)
  assert.equal(request.method, 'credentials.set')
  assert.deepEqual(request.payload, { ref: 'VISION_OPENAI_API_KEY', value: 'test-secret' })
  assert.doesNotMatch(output, /test-secret/)
})
