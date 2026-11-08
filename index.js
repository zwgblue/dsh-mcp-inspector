/**
 * Host half of the MCP inspector bundle.
 *
 * It serves one read-only JSON route on the existing Web server:
 *   GET /mcp-inspector/servers
 *
 * The payload is derived from live runtime state, never from the profile file:
 *   - configured servers come from the Loader entries of
 *     `@deepseek-ai/dsh-mcp-client` (the plugin that owns one row per server),
 *   - availability comes from the tools that server currently has registered,
 *   - methods and descriptions come from the registry's model-facing schemas.
 *
 * Secrets never leave the Host: only `serverName`, transport, the command
 * line or URL, and tool metadata are projected. `env` and `headers` are
 * deliberately omitted.
 */

export const inject = ['webServer'];

const ROUTE_PREFIX = '/mcp-inspector';
const SERVERS_PATH = `${ROUTE_PREFIX}/servers`;
const TOGGLE_PATH = `${ROUTE_PREFIX}/toggle`;
const MAX_TOGGLE_BODY_BYTES = 4096;
const MCP_CLIENT_PACKAGE = '@deepseek-ai/dsh-mcp-client';
const MCP_TOOL_PREFIX = 'mcp__';

/** Cordis fiber states: 2 is active, 3 failed. */
const FIBER_STATE_NAMES = ['pending', 'loading', 'active', 'failed', 'disposed'];

export function apply(ctx) {
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'prefix',
      path: ROUTE_PREFIX,
      resource: (request) => respond(ctx, request),
    }),
    'mcp-inspector: MCP server inventory route',
  );
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: TOGGLE_PATH,
      handler: (request, response) => handleToggle(ctx, request, response),
    }),
    'mcp-inspector: MCP server enable/disable route',
  );
}

/**
 * The profile plugin manager service, when this profile has one: it writes the
 * `disabled` override for one Loader row and applies it through the normal
 * reload path, so a toggle persists without touching the user's patch by hand.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @returns {((entryId: string, enabled: boolean) => Promise<unknown>) | undefined}
 */
function pluginToggler(ctx) {
  const manager = ctx.get('pluginManager');
  if (manager === undefined || manager === null) return undefined;
  if (typeof manager.setPluginEnabled !== 'function') return undefined;
  return (entryId, enabled) => manager.setPluginEnabled(entryId, enabled);
}

/**
 * Enable or disable one configured MCP server row.
 *
 * The request is a mutation, so it is accepted only from the plugin's own page:
 * a custom `x-mcp-inspector-action` header forces a CORS preflight that this
 * route never answers, which keeps a cross-site form from reaching it, and a
 * cross-site `sec-fetch-site` is refused as well. Only rows that the inventory
 * itself reports as MCP client entries may be toggled.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {import('node:http').IncomingMessage} request
 * @param {import('node:http').ServerResponse} response
 */
async function handleToggle(ctx, request, response) {
  const send = (status, body) => {
    response.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    });
    response.end(JSON.stringify(body));
  };
  if (request.method !== 'POST') {
    send(405, { ok: false, error: 'Method not allowed' });
    return;
  }
  if (request.headers['x-mcp-inspector-action'] !== 'toggle') {
    send(400, { ok: false, error: 'Missing the x-mcp-inspector-action: toggle header' });
    return;
  }
  const fetchSite = request.headers['sec-fetch-site'];
  if (typeof fetchSite === 'string' && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    send(403, { ok: false, error: 'Cross-site requests are not accepted' });
    return;
  }
  let payload;
  try {
    payload = JSON.parse(await readRequestBody(request, MAX_TOGGLE_BODY_BYTES));
  } catch (error) {
    send(400, { ok: false, error: `Invalid request body: ${messageOf(error)}` });
    return;
  }
  const entryId = isRecord(payload) && typeof payload.entryId === 'string' ? payload.entryId.trim() : '';
  const enabled = isRecord(payload) && payload.enabled === true
    ? true
    : isRecord(payload) && payload.enabled === false
      ? false
      : undefined;
  if (!/^[A-Za-z0-9._:@+-]{1,128}$/.test(entryId) || enabled === undefined) {
    send(400, { ok: false, error: 'Expected { entryId: string, enabled: boolean }' });
    return;
  }
  const known = readConfiguredServers(ctx, []).some((server) => server.toggleId === entryId);
  if (!known) {
    send(404, { ok: false, error: `No configured MCP server row named "${entryId}"` });
    return;
  }
  const toggle = pluginToggler(ctx);
  if (toggle === undefined) {
    send(501, { ok: false, error: 'Plugin management is unavailable in this profile' });
    return;
  }
  try {
    const result = await toggle(entryId, enabled);
    send(200, { ok: true, result: simplifyChangeResult(result) });
  } catch (error) {
    ctx.logger?.warn?.(error instanceof Error ? error : new Error(String(error)));
    send(500, { ok: false, error: messageOf(error) });
  }
}

