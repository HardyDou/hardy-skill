/**
 * AI image generation — multi-provider + CDN fallback covers.
 *
 * Providers: gemini | openai | doubao
 * Fallback chain: API → CDN predefined covers → prompt-only output
 *
 * Usage:
 *   npx tsx src/image-gen.ts --prompt "..." --output cover.jpg --size cover
 *   npx tsx src/image-gen.ts --prompt "..." --output img.jpg --provider gemini
 *   npx tsx src/image-gen.ts --fallback-cover --color "#3498db" --output cover.jpg
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { COVER_PALETTE, COLOR_HUE_MAP } from './cover-assets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_DIR = resolve(__dirname, '../..');
const HOME_DIR = process.env.HOME || '';

// Config 加载优先级（从高到低）
const CONFIG_PATHS = [
  resolve(HOME_DIR, '.writer', 'config.yaml'),
  resolve(PROJECT_DIR, 'config.yaml'),
  resolve(PROJECT_DIR, 'config.example.yaml'),
];

// Env 文件加载优先级
const ENV_PATHS = [
  resolve(HOME_DIR, '.writer', '.env'),
  resolve(PROJECT_DIR, '.env'),
];

// ---------------------------------------------------------------------------
// Size mapping
// ---------------------------------------------------------------------------

const SIZE_MAP: Record<string, Record<string, string>> = {
  cover: {
    gemini: '16:9', openai: '1536x1024', doubao: '1280x544',
  },
  article: {
    gemini: '16:9', openai: '1536x1024', doubao: '1280x720',
  },
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface ProviderConfig {
  api_key?: string;
  model?: string;
  base_url?: string;
}

interface ImageConfig {
  default_provider?: string;
  providers?: Record<string, ProviderConfig>;
}

function loadEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const content = readFileSync(path, 'utf-8');
  const env: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      env[key] = value;
    }
  }
  return env;
}

function loadEnv(): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const p of ENV_PATHS) {
    Object.assign(merged, loadEnvFile(p));
  }
  return merged;
}

function loadConfig(): ImageConfig {
  let config: ImageConfig = {};
  for (const p of CONFIG_PATHS) {
    if (existsSync(p)) {
      console.error(`[INFO] 加载配置: ${p}`);
      const raw = parseYaml(readFileSync(p, 'utf-8')) ?? {};
      config = raw.image ?? {};
      break;
    }
  }
  // 合并 env 中的 API keys（优先级最高）
  const env = loadEnv();
  if (env.GEMINI_API_KEY) {
    config.providers = { ...config.providers, gemini: { ...config.providers?.gemini, api_key: env.GEMINI_API_KEY } };
  }
  if (env.OPENAI_API_KEY) {
    config.providers = { ...config.providers, openai: { ...config.providers?.openai, api_key: env.OPENAI_API_KEY } };
  }
  if (env.DOUBAO_API_KEY) {
    config.providers = { ...config.providers, doubao: { ...config.providers?.doubao, api_key: env.DOUBAO_API_KEY } };
  }
  if (env.ANTHROPIC_API_KEY) {
    config.providers = { ...config.providers, anthropic: { ...config.providers?.anthropic, api_key: env.ANTHROPIC_API_KEY } };
  }
  return config;
}

const ANTHROPIC_SIZE_MAP: Record<string, string> = {
  '16:9': '1792x1024',
  '1:1': '1024x1024',
  '9:16': '1024x1792',
};

function resolveAnthropicSize(aspectRatio: string): string {
  return ANTHROPIC_SIZE_MAP[aspectRatio] ?? '1792x1024';
}

function resolveProvider(
  config: ImageConfig,
  explicit?: string,
  cliKeys?: { gemini?: string; openai?: string; doubao?: string; anthropic?: string },
): [string, ProviderConfig] {
  const providers = config.providers ?? {};
  const cliKeyMap: Record<string, string | undefined> = {
    gemini: cliKeys?.gemini,
    openai: cliKeys?.openai,
    doubao: cliKeys?.doubao,
    anthropic: cliKeys?.anthropic,
  };

  if (explicit) {
    const p = providers[explicit];
    const apiKey = getApiKey(explicit, cliKeyMap[explicit], p?.api_key);
    if (apiKey) return [explicit, { ...p, api_key: apiKey }];
    console.error(`[WARN] 指定的 provider '${explicit}' 未配置 api_key`);
    return [explicit, p ?? {}];
  }

  const defaultP = config.default_provider;
  if (defaultP) {
    const apiKey = getApiKey(defaultP, cliKeyMap[defaultP], providers[defaultP]?.api_key);
    if (apiKey) return [defaultP, { ...providers[defaultP], api_key: apiKey }];
  }

  for (const [name, cfg] of Object.entries(providers)) {
    const apiKey = getApiKey(name, cliKeyMap[name], cfg.api_key);
    if (apiKey) {
      console.error(`[INFO] 自动选择 provider: ${name}`);
      return [name, { ...cfg, api_key: apiKey }];
    }
  }

  return ['', {}];
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function httpRetry(
  url: string,
  init: RequestInit,
  retries = 3,
  timeoutMs = 120_000,
): Promise<Response> {
  for (let i = 1; i <= retries; i++) {
    try {
      const resp = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text().then(t => t.slice(0, 300))}`);
      return resp;
    } catch (e) {
      if (i === retries) throw e;
      const wait = 2 ** (i - 1) * 1000;
      console.error(`[WARN] 请求失败 (${i}/${retries}): ${e} — ${wait / 1000}s 后重试`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw new Error('unreachable');
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

// Anthropic native image generation (Claude image gen)
async function generateAnthropic(
  prompt: string, apiKey: string, size: string,
  model = 'claude-3-5-sonnet-4-20250514', baseUrl = 'https://api.anthropic.com/v1',
): Promise<Buffer> {
  // Size: Anthropic expects "1024x1024", "1792x1024", "1024x1792" etc
  const [w, h] = size.split('x').map(Number);
  const url = `${baseUrl}/images`;
  const resp = await httpRetry(url, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      width: w,
      height: h,
      medium: { type: 'image' },
    }),
  }, 3, 120_000);

  const data = await resp.json() as Record<string, unknown>;
  const b64 = (data as Record<string, string>).b64_json;
  if (!b64) throw new Error(`Anthropic API 无返回: ${JSON.stringify(data).slice(0, 200)}`);
  return Buffer.from(b64, 'base64');
}

async function generateGemini(
  prompt: string, apiKey: string, aspectRatio: string, model = 'imagen-4.0-ultra-generate-001',
): Promise<Buffer> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
  const resp = await httpRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio },
    }),
  }, 3, 90_000);

  const data = await resp.json() as Record<string, unknown>;
  const predictions = (data.predictions ?? []) as Record<string, string>[];
  const b64 = predictions[0]?.bytesBase64Encoded;
  if (!b64) throw new Error(`Gemini API 无返回: ${JSON.stringify(data).slice(0, 200)}`);
  return Buffer.from(b64, 'base64');
}

async function generateOpenAI(
  prompt: string, apiKey: string, size: string,
  model = 'gpt-image-1', baseUrl = 'https://api.openai.com/v1',
): Promise<Buffer> {
  const url = `${baseUrl}/images/generations`;
  const resp = await httpRetry(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, size, n: 1, quality: 'medium' }),
  }, 3, 120_000);

  const data = await resp.json() as Record<string, unknown>;
  const items = (data.data ?? []) as Record<string, string>[];
  if (!items.length) throw new Error(`OpenAI API 无返回: ${JSON.stringify(data).slice(0, 200)}`);

  if (items[0].b64_json) return Buffer.from(items[0].b64_json, 'base64');
  if (items[0].url) {
    const imgResp = await httpRetry(items[0].url, {}, 1, 30_000);
    return Buffer.from(await imgResp.arrayBuffer());
  }
  throw new Error('OpenAI API 未返回图片数据');
}

async function generateDoubao(
  prompt: string, apiKey: string, size: string,
  model = 'doubao-seedream-5-0-260128', baseUrl = 'https://ark.cn-beijing.volces.com/api/v3',
): Promise<Buffer> {
  const url = `${baseUrl}/images/generations`;
  const resp = await httpRetry(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, size, n: 1, response_format: 'b64_json' }),
  }, 3, 60_000);

  const data = await resp.json() as Record<string, unknown>;
  const items = (data.data ?? []) as Record<string, string>[];
  if (!items.length) throw new Error(`豆包 API 无返回: ${JSON.stringify(data).slice(0, 200)}`);

  if (items[0].b64_json) return Buffer.from(items[0].b64_json, 'base64');
  if (items[0].url?.startsWith('http')) {
    const imgResp = await httpRetry(items[0].url, {}, 1, 30_000);
    return Buffer.from(await imgResp.arrayBuffer());
  }
  throw new Error('豆包 API 未返回图片数据');
}

type GenerateFn = (prompt: string, apiKey: string, sizeOrRatio: string, model?: string, baseUrl?: string) => Promise<Buffer>;

const GENERATORS: Record<string, GenerateFn> = {
  gemini: (p, k, s, m) => generateGemini(p, k, s, m),
  openai: (p, k, s, m, b) => generateOpenAI(p, k, s, m, b),
  doubao: (p, k, s, m, b) => generateDoubao(p, k, s, m, b),
  anthropic: (p, k, s, m, b) => generateAnthropic(p, k, s, m, b),
};

// ---------------------------------------------------------------------------
// Fallback cover
// ---------------------------------------------------------------------------

function selectFallbackCover(color = '#3498db', mood = ''): string | null {
  const targetHue = COLOR_HUE_MAP[color.toLowerCase()] ?? 'blue';

  const candidates: [number, string][] = [];
  for (const [, meta] of Object.entries(COVER_PALETTE)) {
    let score = 0;
    if (meta.hue === targetHue) score += 3;
    if (mood && meta.mood === mood) score += 2;
    if (meta.tone === (['orange', 'warm'].includes(targetHue) ? 'warm' : 'cool')) score += 1;
    candidates.push([score, meta.url]);
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b[0] - a[0]);
  return candidates[0][1];
}

async function downloadFallbackCover(url: string, output: string): Promise<boolean> {
  try {
    const resp = await httpRetry(url, {}, 2, 30_000);
    const buf = Buffer.from(await resp.arrayBuffer());
    writeFileSync(output, buf);
    console.error(`[INFO] 下载预制封面: ${basename(output)} (${(buf.length / 1024).toFixed(1)} KB)`);
    return true;
  } catch (e) {
    console.error(`[WARN] 下载预制封面失败: ${e}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface CliArgs {
  prompt?: string;
  output: string;
  size: 'cover' | 'article';
  provider?: string;
  fallbackCover: boolean;
  color: string;
  mood: string;
  // API keys from CLI args
  geminiKey?: string;
  openaiKey?: string;
  doubaoKey?: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const i = args.indexOf(flag);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
  };
  const has = (flag: string) => args.includes(flag);

  const output = get('--output') ?? get('-o');
  if (!output) { console.error('需要 --output 参数'); process.exit(1); }

  return {
    prompt: get('--prompt'),
    output,
    size: (get('--size') ?? 'cover') as 'cover' | 'article',
    provider: get('--provider'),
    fallbackCover: has('--fallback-cover'),
    color: get('--color') ?? '#3498db',
    mood: get('--mood') ?? '',
    // API keys from CLI (highest priority)
    geminiKey: get('--gemini-key'),
    openaiKey: get('--openai-key'),
    doubaoKey: get('--doubao-key'),
  };
}

// Environment variable keys (priority 2, after CLI args)
const ENV_KEYS: Record<string, string> = {
  gemini: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
  doubao: 'DOUBAO_API_KEY',
};

// Get API key with priority: CLI args > env vars > config
function getApiKey(
  provider: string,
  cliKey?: string,
  configKey?: string,
): string | undefined {
  return cliKey ?? process.env[ENV_KEYS[provider]] ?? configKey;
}

function output(data: Record<string, unknown>) {
  console.log(JSON.stringify(data, null, 2));
}

async function main() {
  const args = parseArgs();
  mkdirSync(dirname(resolve(args.output)), { recursive: true });

  // --- Mode 1: Fallback cover ---
  if (args.fallbackCover) {
    const cover = selectFallbackCover(args.color, args.mood);
    if (cover && await downloadFallbackCover(cover, args.output)) {
      output({ status: 'ok', source: 'fallback', file: args.output });
    } else {
      output({ status: 'error', message: '无匹配的预制封面' });
      process.exit(1);
    }
    return;
  }

  // --- Mode 2: API generation ---
  if (!args.prompt) {
    console.error('需要 --prompt 或 --search 参数');
    process.exit(1);
  }

  const config = loadConfig();
  const cliKeys = {
    gemini: args.geminiKey,
    openai: args.openaiKey,
    doubao: args.doubaoKey,
  };
  const [providerName, providerCfg] = resolveProvider(config, args.provider, cliKeys);

  if (!providerCfg.api_key) {
    console.error('[WARN] 无可用的 API key，尝试降级方案...');
    // Fallback: predefined cover
    if (args.size === 'cover') {
      const cover = selectFallbackCover(args.color, args.mood);
      if (cover && await downloadFallbackCover(cover, args.output)) {
        output({ status: 'ok', source: 'fallback', file: args.output, prompt: args.prompt });
        return;
      }
    }
    // Fallback: prompt only
    output({
      status: 'prompt_only', prompt: args.prompt,
      message: '无可用 API key。请通过 --gemini-key/--openai-key/--doubao-key 参数、环境变量或 config.yaml 配置',
    });
    return;
  }

  const genFn = GENERATORS[providerName];
  if (!genFn) {
    console.error(`未知 provider: ${providerName} (支持: gemini, openai, doubao, anthropic)`);
    process.exit(1);
  }

  const sizeVal = SIZE_MAP[args.size][providerName] ?? SIZE_MAP[args.size].openai;
  const resolvedSize = providerName === 'anthropic' ? resolveAnthropicSize(sizeVal) : sizeVal;

  // 打印生图提示词
  console.error(`\n========== 生图提示词 ==========`);
  console.error(`${args.prompt}`);
  console.error(`================================\n`);

  try {
    const imageBytes = await genFn(
      args.prompt, providerCfg.api_key!, resolvedSize,
      providerCfg.model, providerCfg.base_url,
    );
    writeFileSync(args.output, imageBytes);
    console.error(`[INFO] 图片已保存: ${args.output} (${(imageBytes.length / 1024).toFixed(1)} KB)`);
    output({ status: 'ok', source: providerName, file: args.output, prompt: args.prompt });
  } catch (e) {
    console.error(`[ERROR] ${providerName} 生图失败: ${e}`);
    // Fallback: predefined cover
    if (args.size === 'cover') {
      const cover = selectFallbackCover(args.color, args.mood);
      if (cover && await downloadFallbackCover(cover, args.output)) {
        output({ status: 'ok', source: 'fallback', file: args.output, api_error: String(e) });
        return;
      }
    }
    output({ status: 'error', message: String(e), prompt: args.prompt });
    process.exit(1);
  }
}

// Export for module usage
export {
  generateGemini, generateOpenAI, generateDoubao, generateAnthropic,
  selectFallbackCover, downloadFallbackCover, resolveProvider,
  GENERATORS, SIZE_MAP,
};
export { COVER_PALETTE, COLOR_HUE_MAP } from './cover-assets.js';

const isMain = process.argv[1]?.includes('image-gen');
if (isMain) main().catch(e => { console.error(e); process.exit(1); });
