window.__ModuleLoader__.load({
  id: 'dsh-deepseek-vision-router',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement
    const NS = 'deepseek-vision-router'
    const RPC_CHANNEL = '/dsh-vision-router'
    const ROUTER = 'deepseek-vision'
    const DEFAULT_MODEL = 'mimo-v2.5'

    const COPY = {
      zh: {
        title: 'DeepSeek 视觉',
        description: '选择用于图片分析的模型提供方',
        provider: '视觉提供方',
        providerPlaceholder: '请选择提供方',
        providerHint: '提供方、端点和密钥请在“设置 → 模型”中新增、修改或删除。',
        model: '视觉模型',
        modelHint: '默认使用 MiMo；也可输入所选提供方支持的其他模型 ID。',
        loading: '正在读取配置…',
        unconfigured: '未选择提供方',
        unavailable: '已不可用',
        readOnly: '当前设置存储为只读，无法保存修改。',
        save: '保存',
        saving: '保存中…',
        saved: '视觉提供方和模型已保存，下一次图片请求立即生效。',
      },
      en: {
        title: 'DeepSeek Vision',
        description: 'Select the model provider used for image analysis',
        provider: 'Vision provider',
        providerPlaceholder: 'Select a provider',
        providerHint: 'Add, edit, or remove providers, endpoints, and credentials in Settings → Models.',
        model: 'Vision model',
        modelHint: 'MiMo is the default; you may enter another model ID supported by the selected provider.',
        loading: 'Reading configuration…',
        unconfigured: 'No provider selected',
        unavailable: 'unavailable',
        readOnly: 'The settings store is read-only, so changes cannot be saved.',
        save: 'Save',
        saving: 'Saving…',
        saved: 'Vision provider and model saved for the next image request.',
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
.dvr-actions{display:flex;justify-content:flex-end;padding-top:4px}.dvr-button{border:1px solid transparent;border-radius:8px;padding:5px 14px;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);font:inherit;font-size:13px;cursor:pointer}
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

    function SelectionCard({ connection, locale, subscribeConfig }) {
      const api = connection.api
      const localeSnapshot = React.useSyncExternalStore(
        locale.subscribe.bind(locale),
        locale.getSnapshot.bind(locale),
        locale.getSnapshot.bind(locale),
      )
      const copy = localeSnapshot.active.toLowerCase().startsWith('zh') ? COPY.zh : COPY.en
      const [expanded, setExpanded] = React.useState(false)
      const [view, setView] = React.useState()
      const [groups, setGroups] = React.useState([])
      const [provider, setProvider] = React.useState('')
      const [model, setModel] = React.useState(DEFAULT_MODEL)
      const [busy, setBusy] = React.useState(false)
      const [message, setMessage] = React.useState('')
      const [error, setError] = React.useState('')

      const load = React.useCallback(async () => {
        try {
          const [settingsResult, modelsResponse] = await Promise.all([
            connection.rpc.call(RPC_CHANNEL, 'settings.get', {}),
            api.llm.models({}),
          ])
          if (!settingsResult.ok) throw new Error(settingsResult.error.message)
          if (!modelsResponse.result.ok) throw new Error(modelsResponse.result.error.message)
          const value = settingsResult.value ?? {}
          const nextProvider = typeof value.visionProvider === 'string' ? value.visionProvider : ''
          const nextModel = typeof value.visionModel === 'string' ? value.visionModel : DEFAULT_MODEL
          setView({ writable: value.writable !== false, value: { visionProvider: nextProvider, visionModel: nextModel } })
          setGroups(modelsResponse.result.value.groups.filter((group) => group.id !== ROUTER))
          setProvider(nextProvider)
          setModel(nextModel)
          setError('')
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : String(reason))
        }
      }, [api, connection])

      React.useEffect(() => {
        void load()
        return subscribeConfig(() => { void load() })
      }, [load, subscribeConfig])

      const save = async () => {
        const nextProvider = provider.trim()
        const nextModel = model.trim()
        if (nextProvider === '' || nextModel === '' || view === undefined) return
        setBusy(true); setMessage(''); setError('')
        try {
          const result = await connection.rpc.call(RPC_CHANNEL, 'settings.set', {
            visionProvider: nextProvider,
            visionModel: nextModel,
          })
          if (!result.ok) throw new Error(result.error.message)
          setView({ writable: result.value.writable !== false, value: { visionProvider: result.value.visionProvider, visionModel: result.value.visionModel } })
          setProvider(nextProvider)
          setModel(nextModel)
          setMessage(copy.saved)
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : String(reason))
        } finally {
          setBusy(false)
        }
      }

      const savedProvider = view?.value.visionProvider ?? ''
      const savedModel = view?.value.visionModel ?? DEFAULT_MODEL
      const savedGroup = groups.find((group) => group.id === savedProvider)
      const unavailable = savedProvider !== '' && savedGroup === undefined
      const status = view === undefined ? copy.loading
        : savedProvider === '' ? copy.unconfigured
          : `${savedGroup?.name ?? savedProvider}${unavailable ? ` (${copy.unavailable})` : ''} · ${savedModel}`
      const selectedGroup = groups.find((group) => group.id === provider)
      const dirty = view !== undefined && (provider.trim() !== savedProvider || model.trim() !== savedModel)

      return h('li', { className: 'dvr-card', 'data-open': expanded || undefined },
        h('button', { type: 'button', className: 'dvr-head', 'aria-expanded': expanded, onClick: () => setExpanded(value => !value) },
          h('span', { className: 'dvr-headText' },
            h('span', { className: 'dvr-title' }, copy.title),
            h('span', { className: 'dvr-description' }, copy.description)),
          h('span', { className: 'dvr-status', 'data-configured': savedProvider !== '' || undefined }, status),
          h('span', { className: 'dvr-chevron', 'data-open': expanded || undefined }, h(Chevron))),
        !expanded ? null : h('div', { className: 'dvr-body' },
          view?.writable === false ? h('p', { className: 'dvr-readonly', role: 'status' }, copy.readOnly) : null,
          h('label', { className: 'dvr-label', htmlFor: 'dvr-provider' }, copy.provider),
          h('select', {
            id: 'dvr-provider', className: 'dvr-input', value: provider, disabled: busy || view?.writable === false,
            onChange: event => { setProvider(event.target.value); setMessage('') },
          },
          h('option', { value: '' }, copy.providerPlaceholder),
          unavailable ? h('option', { value: savedProvider }, `${savedProvider} (${copy.unavailable})`) : null,
          ...groups.map((group) => h('option', { key: group.id, value: group.id }, group.name === group.id ? group.id : `${group.name} (${group.id})`))),
          h('p', { className: 'dvr-hint' }, copy.providerHint),
          h('label', { className: 'dvr-label', htmlFor: 'dvr-model' }, copy.model),
          h('input', {
            id: 'dvr-model', className: 'dvr-input', list: 'dvr-model-list', value: model,
            disabled: busy || view?.writable === false,
            onChange: event => { setModel(event.target.value); setMessage('') },
          }),
          h('datalist', { id: 'dvr-model-list' },
            ...(selectedGroup?.models ?? []).map((entry) => h('option', { key: entry.id, value: entry.id, label: entry.name }))),
          h('p', { className: 'dvr-hint' }, copy.modelHint),
          message === '' ? null : h('p', { className: 'dvr-message', role: 'status' }, message),
          error === '' ? null : h('p', { className: 'dvr-error', role: 'alert' }, error),
          h('div', { className: 'dvr-actions' },
            h('button', {
              type: 'button', className: 'dvr-button',
              disabled: busy || view?.writable === false || provider.trim() === '' || model.trim() === '' || !dirty,
              onClick: () => { void save() },
            }, busy ? copy.saving : copy.save))))
    }

    function apply(ctx) {
      const slots = ctx.get('slots')
      const connection = ctx.get('connection')
      const locale = ctx.get('locale')
      const remote = ctx.get('remote')
      if (slots === undefined || connection === undefined || locale === undefined || remote === undefined) return

      ctx.effect(installStyles, 'dsh-deepseek-vision-router: selection card styles')
      const listeners = new Set()
      const subscribeConfig = listener => { listeners.add(listener); return () => listeners.delete(listener) }
      const notify = () => { for (const listener of listeners) listener() }
      ctx.effect(() => {
        const disposers = [
          remote.$on('settings/document-updated', ns => { if (ns === NS) notify() }),
          remote.$on('llm/adapters-updated', notify),
        ]
        return () => { for (const dispose of disposers) dispose() }
      }, 'dsh-deepseek-vision-router: selection updates')
      slots.inject('settings.plugin.item', () => slots.register({
        name: 'settings.plugin.item', id: 'deepseek-vision', order: 25,
        inject: () => ({ connection, locale, subscribeConfig }),
      }, SelectionCard))
    }

    return { apply }
  },
})
