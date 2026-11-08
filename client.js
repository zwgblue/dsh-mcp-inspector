window.__ModuleLoader__.load({
  id: 'dsh-mcp-inspector',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'mcpInspector';
    const PANEL_ID = 'mcp-inspector';
    const ENDPOINT = '/mcp-inspector/servers';
    const TOGGLE_ENDPOINT = '/mcp-inspector/toggle';
    const POLL_MS = 15000;
    const MAX_AUTO_EXPAND = 1;

    const DICTIONARIES = {
      en: {
        panel: 'MCP servers',
        title: 'MCP servers',
        subtitle: 'Configured servers, their availability, and the methods each one exposes to the agent.',
        refresh: 'Refresh',
        refreshing: 'Refreshing…',
        loading: 'Reading MCP servers…',
        error: 'Could not read the MCP server inventory.',
        retry: 'Try again',
        servers: 'Servers',
        connected: 'Connected',
        methods: 'Methods',
        expandAll: 'Expand all',
        collapseAll: 'Collapse all',
        updated: 'Updated',
        noServers: 'No MCP server is configured yet.',
        noServersHint: 'Add one row per server through @deepseek-ai/dsh-mcp-client in the profile cordis.patch.yml, then reload this page.',
        noTools: 'This server publishes no tools.',
        noToolsEmpty: 'The entry is active but no tool is registered yet — the server may still be connecting or may expose no tools.',
        noToolsDisabled: 'This entry is inactive, so none of its methods are available.',
        noToolsError: 'The entry failed to load.',
        noToolsRuntime: 'No tools are registered for this server right now.',
        noParams: 'No parameters',
        requiredParams: 'Required parameters',
        statusConnected: 'Connected',
        statusRuntime: 'Runtime-registered',
        statusEmpty: 'No tools yet',
        statusDisabled: 'Disabled',
        statusError: 'Failed',
        statusUnknown: 'Unknown',
        inferred: 'Availability is inferred from the methods currently registered by each server. Expand a server to read every method and its description.',
        routeNote: 'Read-only view of the live Host inventory.',
        configTitle: 'Configuration',
        transport: 'Transport',
        command: 'Command',
        args: 'Arguments',
        cwd: 'Working directory',
        url: 'Endpoint URL',
        headers: 'Headers',
        env: 'Environment',
        toolCallTimeout: 'Call timeout',
        maxInstruction: 'Instruction cap',
        failStartup: 'Startup failure',
        failStartupFail: 'Rejects plugin activation',
        failStartupIgnore: 'Logs and keeps running',
        reconnect: 'Reconnect',
        reconnectOn: 'on',
        reconnectOff: 'off',
        attempts: 'attempts',
        entryId: 'Entry id',
        never: 'Not set',
        maskedNote: 'Names only — values are hidden because they may hold credentials.',
        runtimeOnly: 'This server is registered at runtime, so it has no configured entry to show.',
        methodsTitle: 'Methods',
        toggleAria: 'Enable or disable this server',
        toggleFailed: 'Could not change this server',
        toggleRestart: 'Saved; it takes effect after a restart.',
        toggleOffHint: 'Switched off — its configuration row stays in the profile.',
      },
      zh: {
        panel: 'MCP 服务器',
        title: 'MCP 服务器',
        subtitle: '当前已配置的服务器、可用状态，以及每个服务器向智能体提供的方法。',
        refresh: '刷新',
        refreshing: '正在刷新…',
        loading: '正在读取 MCP 服务器…',
        error: '无法读取 MCP 服务器清单。',
        retry: '重试',
        servers: '服务器',
        connected: '已连接',
        methods: '方法',
        expandAll: '全部展开',
        collapseAll: '全部收起',
        updated: '更新于',
        noServers: '还没有配置 MCP 服务器。',
        noServersHint: '在 profile 的 cordis.patch.yml 中通过 @deepseek-ai/dsh-mcp-client 为每个服务器添加一行，然后重新加载本页。',
        noTools: '该服务器没有对外提供方法。',
        noToolsEmpty: '配置项已激活，但尚未注册任何方法——服务器可能仍在连接，或未提供工具。',
        noToolsDisabled: '该配置项未启用，因此它的方法都不可用。',
        noToolsError: '该配置项加载失败。',
        noToolsRuntime: '该服务器当前没有注册任何方法。',
        noParams: '无参数',
        requiredParams: '必填参数',
        statusConnected: '已连接',
        statusRuntime: '运行时注册',
        statusEmpty: '暂无方法',
        statusDisabled: '已停用',
        statusError: '加载失败',
        statusUnknown: '未知',
        inferred: '可用状态根据各服务器当前注册的方法推断；展开服务器可查看全部方法及其描述。',
        routeNote: '只读展示 Host 侧的实时清单。',
        configTitle: '配置详情',
        transport: '传输方式',
        command: '命令',
        args: '启动参数',
        cwd: '工作目录',
        url: '端点 URL',
        headers: '请求头',
        env: '环境变量',
        toolCallTimeout: '调用超时',
        maxInstruction: '指令上限',
        failStartup: '启动失败策略',
        failStartupFail: '使插件激活失败',
        failStartupIgnore: '仅记录日志并继续运行',
        reconnect: '自动重连',
        reconnectOn: '开启',
        reconnectOff: '关闭',
        attempts: '次',
        entryId: '配置项 id',
        never: '未设置',
        maskedNote: '仅显示名称，值已隐藏（可能包含凭据）。',
        runtimeOnly: '该服务器在运行时注册，没有可读取的配置项。',
        methodsTitle: '方法',
        toggleAria: '启用或停用该服务器',
        toggleFailed: '无法切换该服务器',
        toggleRestart: '已保存，将在重启后生效。',
        toggleOffHint: '已关闭；配置行仍保留在 profile 中。',
      },
    };

    const FALLBACK = DICTIONARIES.en;

    const STATUS = {
      connected: { tone: 'success', key: 'statusConnected' },
      runtime: { tone: 'success', key: 'statusRuntime' },
      empty: { tone: 'warn', key: 'statusEmpty' },
      disabled: { tone: 'idle', key: 'statusDisabled' },
      error: { tone: 'error', key: 'statusError' },
      unknown: { tone: 'idle', key: 'statusUnknown' },
    };

    const CSS = `
.mcpi-root {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  flex: 1 1 auto;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
}
/* The one scroll container. A stable gutter means expanding or collapsing a
   server never adds or removes scrollbar width (no sideways shift of the whole
   page), and scroll anchoring is off so growing content below the fold cannot
   yank the viewport while you are reading. */
.mcpi-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
  overflow-anchor: none;
  overscroll-behavior: contain;
}
.mcpi-inner {
  box-sizing: border-box;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: calc(var(--dsh-frame-top-clearance, 0px) + 20px) 28px 56px;
}
.mcpi-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.mcpi-title {
  margin: 0;
  font-size: 18px;
  line-height: 26px;
  font-weight: 600;
}
.mcpi-subtitle {
  margin: 5px 0 0;
  max-width: 62ch;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--dsw-alias-label-secondary);
}
.mcpi-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}
.mcpi-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.mcpi-button:hover { background: var(--dsw-alias-bg-layer-2); }
.mcpi-button:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.mcpi-button[disabled] { opacity: .55; cursor: default; }
.mcpi-toolbar .mcpi-button {
  min-width: 84px;
  justify-content: center;
}
/* A refresh keeps its label and icon slot so the toolbar never reflows; the
   busy state is a spinning glyph plus aria-busy, not a wider label. */
.mcpi-refresh-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
}
.mcpi-button[data-busy="true"] { cursor: progress; }
.mcpi-button[data-busy="true"] .mcpi-refresh-icon { animation: mcpi-spin .9s linear infinite; }
@keyframes mcpi-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .mcpi-button[data-busy="true"] .mcpi-refresh-icon { animation: none; }
}
.mcpi-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
.mcpi-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}
.mcpi-stat {
  min-width: 96px;
  padding: 9px 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
}
.mcpi-stat-value {
  font-size: 17px;
  line-height: 22px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.mcpi-stat-label {
  margin-top: 1px;
  font-size: 11.5px;
  color: var(--dsw-alias-label-secondary);
}
.mcpi-updated {
  margin-left: auto;
  align-self: flex-end;
  font-size: 11.5px;
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
}
.mcpi-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 18px;
}
.mcpi-server {
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1);
  overflow: hidden;
}
.mcpi-server-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 6px 14px;
}
.mcpi-server-head:hover { background: var(--dsw-alias-bg-layer-2); }
.mcpi-server-toggle {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 5px 0;
  border: 0;
  border-radius: 6px;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.mcpi-server-toggle:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
.mcpi-switch {
  position: relative;
  flex: none;
  width: 28px;
  height: 16px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--dsw-alias-border-l2);
  cursor: pointer;
  transition: background-color .12s ease;
}
.mcpi-switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--dsw-static-neutral-00, var(--dsw-alias-bg-base));
  transition: transform .12s ease;
}
.mcpi-switch[data-on="true"] {
  background: var(--dsw-static-deepseek-500, var(--dsw-alias-state-success-primary));
}
body[data-ds-dark-theme] .mcpi-switch[data-on="true"] {
  background: var(--dsw-static-deepseek-400, var(--dsw-static-deepseek-500));
}
.mcpi-switch[data-on="true"]::after { transform: translateX(12px); }
.mcpi-switch:disabled { opacity: .5; cursor: default; }
.mcpi-switch:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
.mcpi-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dsw-alias-state-idle-primary);
}
.mcpi-dot[data-tone="success"] { background: var(--dsw-alias-state-success-primary); }
.mcpi-dot[data-tone="warn"] { background: var(--dsw-alias-state-warn-primary); }
.mcpi-dot[data-tone="error"] { background: var(--dsw-alias-state-error-primary); }
.mcpi-server-name {
  font-size: 13px;
  font-weight: 600;
  font-family: var(--dsh-font-family-monospace, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
}
.mcpi-badge {
  flex: none;
  padding: 1px 7px;
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
  color: var(--dsw-alias-state-idle-primary);
}
.mcpi-badge[data-tone="success"] { color: var(--dsw-alias-state-success-primary); }
.mcpi-badge[data-tone="warn"] { color: var(--dsw-alias-state-warn-primary); }
.mcpi-badge[data-tone="error"] { color: var(--dsw-alias-state-error-primary); }
/* Transport badges need a real hue: the alias brand token is the near-black
   neutral accent, so they read the themed design palette instead (same tag
   geometry and border treatment, different accent per transport). */
.mcpi-badge[data-tone="transport-stdio"] { color: var(--dsw-static-deepseek-500, var(--dsw-alias-label-primary)); }
.mcpi-badge[data-tone="transport-http"] { color: var(--dsw-static-violet-600, var(--dsw-alias-label-primary)); }
body[data-ds-dark-theme] .mcpi-badge[data-tone="transport-stdio"] { color: var(--dsw-static-deepseek-400, var(--dsw-static-deepseek-500)); }
body[data-ds-dark-theme] .mcpi-badge[data-tone="transport-http"] { color: var(--dsw-static-violet-400, var(--dsw-static-violet-600)); }
.mcpi-chevron {
  flex: none;
  margin-left: auto;
  display: inline-flex;
  color: var(--dsw-alias-label-secondary);
  transition: transform .12s ease;
}
.mcpi-chevron[data-open="true"] { transform: rotate(90deg); }
.mcpi-tools {
  padding: 2px 14px 10px;
  border-top: 1px solid var(--dsw-alias-border-l1);
}
.mcpi-tool {
  padding: 11px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.mcpi-tool:last-child { border-bottom: 0; padding-bottom: 4px; }
.mcpi-tool-name {
  font-size: 12.5px;
  font-family: var(--dsh-font-family-monospace, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  word-break: break-all;
}
.mcpi-tool-desc {
  margin: 4px 0 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--dsw-alias-label-secondary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.mcpi-params {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 7px;
}
.mcpi-param {
  padding: 1px 6px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 5px;
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-secondary);
  font-family: var(--dsh-font-family-monospace, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
}
.mcpi-param[data-required="true"] {
  border-color: var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-primary);
}
.mcpi-param-type { opacity: .7; }
.mcpi-detail { padding: 12px 0 2px; }
.mcpi-section-title {
  margin: 12px 0 0;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--dsw-alias-label-secondary);
}
.mcpi-config {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 5px 16px;
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
}
.mcpi-config-key {
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
}
.mcpi-config-value {
  min-width: 0;
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsh-font-family-monospace, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.mcpi-config-value[data-muted="true"] { color: var(--dsw-alias-label-secondary); }
.mcpi-config-line { display: block; }
.mcpi-config-mask {
  margin-top: 7px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}
.mcpi-message {
  margin-top: 18px;
  padding: 14px 16px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1);
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--dsw-alias-label-secondary);
}
.mcpi-message[data-tone="error"] {
  border-color: var(--dsw-alias-state-error-primary);
  color: var(--dsw-alias-label-primary);
}
.mcpi-message strong { color: var(--dsw-alias-label-primary); }
.mcpi-failure {
  margin-top: 6px;
  font-size: 12px;
  color: var(--dsw-alias-state-error-primary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.mcpi-note {
  margin: 22px 0 0;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--dsw-alias-label-secondary);
}
.mcpi-note p { margin: 0 0 4px; }
.mcpi-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
}
`;

    function translateWith(dictionary) {
      return (key) => (dictionary && dictionary[key]) || FALLBACK[key] || key;
    }

    function endpointUrl(path) {
      const target = typeof path === 'string' ? path : ENDPOINT;
      if (typeof window === 'undefined') return target;
      if (window.location.protocol !== 'file:') return target;
      const transport = window.__DSH_TRANSPORT__;
      const base = transport && typeof transport.streamBaseUrl === 'string' ? transport.streamBaseUrl : '';
      if (/^https?:/i.test(base)) return `${base.replace(/\/+$/, '')}${target}`;
      return target;
    }

    /** Sidebar glyph: two stacked server slots; the sidebar supplies `size`. */
    function PanelIcon(props) {
      const size = typeof props?.size === 'number' ? props.size : 16;
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 16 16',
        fill: 'none',
        'aria-hidden': true,
        focusable: false,
      },
        h('rect', { x: 1.9, y: 2.4, width: 12.2, height: 4.4, rx: 1.3, stroke: 'currentColor', strokeWidth: 1.2 }),
        h('rect', { x: 1.9, y: 9.2, width: 12.2, height: 4.4, rx: 1.3, stroke: 'currentColor', strokeWidth: 1.2 }),
        h('circle', { cx: 4.4, cy: 4.6, r: 0.85, fill: 'currentColor' }),
        h('circle', { cx: 4.4, cy: 11.4, r: 0.85, fill: 'currentColor' }));
    }

    function StatusBadge(props) {
      const meta = STATUS[props.status] || STATUS.unknown;
      return h('span', {
        className: 'mcpi-badge',
        'data-tone': meta.tone,
      }, props.t(meta.key));
    }

    function formatUpdated(t, generatedAt) {
      if (typeof generatedAt !== 'string') return '';
      const at = new Date(generatedAt);
      if (Number.isNaN(at.getTime())) return '';
      const time = at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `${t('updated')} ${time}`;
    }

    function emptyToolsMessage(t, server) {
      if (server.status === 'disabled') return t('noToolsDisabled');
      if (server.status === 'error') return t('noToolsError');
      if (server.status === 'empty') return t('noToolsEmpty');
      if (server.status === 'runtime') return t('noToolsRuntime');
      return t('noTools');
    }

    function formatBytes(bytes) {
      if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return '';
      if (bytes >= 1024) {
        const kib = bytes / 1024;
        const text = Number.isInteger(kib) ? String(kib) : kib.toFixed(1);
        return `${text} KiB`;
      }
      return `${bytes} B`;
    }

    function namesText(t, names) {
      if (!Array.isArray(names) || names.length === 0) return null;
      return `${names.join(', ')} · ${t('maskedNote')}`;
    }

    function reconnectText(t, reconnect) {
      if (!reconnect) return null;
      const parts = [t(reconnect.enabled ? 'reconnectOn' : 'reconnectOff')];
      if (typeof reconnect.maxAttempts === 'number') parts.push(`${reconnect.maxAttempts} ${t('attempts')}`);
      const delays = [];
      if (typeof reconnect.initialDelayMs === 'number') delays.push(`${reconnect.initialDelayMs} ms`);
      if (typeof reconnect.maxDelayMs === 'number') delays.push(`${reconnect.maxDelayMs} ms`);
      if (delays.length === 2) parts.push(`${delays[0]} → ${delays[1]}`);
      else if (delays.length === 1) parts.push(delays[0]);
      return parts.join(' · ');
    }

    /** Expanded configuration of one server: target, policy, and entry. */
    function ConfigDetail(props) {
      const t = props.t;
      const server = props.server;
      const detail = server.detail;
      if (!detail) {
        return h('div', { className: 'mcpi-detail' },
          h('div', { className: 'mcpi-section-title' }, t('configTitle')),
          h('div', { className: 'mcpi-config-mask' }, t('runtimeOnly')));
      }
      const rows = [];
      const add = (label, value, muted) => {
        if (value === null || value === undefined || value === '') return;
        rows.push(h('div', { className: 'mcpi-config-key', key: `key-${label}` }, label));
        rows.push(h('div', {
          className: 'mcpi-config-value',
          key: `value-${label}`,
          'data-muted': muted === true ? 'true' : 'false',
        }, value));
      };
      if (detail.command) add(t('command'), detail.command);
      if (Array.isArray(detail.args) && detail.args.length > 0) {
        add(t('args'), h('span', null, detail.args.map((arg, index) => h('span', {
          className: 'mcpi-config-line',
          key: index,
        }, arg))));
      }
      if (detail.cwd) add(t('cwd'), detail.cwd);
      if (detail.url) add(t('url'), detail.url);
      const headers = namesText(t, detail.headerNames);
      if (headers) add(t('headers'), headers, true);
      const env = namesText(t, detail.envNames);
      if (env) add(t('env'), env, true);
      if (typeof detail.toolCallTimeoutMs === 'number') add(t('toolCallTimeout'), `${detail.toolCallTimeoutMs} ms`);
      if (typeof detail.maxInstructionBytes === 'number') add(t('maxInstruction'), formatBytes(detail.maxInstructionBytes));
      if (typeof detail.failOnStartupError === 'boolean') {
        add(t('failStartup'), t(detail.failOnStartupError ? 'failStartupFail' : 'failStartupIgnore'));
      }
      const reconnect = reconnectText(t, detail.reconnect);
      if (reconnect) add(t('reconnect'), reconnect);
      if (server.entryId) add(t('entryId'), server.entryId);
      return h('div', { className: 'mcpi-detail' },
        h('div', { className: 'mcpi-section-title' }, t('configTitle')),
        rows.length > 0
          ? h('div', { className: 'mcpi-config' }, rows)
          : h('div', { className: 'mcpi-config-mask' }, t('never')));
    }

    function ToolRow(props) {
      const tool = props.tool;
      const properties = tool.parameters && Array.isArray(tool.parameters.properties) ? tool.parameters.properties : [];
      return h('div', { className: 'mcpi-tool' },
        h('div', { className: 'mcpi-tool-name' }, tool.name),
        tool.description ? h('p', { className: 'mcpi-tool-desc' }, tool.description) : null,
        properties.length > 0
          ? h('div', { className: 'mcpi-params' }, properties.map((property) => h('span', {
              key: property.name,
              className: 'mcpi-param',
              'data-required': property.required ? 'true' : 'false',
            },
              property.name,
              h('span', { className: 'mcpi-param-type' }, `: ${property.type}`))))
          : null);
    }

    function ServerRow(props) {
      const server = props.server;
      const t = props.t;
      const open = props.expanded === true;
      const toolCount = typeof server.toolCount === 'number' ? server.toolCount : 0;
      const toolsId = `mcpi-tools-${String(server.name).replace(/[^A-Za-z0-9_-]/g, '_')}`;
      const dot = STATUS[server.status] || STATUS.unknown;
      const switchOn = server.rowEnabled === true;
      const pending = props.switchPending === true;
      return h('section', { className: 'mcpi-server' },
        h('div', { className: 'mcpi-server-head' },
          h('button', {
            type: 'button',
            className: 'mcpi-server-toggle',
            'aria-expanded': open ? 'true' : 'false',
            'aria-controls': toolsId,
            onClick: props.onToggle,
          },
            h('span', { className: 'mcpi-dot', 'data-tone': dot.tone, 'aria-hidden': true }),
            h('span', { className: 'mcpi-server-name' }, server.name),
            h(StatusBadge, { status: server.status, t }),
            typeof server.transport === 'string' && server.transport !== '' && server.transport !== 'runtime' && server.transport !== 'unknown'
              ? h('span', {
                  className: 'mcpi-badge',
                  'data-tone': server.transport === 'streamable-http' ? 'transport-http' : 'transport-stdio',
                  'data-transport': server.transport,
                }, server.transport)
              : null,
            h('span', { className: 'mcpi-chevron', 'data-open': open ? 'true' : 'false', 'aria-hidden': true },
              h('svg', { width: 12, height: 12, viewBox: '0 0 12 12', fill: 'none', focusable: false },
                h('path', { d: 'M4.25 2.25 8.5 6l-4.25 3.75', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' })))),
          server.canToggle === true
            ? h('button', {
                type: 'button',
                className: 'mcpi-switch',
                role: 'switch',
                'aria-checked': switchOn ? 'true' : 'false',
                'aria-label': `${t('toggleAria')}: ${server.name}`,
                'data-on': switchOn ? 'true' : 'false',
                disabled: pending,
                onClick: props.onToggleEnabled,
              })
            : null),
        open
          ? h('div', { className: 'mcpi-tools', id: toolsId },
              h(ConfigDetail, { t, server }),
              h('div', { className: 'mcpi-section-title' }, `${t('methodsTitle')} · ${toolCount}`),
              Array.isArray(server.tools) && server.tools.length > 0
                ? server.tools.map((tool) => h(ToolRow, { key: tool.publicName || tool.name, tool, t }))
                : h('div', { className: 'mcpi-message' },
                    h('div', null, emptyToolsMessage(t, server)),
                    typeof server.failure === 'string' && server.failure !== ''
                      ? h('div', { className: 'mcpi-failure' }, server.failure)
                      : null))
          : null);
    }

    function McpInspectorPage(props) {
      const t = typeof props?.t === 'function' ? props.t : translateWith(FALLBACK);
      const locale = props && props.locale;
      const [state, setState] = React.useState({ phase: 'loading', data: null, error: null });
      const [expanded, setExpanded] = React.useState({});
      const [refreshing, setRefreshing] = React.useState(false);
      const [refreshKey, setRefreshKey] = React.useState(0);
      const [pendingToggle, setPendingToggle] = React.useState({});
      const [toggleMessage, setToggleMessage] = React.useState(null);
      const autoExpanded = React.useRef(false);
      const delayedRefresh = React.useRef(undefined);
      const refreshBusySince = React.useRef(0);
      const refreshEndTimer = React.useRef(undefined);

      React.useEffect(() => () => {
        clearTimeout(delayedRefresh.current);
        clearTimeout(refreshEndTimer.current);
      }, []);

      /**
       * End the busy state, but keep the spinner up for at least 500 ms so a fast
       * response reads as a refresh rather than a flicker. A polled load that
       * finishes while no refresh is running ends it immediately (it is already off).
       */
      const endRefreshing = () => {
        const remaining = 500 - (Date.now() - refreshBusySince.current);
        clearTimeout(refreshEndTimer.current);
        if (remaining > 0) {
          refreshEndTimer.current = window.setTimeout(() => setRefreshing(false), remaining);
          return;
        }
        setRefreshing(false);
      };

      React.useEffect(() => {
        if (!locale || typeof locale.subscribe !== 'function') return undefined;
        return locale.subscribe(() => {
          setExpanded((current) => ({ ...current }));
        });
      }, [locale]);

      React.useEffect(() => {
        let alive = true;
        const controller = new AbortController();
        const load = async () => {
          try {
            const response = await fetch(endpointUrl(), {
              signal: controller.signal,
              cache: 'no-store',
              headers: { accept: 'application/json' },
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (!alive) return;
            setState({ phase: 'ready', data, error: null });
            endRefreshing();
            if (!autoExpanded.current) {
              autoExpanded.current = true;
              const servers = data && Array.isArray(data.servers) ? data.servers : [];
              if (servers.length > 0 && servers.length <= MAX_AUTO_EXPAND) {
                setExpanded({ [servers[0].name]: true });
              }
            }
          } catch (error) {
            if (!alive || controller.signal.aborted) return;
            setState({ phase: 'error', data: null, error: error instanceof Error ? error.message : String(error) });
            endRefreshing();
          }
        };
        load();
        const timer = setInterval(load, POLL_MS);
        return () => {
          alive = false;
          controller.abort();
          clearInterval(timer);
        };
      }, [refreshKey]);

      const servers = state.data && Array.isArray(state.data.servers) ? state.data.servers : [];
      const connectedCount = servers.filter((server) => server.status === 'connected' || server.status === 'runtime').length;
      const methodTotal = servers.reduce((total, server) => total + (typeof server.toolCount === 'number' ? server.toolCount : 0), 0);
      const allExpanded = servers.length > 0 && servers.every((server) => expanded[server.name] === true);

      const refresh = () => {
        refreshBusySince.current = Date.now();
        setRefreshing(true);
        setRefreshKey((value) => value + 1);
      };
      const toggle = (name) => {
        setExpanded((current) => ({ ...current, [name]: current[name] !== true }));
      };
      const toggleEnabled = async (server) => {
        if (server.canToggle !== true || typeof server.toggleId !== 'string') return;
        const nextEnabled = server.rowEnabled !== true;
        setPendingToggle((current) => ({ ...current, [server.name]: true }));
        setToggleMessage(null);
        try {
          const response = await fetch(endpointUrl(TOGGLE_ENDPOINT), {
            method: 'POST',
            cache: 'no-store',
            headers: {
              'content-type': 'application/json',
              'x-mcp-inspector-action': 'toggle',
            },
            body: JSON.stringify({ entryId: server.toggleId, enabled: nextEnabled }),
          });
          const payload = await response.json().catch(() => null);
          if (!response.ok || !payload || payload.ok !== true) {
            const detail = payload && typeof payload.error === 'string' ? payload.error : `HTTP ${response.status}`;
            throw new Error(detail);
          }
          const result = payload.result || {};
          if (result.application !== undefined && result.application !== 'applied') {
            setToggleMessage(typeof result.nextStep === 'string' && result.nextStep !== ''
              ? result.nextStep
              : t('toggleRestart'));
          }
          setRefreshKey((value) => value + 1);
          clearTimeout(delayedRefresh.current);
          delayedRefresh.current = window.setTimeout(() => {
            setRefreshKey((value) => value + 1);
          }, 2500);
        } catch (error) {
          setToggleMessage(`${t('toggleFailed')}: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
          setPendingToggle((current) => {
            if (current[server.name] !== true) return current;
            const next = { ...current };
            delete next[server.name];
            return next;
          });
        }
      };
      const toggleAll = () => {
        if (allExpanded) {
          setExpanded({});
          return;
        }
        const next = {};
        for (const server of servers) next[server.name] = true;
        setExpanded(next);
      };

      const header = h('div', { className: 'mcpi-head' },
        h('div', null,
          h('h1', { className: 'mcpi-title' }, t('title')),
          h('p', { className: 'mcpi-subtitle' }, t('subtitle'))),
        h('div', { className: 'mcpi-toolbar' },
          servers.length > 1
            ? h('button', {
                type: 'button',
                className: 'mcpi-button',
                onClick: toggleAll,
              }, allExpanded ? t('collapseAll') : t('expandAll'))
            : null,
          h('button', {
            type: 'button',
            className: 'mcpi-button',
            onClick: refresh,
            disabled: refreshing,
            'data-busy': refreshing ? 'true' : 'false',
            'aria-busy': refreshing ? 'true' : 'false',
            title: refreshing ? t('refreshing') : t('refresh'),
          },
            h('span', { className: 'mcpi-refresh-icon', 'aria-hidden': true },
              h('svg', { width: 12, height: 12, viewBox: '0 0 12 12', fill: 'none', focusable: false },
                h('path', {
                  d: 'M9.6 6a3.6 3.6 0 1 1-1.05-2.55',
                  stroke: 'currentColor',
                  strokeWidth: 1.2,
                  strokeLinecap: 'round',
                }),
                h('path', {
                  d: 'M9.35 1.5v2.2h-2.2',
                  stroke: 'currentColor',
                  strokeWidth: 1.2,
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                }))),
            h('span', null, t('refresh')),
            refreshing ? h('span', { className: 'mcpi-sr-only' }, t('refreshing')) : null)));

      let body;
      if (state.phase === 'error') {
        body = h('div', { className: 'mcpi-message', 'data-tone': 'error' },
          h('strong', null, t('error')),
          h('div', { className: 'mcpi-failure' }, state.error || ''),
          h('div', { className: 'mcpi-hint' },
            h('button', { type: 'button', className: 'mcpi-button', onClick: refresh }, t('retry'))));
      } else if (state.phase === 'loading') {
        body = h('div', { className: 'mcpi-message' }, t('loading'));
      } else if (servers.length === 0) {
        body = h('div', { className: 'mcpi-message' },
          h('strong', null, t('noServers')),
          h('div', { className: 'mcpi-hint' }, t('noServersHint')));
      } else {
        body = h('div', { className: 'mcpi-list' },
          servers.map((server) => h(ServerRow, {
            key: server.name,
            server,
            t,
            expanded: expanded[server.name] === true,
            switchPending: pendingToggle[server.name] === true,
            onToggle: () => toggle(server.name),
            onToggleEnabled: () => toggleEnabled(server),
          })));
      }

      const stats = state.phase === 'ready' && servers.length > 0
        ? h('div', { className: 'mcpi-stats' },
            h('div', { className: 'mcpi-stat' },
              h('div', { className: 'mcpi-stat-value' }, String(servers.length)),
              h('div', { className: 'mcpi-stat-label' }, t('servers'))),
            h('div', { className: 'mcpi-stat' },
              h('div', { className: 'mcpi-stat-value' }, String(connectedCount)),
              h('div', { className: 'mcpi-stat-label' }, t('connected'))),
            h('div', { className: 'mcpi-stat' },
              h('div', { className: 'mcpi-stat-value' }, String(methodTotal)),
              h('div', { className: 'mcpi-stat-label' }, t('methods'))),
            h('div', { className: 'mcpi-updated' }, formatUpdated(t, state.data && state.data.generatedAt)))
        : null;

      const notes = [];
      if (state.phase === 'ready') {
        if (state.data && Array.isArray(state.data.notes)) {
          for (const note of state.data.notes) if (typeof note === 'string' && note !== '') notes.push(note);
        }
        notes.push(t('inferred'));
      }

      return h('div', { className: 'mcpi-root' },
        h('style', null, CSS),
        h('div', { className: 'mcpi-scroll' },
          h('div', { className: 'mcpi-inner' },
            header,
            stats,
            toggleMessage
              ? h('div', { className: 'mcpi-message', 'data-tone': 'error' }, toggleMessage)
              : null,
            body,
            notes.length > 0
              ? h('div', { className: 'mcpi-note' },
                  notes.map((note, index) => h('p', { key: `note-${index}` }, note)),
                  h('p', null, t('routeNote')))
              : null)));
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(
          () => ctx.locale.register(NS, { en: DICTIONARIES.en, zh: DICTIONARIES.zh }),
          'mcp-inspector: dictionaries',
        );
        const translate = ctx.locale.bind(NS);
        const panelProps = { t: translate, locale: ctx.locale };
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
          inject: () => panelProps,
        }, McpInspectorPage));
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 10,
          label: () => translate('panel'),
        }, PanelIcon));
      },
    };
  },
});
