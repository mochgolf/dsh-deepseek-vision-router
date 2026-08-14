window.__ModuleLoader__.load({
  id: 'dsh-deepseek-vision-router',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement
    const REF = 'VISION_OPENAI_API_KEY'

    const COPY = {
      zh: {
        title: 'DeepSeek 视觉',
        description: '管理视觉模型使用的 API Key',
        key: 'API Key',
        hint: '密钥由 DSH 凭据服务保存；留空不会覆盖现有密钥。',
        configured: '已配置',
        unconfigured: '未配置',
        loading: '正在读取凭据状态…',
        save: '保存密钥',
        saving: '保存中…',
        remove: '删除密钥',
        saved: '密钥已保存，下一次请求立即生效。',
        removed: '密钥已删除。',
        confirmRemove: '确定删除视觉模型 API Key？',
        readOnly: '当前密钥来自启动环境，只读；请先移除对应环境变量并重启 DSH。',
        sources: { file: 'DSH 凭据库', env: '启动环境', 'project-env': '项目 .env', 'user-env': '用户 .env' },
      },
      en: {
        title: 'DeepSeek Vision',
        description: 'Manage the API key used by the vision model',
        key: 'API key',
        hint: 'Stored by DSH credentials; leaving this blank keeps the existing key.',
        configured: 'Configured',
        unconfigured: 'Not configured',
        loading: 'Reading credential status…',
        save: 'Save key',
        saving: 'Saving…',
        remove: 'Remove key',
        saved: 'Key saved and available to the next request.',
        removed: 'Key removed.',
        confirmRemove: 'Remove the vision model API key?',
        readOnly: 'The active key comes from the launch environment. Remove that variable and restart DSH to edit it here.',
        sources: { file: 'DSH credential store', env: 'launch environment', 'project-env': 'project .env', 'user-env': 'user .env' },
      },
    }

    const CSS = `
.dvr-card{list-style:none;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-3)}
.dvr-card[data-open=true]{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}
.dvr-head{width:100%;border:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer;display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px}
.dvr-head:focus-visible,.dvr-input:focus-visible,.dvr-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dvr-headText{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}.dvr-title{font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary)}
.dvr-description,.dvr-hint,.dvr-readonly{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-tertiary);margin:0}
.dvr-status{flex:none;font-size:12px;color:var(--dsw-alias-label-secondary)}.dvr-status[data-configured=true]{color:var(--dsw-alias-state-success-primary)}
.dvr-chevron{color:var(--dsw-alias-label-tertiary);transition:transform .16s}.dvr-chevron[data-open=true]{transform:rotate(180deg)}
.dvr-body{border-top:1px solid var(--dsw-alias-border-l2);margin:0 16px;padding:14px 0 12px;display:grid;gap:10px}
.dvr-label{font-size:13px;font-weight:500;color:var(--dsw-alias-label-primary)}
.dvr-input{box-sizing:border-box;width:100%;height:34px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px}
.dvr-input:disabled{opacity:.55}.dvr-message{margin:0;font-size:12px;color:var(--dsw-alias-state-success-primary)}.dvr-error{margin:0;font-size:12px;color:var(--dsw-alias-state-error-primary)}
.dvr-actions{display:flex;justify-content:flex-end;gap:8px;padding-top:4px}.dvr-button{border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:5px 14px;background:none;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;cursor:pointer}
.dvr-button-primary{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);border-color:transparent}.dvr-button-danger{color:var(--dsw-alias-state-error-primary)}
.dvr-button:disabled{opacity:.4;cursor:default}
`

    function installStyles() {
      const id = 'dsh-deepseek-vision-router/client'
      if (document.querySelector(`style[data-plugin-css="${id}"]`) !== null) return () => {}
      const style = document.createElement('style')
      style.dataset.pluginCss = id
      style.textContent = CSS
      document.head.appendChild(style)
      return () => style.remove()
    }

    function Chevron() {
      return h('svg', { viewBox: '0 0 14 14', width: 14, height: 14, 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4 },
        h('path', { d: 'm3 5 4 4 4-4' }))
    }

    function CredentialCard({ api, locale, subscribeCredential }) {
      const localeSnapshot = React.useSyncExternalStore(
        locale.subscribe.bind(locale),
        locale.getSnapshot.bind(locale),
        locale.getSnapshot.bind(locale),
      )
      const copy = localeSnapshot.active.toLowerCase().startsWith('zh') ? COPY.zh : COPY.en
      const [expanded, setExpanded] = React.useState(false)
      const [info, setInfo] = React.useState()
      const [key, setKey] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [message, setMessage] = React.useState('')
      const [error, setError] = React.useState('')

      const load = React.useCallback(async () => {
        try {
          const response = await api.credentials.describe({ refs: [REF] })
          if (!response.result.ok) throw new Error(response.result.error.message)
          setInfo(response.result.value.credentials[REF] ?? { configured: false, writable: true })
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : String(reason))
        }
      }, [api])

      React.useEffect(() => {
        void load()
        return subscribeCredential(() => { void load() })
      }, [load, subscribeCredential])

      const save = async () => {
        const value = key.trim()
        if (value === '') return
        setBusy(true); setMessage(''); setError('')
        try {
          const response = await api.credentials.set({ ref: REF, value })
          if (!response.result.ok) throw new Error(response.result.error.message)
          setKey('')
          await load()
          setMessage(copy.saved)
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : String(reason))
        } finally {
          setBusy(false)
        }
      }

      const remove = async () => {
        if (!globalThis.confirm(copy.confirmRemove)) return
        setBusy(true); setMessage(''); setError('')
        try {
          const response = await api.credentials.unset({ ref: REF })
          if (!response.result.ok) throw new Error(response.result.error.message)
          setKey('')
          await load()
          setMessage(copy.removed)
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : String(reason))
        } finally {
          setBusy(false)
        }
      }

      const source = info?.source === undefined ? '' : (copy.sources[info.source] ?? info.source)
      const status = info === undefined
        ? copy.loading
        : info.configured ? `${copy.configured}${source === '' ? '' : ` · ${source}`}` : copy.unconfigured
      const locked = info?.writable === false

      return h('li', { className: 'dvr-card', 'data-open': expanded || undefined },
        h('button', { type: 'button', className: 'dvr-head', 'aria-expanded': expanded, onClick: () => setExpanded(value => !value) },
          h('span', { className: 'dvr-headText' },
            h('span', { className: 'dvr-title' }, copy.title),
            h('span', { className: 'dvr-description' }, copy.description)),
          h('span', { className: 'dvr-status', 'data-configured': info?.configured || undefined }, status),
          h('span', { className: 'dvr-chevron', 'data-open': expanded || undefined }, h(Chevron))),
        !expanded ? null : h('div', { className: 'dvr-body' },
          locked ? h('p', { className: 'dvr-readonly', role: 'status' }, copy.readOnly) : null,
          h('label', { className: 'dvr-label', htmlFor: 'dvr-api-key' }, copy.key),
          h('input', {
            id: 'dvr-api-key', className: 'dvr-input', type: 'password', autoComplete: 'off',
            value: key, disabled: locked || busy, onChange: event => setKey(event.target.value),
          }),
          h('p', { className: 'dvr-hint' }, copy.hint),
          message === '' ? null : h('p', { className: 'dvr-message', role: 'status' }, message),
          error === '' ? null : h('p', { className: 'dvr-error', role: 'alert' }, error),
          h('div', { className: 'dvr-actions' },
            h('button', {
              type: 'button', className: 'dvr-button dvr-button-danger',
              disabled: busy || locked || info?.configured !== true, onClick: () => { void remove() },
            }, copy.remove),
            h('button', {
              type: 'button', className: 'dvr-button dvr-button-primary',
              disabled: busy || locked || key.trim() === '', onClick: () => { void save() },
            }, busy ? copy.saving : copy.save))))
    }

    function apply(ctx) {
      const slots = ctx.get('slots')
      const connection = ctx.get('connection')
      const locale = ctx.get('locale')
      const remote = ctx.get('remote')
      if (slots === undefined || connection === undefined || locale === undefined || remote === undefined) return

      ctx.effect(installStyles, 'dsh-deepseek-vision-router: credential card styles')
      const listeners = new Set()
      const subscribeCredential = listener => { listeners.add(listener); return () => listeners.delete(listener) }
      ctx.effect(() => remote.$on('credentials/updated', ref => {
        if (ref === REF) for (const listener of listeners) listener()
      }), 'dsh-deepseek-vision-router: credential updates')
      slots.inject('settings.plugin.item', () => slots.register({
        name: 'settings.plugin.item', id: 'deepseek-vision', order: 25,
        inject: () => ({ api: connection.api, locale, subscribeCredential }),
      }, CredentialCard))
    }

    return { apply }
  },
})