/** Collect a bounded JSON request body. */
function readRequestBody(request, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let failed = false;
    request.on('data', (chunk) => {
      if (failed) return;
      size += chunk.length;
      if (size > limit) {
        failed = true;
        reject(new Error('request body is too large'));
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (!failed) resolve(Buffer.concat(chunks).toString('utf8'));
    });
    request.on('error', (error) => {
      if (failed) return;
      failed = true;
      reject(error);
    });
  });
}

/** Keep only the JSON-safe parts of a plugin manager change result. */
function simplifyChangeResult(result) {
  if (!isRecord(result)) return null;
  const out = {};
  for (const key of ['changed', 'application', 'stage', 'target', 'bundle', 'version']) {
    const value = result[key];
    if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') out[key] = value;
  }
  if (Array.isArray(result.warnings)) {
    out.warnings = result.warnings.filter((warning) => typeof warning === 'string');
  }
  if (isRecord(result.error)) {
    out.error = {
      code: typeof result.error.code === 'string' ? result.error.code : null,
      message: typeof result.error.message === 'string' ? result.error.message : null,
    };
  }
  if (typeof result.nextStep === 'string') out.nextStep = result.nextStep;
  return out;
}

/**
 * Answer one Fetch-style resource request from the Web server.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function respond(ctx, request) {
  let target;
  try {
    target = new URL(request.url);
  } catch {
    return json({ error: 'invalid request URL' }, 400, request);
  }
  if (target.pathname !== SERVERS_PATH) {
    return json({ error: 'not found' }, 404, request);
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json({ error: 'method not allowed' }, 405, request);
  }
  try {
    return json(collect(ctx), 200, request);
  } catch (error) {
    ctx.logger?.warn?.(error instanceof Error ? error : new Error(String(error)));
    return json({ error: messageOf(error) }, 500, request);
  }
}

/**
 * Build the complete inventory from live services.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
function collect(ctx) {
  const servers = new Map();
  const notes = [];

  for (const row of readConfiguredServers(ctx, notes)) {
    servers.set(row.name, row);
  }

  const tools = readMcpTools(ctx, notes);
  for (const tool of tools) {
    let server = servers.get(tool.server);
    if (server === undefined) {
      server = {
        name: tool.server,
        configured: false,
        entryId: null,
        transport: 'runtime',
        target: '',
        active: true,
        entryState: 'active',
        rowEnabled: false,
        toggleId: null,
        failure: null,
        reconnect: null,
        detail: null,
        tools: [],
      };
      servers.set(tool.server, server);
    }
    server.tools.push(tool);
  }

  const canToggle = pluginToggler(ctx) !== undefined;
  const list = [...servers.values()].map((server) => {
    const methods = server.tools
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name));
    return {
      ...server,
      tools: methods,
      toolCount: methods.length,
      status: statusOf(server, methods.length),
      canToggle: canToggle && server.configured === true && typeof server.toggleId === 'string',
    };
  });
  list.sort((left, right) => left.name.localeCompare(right.name));

  return {
    generatedAt: new Date().toISOString(),
    route: SERVERS_PATH,
    servers: list,
    notes,
  };
}

/**
 * Read the servers configured by `@deepseek-ai/dsh-mcp-client` rows.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {string[]} notes - collected non-fatal limitations, surfaced in the UI.
 */
function readConfiguredServers(ctx, notes) {
  const rows = loadRows(ctx, notes);
  const servers = new Map();
  for (const { entry, config } of rows) {
    if (entry?.options?.name !== MCP_CLIENT_PACKAGE) continue;
    const serverName = typeof config?.serverName === 'string' ? config.serverName.trim() : '';
    if (serverName === '') continue;
    const state = fiberStateOf(entry);
    const transport = typeof config?.transport === 'string' ? config.transport : 'unknown';
    // `entry.disabled` is the effective Loader state after every patch layer.
    const rowEnabled = entry?.disabled !== true;
    servers.set(serverName, {
      name: serverName,
      configured: true,
      entryId: typeof entry?.options?.id === 'string' ? entry.options.id : null,
      // The plugin manager identifies a row by its Loader entry id, which carries
      // the parent prefix (for example `include:mcp-dbx`), not the patch id.
      toggleId: loaderEntryId(entry),
      transport,
      target: describeTarget(config, transport),
      active: state === 'active',
      entryState: state,
      rowEnabled,
      failure: failureOf(entry),
      reconnect: reconnectSummary(config?.reconnect),
      detail: describeConfig(config, transport),
      tools: [],
    });
  }
  return [...servers.values()];
}

