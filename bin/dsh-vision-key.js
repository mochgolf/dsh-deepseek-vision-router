#!/usr/bin/env node

import { randomUUID } from 'node:crypto'
import { isIP } from 'node:net'
import { argv, env, stdin, stdout } from 'node:process'

const ref = 'VISION_OPENAI_API_KEY'

function endpoint(raw) {
  const base = new URL(raw)
  const host = base.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  const loopback = host === 'localhost' || host === '::1' || (isIP(host) === 4 && host.startsWith('127.'))
  if (!['http:', 'https:'].includes(base.protocol) || !loopback || base.username || base.password) {
    throw new Error('DSH URL must be an unauthenticated HTTP(S) loopback URL')
  }
  return new URL('/api/credentials.set', base)
}

async function main() {
  if (argv.length > 3) throw new Error('usage: dsh-vision-key [http://127.0.0.1:3080]')
  if (stdin.isTTY) {
    throw new Error("pipe the API key through stdin; do not pass it as a command-line argument")
  }

  stdin.setEncoding('utf8')
  let value = ''
  for await (const chunk of stdin) value += chunk
  value = value.trim()
  if (value === '') throw new Error('API key is empty')

  const rpcId = `dsh-vision-key:${randomUUID()}`
  const response = await fetch(endpoint(argv[2] ?? env.DSH_URL ?? 'http://127.0.0.1:3080'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'client-request',
      rpcId,
      method: 'credentials.set',
      payload: { ref, value },
    }),
  })
  if (!response.ok) throw new Error(`DSH returned HTTP ${response.status}`)
  const body = await response.json()
  if (body.rpcId !== rpcId) throw new Error('DSH returned a mismatched response')
  if (body.result?.ok !== true) throw new Error(body.result?.error?.message ?? 'DSH rejected the credential')
  stdout.write(`Stored ${ref} in DSH credentials.\n`)
}

main().catch((error) => {
  console.error(`dsh-vision-key: ${error.message}`)
  process.exitCode = 1
})
