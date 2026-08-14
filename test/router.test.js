import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import { DeepSeekVisionRouter, apply, resolveConfig, rpcChannel } from '../index.js'

test('images use the selected DSH vision model before delegation', async () => {
  const delegated = []
  const visionCalls = []
  let selection = { visionProvider: 'vision-provider', visionModel: 'mimo-v2.5' }
  const ctx = {
    llm: {
      providerRetryPolicy() {
        return { mode: 'normal', maxRetries: 0, retryableCodes: [], initialDelayMs: 1, maxDelayMs: 1, jitterRatio: 0 }
      },
      async listModels(provider) {
        return [{ provider, id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', inputModalities: ['text'] }]
      },
      async resolveModelInfo(provider, model) {
        if (provider === 'vision-provider') {
          return { provider, id: model, name: model, inputModalities: ['text', 'image'] }
        }
        return { provider, id: model, name: model, inputModalities: ['text'], context: { contextWindow: 1_000_000 } }
      },
      async prepareCall(config) {
        if (config.provider === 'vision-provider') {
          return {
            config,
            stream(options) {
              visionCalls.push(options)
              return (async function* () {
                yield { type: 'text-delta', index: 0, text: config.model === 'mimo-v2.5' ? 'A green square.' : 'A blue circle.' }
                yield { type: 'finish', reason: { kind: 'stop' } }
              })()
            },
          }
        }
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
  const adapter = new DeepSeekVisionRouter(ctx, {}, () => selection)
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
  selection = { ...selection, visionModel: 'mimo-v2.5-alt' }
  for await (const _chunk of adapter.stream(options)) {}

  assert.equal(visionCalls.length, 2)
  assert.equal(visionCalls[0].provider, 'vision-provider')
  assert.equal(visionCalls[0].model, 'mimo-v2.5')
  assert.equal(visionCalls[0].messages[0].content.some((block) => block.type === 'image'), true)
  assert.match(visionCalls[0].system, /image analysis assistant/)
  assert.equal(delegated.length, 3)
  assert.equal(delegated[0].provider, 'deepseek-official')
  assert.equal(delegated[0].messages[0].content.some((block) => block.type === 'image'), false)
  assert.match(delegated[0].messages[0].content[0].text, /Untrusted visual description/)
  assert.match(delegated[0].messages[0].content[0].text, /green square/)
  assert.match(delegated[2].messages[0].content[0].text, /blue circle/)
  assert.deepEqual((await adapter.resolveModel('deepseek-vision', 'deepseek-v4-pro')).inputModalities, ['text', 'image'])
  assert.equal(resolveConfig({}).visionModel, 'mimo-v2.5')
  assert.throws(() => resolveConfig({ provider: 'same', targetProvider: 'same' }), /must differ/)
  assert.throws(() => resolveConfig({ provider: 'same', visionProvider: 'same' }), /must differ/)
})

test('a vision provider must be selected before processing images', async () => {
  const adapter = new DeepSeekVisionRouter({ llm: {} })
  const stream = adapter.stream({
    provider: 'deepseek-vision',
    model: 'deepseek-v4-pro',
    messages: [{
      id: 'message:test', role: 'user', source: { kind: 'user' },
      content: [{ type: 'image', attachment: { attachmentId: 'sha256:test' } }],
    }],
  })
  await assert.rejects(async () => { for await (const _chunk of stream) {} }, /Select a vision provider/)
})

test('the native connection channel persists only provider and model selection', async () => {
  let value
  let handler
  apply({
    llm: { registerAdapter() {} },
    inject(services, callback) {
      assert.deepEqual(services, ['settings', 'connection'])
      callback({
        settings: {
          writable: true,
          register(_ns, _schema, options) {
            value = options.base
            return {
              get: () => value,
              async update(next) { value = next },
            }
          },
        },
        connection: { rpc: { handle(channel, next, options) {
          assert.equal(channel, rpcChannel)
          assert.deepEqual(options, { authority: 'trusted-host' })
          handler = next
        } } },
      })
    },
  }, {})

  assert.deepEqual(await handler('settings.get', {}), {
    ok: true,
    value: { visionProvider: '', visionModel: 'mimo-v2.5', writable: true },
  })
  assert.equal((await handler('settings.set', {
    visionProvider: 'mimo-provider',
    visionModel: 'mimo-v2.5',
  })).ok, true)
  assert.deepEqual(value, { visionProvider: 'mimo-provider', visionModel: 'mimo-v2.5' })
  assert.equal((await handler('settings.set', {
    visionProvider: 'deepseek-vision',
    visionModel: 'mimo-v2.5',
  })).ok, false)
})

test('client bundle registers the native provider and model card', async () => {
  let definition
  const source = await readFile(new URL('../client.js', import.meta.url), 'utf8')
  const document = {
    head: { appendChild() {} },
    querySelector() { return null },
    createElement() { return { dataset: {}, remove() {} } },
  }
  vm.runInNewContext(source, {
    document,
    window: { __ModuleLoader__: { load(value) { definition = value } } },
  })

  const plugin = definition.factory((name) => {
    assert.equal(name, 'react')
    return { createElement() {} }
  })
  let registration
  const services = {
    slots: {
      inject(name, effect) { assert.equal(name, 'settings.plugin.item'); effect() },
      register(options, component) { registration = { options, component } },
    },
    connection: { api: {} },
    locale: {},
    remote: { $on() { return () => {} } },
  }
  plugin.apply({
    effect(callback) { callback() },
    get(name) { return services[name] },
  })

  assert.equal(registration.options.id, 'deepseek-vision')
  assert.equal(typeof registration.component, 'function')
  assert.match(source, /connection\.rpc\.call\(RPC_CHANNEL, 'settings\.get'/)
  assert.doesNotMatch(source, /api\.settings\.mutate/)
})