/**
 * Loader entries with their effective raw config, from the config editor when
 * the profile owns one, otherwise from the Loader directly.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {string[]} notes
 * @returns {Array<{ entry: any, config: Record<string, unknown> }>}
 */
function loadRows(ctx, notes) {
  const editor = ctx.get('configEditor');
  if (editor !== undefined && editor !== null && typeof editor.configuration === 'function') {
    try {
      const rows = editor.configuration();
      if (Array.isArray(rows) && rows.length > 0) {
        return rows.map(({ entry, inherited, override }) => ({
          entry,
          config: effectiveConfig(entry, inherited, override),
        }));
      }
    } catch (error) {
      notes.push(`configEditor 读取失败：${messageOf(error)}`);
    }
  }
  const loader = ctx.get('loader');
  if (loader !== undefined && loader !== null && typeof loader.entries === 'function') {
    try {
      return [...loader.entries()].map((entry) => ({
        entry,
        config: isRecord(entry?.options?.config) ? entry.options.config : {},
      }));
    } catch (error) {
      notes.push(`Loader 条目读取失败：${messageOf(error)}`);
    }
  }
  notes.push('当前运行环境未提供配置读取服务，已配置服务器可能不完整。');
  return [];
}

/**
 * Merge the two profile layers the config editor reports.
 * @param {any} entry
 * @param {unknown} inherited
 * @param {unknown} override
 */
function effectiveConfig(entry, inherited, override) {
  const current = isRecord(entry?.options?.config) ? entry.options.config : undefined;
  if (current !== undefined) return current;
  return {
    ...(isRecord(inherited) ? inherited : {}),
    ...(isRecord(override) ? override : {}),
  };
}

/**
 * Read the MCP tools the registry currently exposes, with descriptions and a
 * compact parameter summary.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {string[]} notes
 */
function readMcpTools(ctx, notes) {
  const registry = ctx.get('tools');
  if (registry === undefined || registry === null) {
    notes.push('工具注册表不可用，无法读取 MCP 方法。');
    return [];
  }
  const collected = [];
  const seen = new Set();
  const append = (definitions) => {
    if (!Array.isArray(definitions)) return;
    for (const definition of definitions) {
      const parsed = parseMcpToolName(definition?.name);
      if (parsed === undefined || seen.has(definition.name)) continue;
      seen.add(definition.name);
      collected.push({
        server: parsed.server,
        name: parsed.raw,
        publicName: definition.name,
        description: descriptionOf(definition),
        parameters: summarizeParameters(definition?.parameters),
      });
    }
  };
  try {
    append(registry.schemas());
  } catch (error) {
    notes.push(`工具 schema 读取失败：${messageOf(error)}`);
  }
  if (collected.length === 0) {
    try {
      append(registry.definitions());
    } catch (error) {
      notes.push(`工具定义读取失败：${messageOf(error)}`);
    }
  }
  return collected;
}

/** Parse `mcp__<server>__<rawName>` into its two identities. */
function parseMcpToolName(name) {
  if (typeof name !== 'string' || !name.startsWith(MCP_TOOL_PREFIX)) return undefined;
  const rest = name.slice(MCP_TOOL_PREFIX.length);
  const separator = rest.indexOf('__');
  if (separator <= 0 || separator >= rest.length - 2) return undefined;
  return { server: rest.slice(0, separator), raw: rest.slice(separator + 2) };
}

