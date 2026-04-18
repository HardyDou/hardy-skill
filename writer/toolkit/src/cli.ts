#!/usr/bin/env tsx
/**
 * CLI entry point for WeChat Article Skill.
 *
 * Usage:
 *   npx tsx src/cli.ts preview article.md --theme simple --color "#3498db"
 *   npx tsx src/cli.ts publish article.md --theme decoration --color "#9b59b6"
 *   npx tsx src/cli.ts themes
 *   npx tsx src/cli.ts colors
 *   npx tsx src/cli.ts theme-preview article.md --color "#e74c3c"
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { WeChatConverter, previewHtml } from './converter.js';
import {
  DEFAULT_COLOR,
  DEFAULT_THEME,
  type FontFamily,
  type HeadingSize,
  type ParagraphSpacing,
  type Theme,
  type ThemeKey,
  type ThemeStyles,
  listPresetColors,
  listThemes,
} from './theme-engine.js';
import { getAccessToken, uploadImage, uploadThumb } from './wechat-api.js';
import { createDraft } from './publisher.js';

// --- Config Loading ---

import { existsSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { dirname, join } from 'node:path';

// Skill 目录（toolkit/dist 的上层）
const SKILL_DIR = resolve(dirname(import.meta.url.replace('file://', '')), '..', '..');

// Config 加载优先级（从高到低）
const CONFIG_PATHS = [
  join(process.env.HOME || '', '.writer', 'config.yaml'),       // 用户目录（真实凭据，不发布）
  join(process.cwd(), 'config.yaml'),                             // 当前工作目录
  join(SKILL_DIR, 'config.yaml'),                                // Skill 目录
  join(SKILL_DIR, 'config.example.yaml'),                        // 示例配置（仅占位符）
];

// Env 文件加载优先级（从高到低）
const ENV_PATHS = [
  join(process.env.HOME || '', '.writer', '.env'),              // 用户目录
  join(process.cwd(), '.env'),                                  // 当前工作目录
  join(SKILL_DIR, '.env'),                                       // Skill 目录
];

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
  // 合并所有 env 文件，后者覆盖前者
  const merged: Record<string, string> = {};
  for (const p of ENV_PATHS) {
    const fileEnv = loadEnvFile(p);
    Object.assign(merged, fileEnv);
  }
  return merged;
}

function loadConfig(): Record<string, unknown> {
  let config: Record<string, unknown> = {};
  for (const p of CONFIG_PATHS) {
    if (existsSync(p)) {
      console.error(`[INFO] 加载配置: ${p}`);
      config = parseYaml(readFileSync(p, 'utf-8')) || {};
      break;
    }
  }
  // 合并 .env 值（env 优先级高于配置文件）
  const env = loadEnv();
  if (Object.keys(env).length > 0) {
    // WeChat 配置
    if (env.WECHAT_APPID) {
      config['wechat'] = { ...(config['wechat'] as Record<string, unknown> || {}), appid: env.WECHAT_APPID };
    }
    if (env.WECHAT_SECRET) {
      config['wechat'] = { ...(config['wechat'] as Record<string, unknown> || {}), secret: env.WECHAT_SECRET };
    }
    if (env.WECHAT_AUTHOR) {
      config['wechat'] = { ...(config['wechat'] as Record<string, unknown> || {}), author: env.WECHAT_AUTHOR };
    }
    // 图片 provider API keys
    if (env.GEMINI_API_KEY) {
      config['image'] = { ...(config['image'] as Record<string, unknown> || {}), providers: { ...((config['image'] as Record<string, unknown>)?.providers as Record<string, unknown> || {}), gemini: { api_key: env.GEMINI_API_KEY } } };
    }
    if (env.OPENAI_API_KEY) {
      config['image'] = { ...(config['image'] as Record<string, unknown> || {}), providers: { ...((config['image'] as Record<string, unknown>)?.providers as Record<string, unknown> || {}), openai: { api_key: env.OPENAI_API_KEY } } };
    }
    if (env.DOUBAO_API_KEY) {
      config['image'] = { ...(config['image'] as Record<string, unknown> || {}), providers: { ...((config['image'] as Record<string, unknown>)?.providers as Record<string, unknown> || {}), doubao: { api_key: env.DOUBAO_API_KEY } } };
    }
    if (env.ANTHROPIC_API_KEY) {
      config['image'] = { ...(config['image'] as Record<string, unknown> || {}), providers: { ...((config['image'] as Record<string, unknown>)?.providers as Record<string, unknown> || {}), anthropic: { api_key: env.ANTHROPIC_API_KEY } } };
    }
  }
  return config;
}

function loadCustomTheme(jsonPath: string): Theme {
  const raw = JSON.parse(readFileSync(resolve(jsonPath), 'utf-8'));
  const styles: ThemeStyles = raw.styles ?? raw;
  return {
    name: raw.meta?.name ?? 'Custom Theme',
    key: 'custom' as ThemeKey,
    description: raw.meta?.description ?? 'Custom theme',
    color: raw.tokens?.color ?? DEFAULT_COLOR,
    styles,
  };
}

// --- Commands ---

const program = new Command();

program
  .name('wechat-article')
  .description('WeChat Article: Markdown to WeChat HTML with dynamic themes')
  .version('1.0.0');

program
  .command('preview')
  .description('Generate HTML preview and open in browser')
  .argument('<input>', 'Markdown file path')
  .option('-t, --theme <key>', 'Theme: simple, center, decoration, prominent', DEFAULT_THEME)
  .option('-c, --color <hex>', 'Theme color (HEX)', DEFAULT_COLOR)
  .option('-o, --output <path>', 'Output HTML file path')
  .option('--no-open', "Don't open browser")
  .option('--font <key>', 'Font: default, optima, serif', 'default')
  .option('--font-size <n>', 'Body font size (14-18)', '16')
  .option('--heading-size <key>', 'Heading size: minus2, minus1, standard, plus1', 'standard')
  .option('--paragraph-spacing <key>', 'Paragraph spacing: compact, normal, loose', 'normal')
  .option('--custom-theme <path>', 'Custom theme JSON file path')
  .action(async (input: string, opts) => {
    const converter = new WeChatConverter({
      themeKey: opts.theme as ThemeKey,
      color: opts.color,
      fontFamily: opts.font as FontFamily,
      fontSize: parseInt(opts.fontSize),
      headingSize: opts.headingSize as HeadingSize,
      paragraphSpacing: opts.paragraphSpacing as ParagraphSpacing,
      ...(opts.customTheme ? { customTheme: loadCustomTheme(opts.customTheme) } : {}),
    });

    const result = converter.convertFile(input);
    const fullHtml = previewHtml(result.html, converter.getTheme());

    const outputPath = opts.output || input.replace(/\.md$/, '.html');
    writeFileSync(outputPath, fullHtml, 'utf-8');

    console.log(`Title: ${result.title}`);
    console.log(`Digest: ${result.digest}`);
    console.log(`Images: ${result.images.length}`);
    console.log(`Theme: ${opts.theme} | Color: ${opts.color}`);
    console.log(`Output: ${outputPath}`);

    if (opts.open !== false) {
      const { default: open } = await import('open');
      await open(`file://${resolve(outputPath)}`);
      console.log('Opened in browser.');
    }
  });

program
  .command('publish')
  .description('Convert and publish as WeChat draft')
  .argument('<input>', 'Markdown file path')
  .option('-t, --theme <key>', 'Theme key')
  .option('-c, --color <hex>', 'Theme color (HEX)')
  .option('--appid <id>', 'WeChat AppID')
  .option('--secret <key>', 'WeChat AppSecret')
  .option('--cover <path>', 'Cover image file path')
  .option('--title <text>', 'Override article title')
  .option('--author <name>', 'Article author')
  .option('--font <key>', 'Font: default, optima, serif', 'default')
  .option('--font-size <n>', 'Body font size (14-18)', '16')
  .option('--heading-size <key>', 'Heading size', 'standard')
  .option('--paragraph-spacing <key>', 'Paragraph spacing', 'normal')
  .option('--custom-theme <path>', 'Custom theme JSON file path')
  .action(async (input: string, opts) => {
    const cfg = loadConfig();
    const wechatCfg = (cfg.wechat as Record<string, string>) || {};

    const appid = opts.appid || wechatCfg.appid;
    const secret = opts.secret || wechatCfg.secret;
    const themeKey = (opts.theme || (cfg.theme as string) || DEFAULT_THEME) as ThemeKey;
    const color = opts.color || (cfg.theme_color as string) || DEFAULT_COLOR;
    const author = opts.author || wechatCfg.author;

    if (!appid || !secret) {
      console.error('Error: --appid and --secret required (or set in config.yaml)');
      process.exit(1);
    }

    const converter = new WeChatConverter({
      themeKey,
      color,
      fontFamily: opts.font as FontFamily,
      fontSize: parseInt(opts.fontSize),
      headingSize: opts.headingSize as HeadingSize,
      paragraphSpacing: opts.paragraphSpacing as ParagraphSpacing,
      ...(opts.customTheme ? { customTheme: loadCustomTheme(opts.customTheme) } : {}),
    });

    const result = converter.convertFile(input);

    console.log(`Title: ${result.title}`);
    console.log(`Digest: ${result.digest}`);
    console.log(`Images found: ${result.images.length}`);
    console.log(`Theme: ${themeKey} | Color: ${color}`);

    const token = await getAccessToken(appid, secret);
    console.log('Access token obtained.');

    let html = result.html;
    const mdDir = dirname(resolve(input));

    for (const imgSrc of result.images) {
      if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
        console.log(`Skipping remote image: ${imgSrc}`);
        continue;
      }

      let imgPath = resolve(imgSrc);
      if (!existsSync(imgPath)) {
        imgPath = join(mdDir, imgSrc);
      }

      if (existsSync(imgPath)) {
        console.log(`Uploading image: ${imgSrc}`);
        const wechatUrl = await uploadImage(token, imgPath);
        html = html.replace(imgSrc, wechatUrl);
        console.log(`  -> ${wechatUrl}`);
      } else {
        console.log(`Warning: image not found: ${imgSrc}`);
      }
    }

    let thumbMediaId: string | undefined;
    if (opts.cover) {
      console.log(`Uploading cover: ${opts.cover}`);
      thumbMediaId = await uploadThumb(token, opts.cover);
      console.log(`  -> media_id: ${thumbMediaId}`);
    }

    const title = opts.title || result.title || input.replace(/\.md$/, '');
    const draft = await createDraft({
      accessToken: token,
      title,
      html,
      digest: result.digest,
      thumbMediaId,
      author,
    });

    console.log(`\nDraft created! media_id: ${draft.mediaId}`);
  });

program
  .command('themes')
  .description('List available themes')
  .action(() => {
    console.log('Available themes:\n');
    for (const t of listThemes()) {
      console.log(`  ${t.key.padEnd(16)} ${t.name}  (${t.description})`);
    }
  });

program
  .command('colors')
  .description('List preset colors')
  .action(() => {
    console.log('Preset colors:\n');
    for (const [name, hex] of Object.entries(listPresetColors())) {
      console.log(`  ${name.padEnd(20)} ${hex}`);
    }
    console.log('\nYou can also use any custom HEX color with --color.');
  });

program
  .command('theme-preview')
  .description('Generate previews for all 4 themes with the given color')
  .argument('<input>', 'Markdown file path')
  .option('-c, --color <hex>', 'Theme color (HEX)', DEFAULT_COLOR)
  .option('--no-open', "Don't open browser")
  .option('--font <key>', 'Font', 'default')
  .option('--font-size <n>', 'Font size', '16')
  .action(async (input: string, opts) => {
    const themes = listThemes();

    for (const t of themes) {
      const converter = new WeChatConverter({
        themeKey: t.key,
        color: opts.color,
        fontFamily: opts.font as FontFamily,
        fontSize: parseInt(opts.fontSize),
      });

      const result = converter.convertFile(input);
      const fullHtml = previewHtml(result.html, converter.getTheme());

      const outputPath = input.replace(/\.md$/, `.${t.key}.html`);
      writeFileSync(outputPath, fullHtml, 'utf-8');
      console.log(`  ${t.key.padEnd(16)} -> ${outputPath}`);
    }

    if (opts.open !== false) {
      const firstOutput = input.replace(/\.md$/, `.${themes[0].key}.html`);
      const { default: open } = await import('open');
      await open(`file://${resolve(firstOutput)}`);
    }

    console.log(`\nGenerated ${themes.length} theme previews with color ${opts.color}.`);
  });

program.parse();