function descriptionOf(definition) {
  const value = definition?.description;
  if (typeof value === 'string') return value;
  if (typeof value === 'function') {
    try {
      const text = value();
      return typeof text === 'string' ? text : '';
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * Project a JSON Schema into the flat parameter summary the panel renders.
 * @param {unknown} schema
 */
function summarizeParameters(schema) {
  const required = [];
  const properties = [];
  if (!isRecord(schema)) return { properties, required };
  if (Array.isArray(schema.required)) {
    for (const name of schema.required) if (typeof name === 'string') required.push(name);
  }
  if (isRecord(schema.properties)) {
    for (const [name, property] of Object.entries(schema.properties)) {
      properties.push({
        name,
        type: isRecord(property) && typeof property.type === 'string' ? property.type : 'unknown',
        required: required.includes(name),
      });
      if (properties.length >= 48) break;
    }
  }
  return { properties, required };
}

/** Describe where the server is reached without exposing `env` or headers. */
function describeTarget(config, transport) {
  if (!isRecord(config)) return '';
  if (transport === 'stdio') {
    const command = typeof config.command === 'string' ? config.command : '';
    const args = Array.isArray(config.args) ? config.args.filter((arg) => typeof arg === 'string') : [];
    const text = [command, ...args].join(' ').trim();
    return truncate(text, 240);
  }
  if (typeof config.url === 'string') return truncate(config.url, 240);
  return '';
}

/**
 * Describe one configured server's entry for the expanded detail view.
 * Command, arguments, working directory and endpoint are shown verbatim because
 * they are diagnostics, not credentials. `env` and request `headers` keep only
 * their names: their values may hold tokens, so they never leave the Host.
 * @param {unknown} config - the row's effective raw config.
 * @param {string} transport
 */
function describeConfig(config, transport) {
  if (!isRecord(config)) return null;
  return {
    serverName: typeof config.serverName === 'string' ? config.serverName : null,
    transport,
    command: typeof config.command === 'string' ? config.command : null,
    args: Array.isArray(config.args) ? config.args.filter((arg) => typeof arg === 'string') : [],
    cwd: typeof config.cwd === 'string' ? config.cwd : null,
    url: typeof config.url === 'string' ? config.url : null,
    envNames: namesOf(config.env),
    headerNames: namesOf(config.headers),
    toolCallTimeoutMs: typeof config.toolCallTimeoutMs === 'number' ? config.toolCallTimeoutMs : null,
    maxInstructionBytes: typeof config.maxInstructionBytes === 'number' ? config.maxInstructionBytes : null,
    failOnStartupError: typeof config.failOnStartupError === 'boolean' ? config.failOnStartupError : null,
    reconnect: reconnectSummary(config.reconnect),
  };
}

/** Sorted own keys of a plain record; values stay on the Host. */
function namesOf(record) {
  return isRecord(record) ? Object.keys(record).sort() : [];
}

function reconnectSummary(reconnect) {
  if (!isRecord(reconnect)) return null;
  return {
    enabled: reconnect.enabled !== false,
    initialDelayMs: typeof reconnect.initialDelayMs === 'number' ? reconnect.initialDelayMs : null,
    maxDelayMs: typeof reconnect.maxDelayMs === 'number' ? reconnect.maxDelayMs : null,
    maxAttempts: typeof reconnect.maxAttempts === 'number' ? reconnect.maxAttempts : null,
  };
}

/** Classify availability from the entry lifecycle plus the registered methods. */
function statusOf(server, toolCount) {
  if (server.configured !== true) return 'runtime';
  if (server.entryState === 'failed') return 'error';
  if (server.active !== true) return 'disabled';
  if (toolCount > 0) return 'connected';
  return 'empty';
}

/** The Loader's runtime entry id (`<parent>:<patch id>`) — the plugin manager's identity. */
function loaderEntryId(entry) {
  try {
    return typeof entry?.id === 'string' ? entry.id : null;
  } catch {
    return null;
  }
}

function fiberStateOf(entry) {  try {
    const raw = entry?.fiber?.state;
    if (typeof raw === 'number') return FIBER_STATE_NAMES[raw] ?? 'unknown';
  } catch {
    /* a disposed fiber may throw on property access */
  }
  if (entry?.options?.disabled === true) return 'disabled';
  return 'unknown';
}

function failureOf(entry) {
  try {
    const error = entry?.fiber?.error;
    if (error === undefined || error === null) return null;
    if (typeof error === 'string') return error;
    if (typeof error?.message === 'string') return error.message;
  } catch {
    /* ignore unreadable fiber error */
  }
  return null;
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

/** JSON response with no-store caching; loopback/file pages may read it. */
function json(body, status, request) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  };
  try {
    const origin = request.headers.get('origin');
    if (origin !== null) {
      headers['access-control-allow-origin'] = origin;
      headers.vary = 'origin';
    }
  } catch {
    /* a request without a headers bag needs no CORS answer */
  }
  return new Response(JSON.stringify(body), { status, headers });
}
