# CLI Reference

All commands run from `{skill_dir}/toolkit/`.

---

## Core Commands

### Preview (opens browser)

```bash
node dist/cli.js preview {markdown_path} \
  --theme {theme_key} --color "{hex}" \
  [--font {font}] [--font-size {size}] \
  [--heading-size {size}] [--paragraph-spacing {spacing}] \
  [--custom-theme {theme_json_path}] \
  [--no-open] [-o {output_html_path}]
```

### Publish to WeChat Drafts

```bash
node dist/cli.js publish {markdown_path} \
  --theme {theme_key} --color "{hex}" \
  [--cover {cover_image_path}] [--title "{title}"] \
  [--font {font}] [--font-size {size}] \
  [--heading-size {size}] [--paragraph-spacing {spacing}] \
  [--custom-theme {theme_json_path}]
```

Parameter priority: `--custom-theme` > CLI args > `style.yaml` values > defaults

### Theme Comparison Preview

```bash
node dist/cli.js theme-preview {markdown_path} --color "{hex}"
```

Generates a side-by-side preview of all 4 themes with the given color.

### List Themes and Colors

```bash
node dist/cli.js themes
node dist/cli.js colors
```

---

## Image Generation

```bash
# AI-generated image (API key 优先级: CLI参数 > 环境变量 > 配置文件)
node dist/image-gen.js --prompt "{prompt}" \
  --output {output_path} --size {cover|article} \
  [--color "{hex}"] [--mood "{mood}"] [--provider {gemini|openai|doubao}] \
  [--gemini-key "{key}"] [--openai-key "{key}"] [--doubao-key "{key}"]

# 环境变量方式
export GEMINI_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
export DOUBAO_API_KEY="your-key"

# Fallback: match a predefined cover by color
node dist/image-gen.js --fallback-cover --color "{hex}" --output {output_path}
```

**API Key 优先级：** CLI 参数 `--{provider}-key` > 环境变量 > `config.yaml` 配置

Fallback chain: API generation → predefined covers from remote CDN → prompt-only output.

---

## Python Scripts

```bash
# Fetch trending topics (Weibo + Toutiao + Baidu)
python3 {skill_dir}/scripts/fetch_hotspots.py --limit 30

# Score keywords for SEO potential
python3 {skill_dir}/scripts/seo_keywords.py --json "keyword1" "keyword2" "keyword3"
```

---

## Analytics and Learning

```bash
# Fetch article stats and backfill history.yaml
node dist/fetch-stats.js --client {client} --days 7

# Analyze human edits and extract lessons
node dist/learn-edits.js --client {client} --draft {draft_path} --final {final_path}

# Summarize accumulated lessons into a playbook refresh
node dist/learn-edits.js --client {client} --summarize

# Build playbook from corpus (minimum 20 articles, 50+ recommended)
node dist/build-playbook.js --client {client}
```

---

## Skill Maintenance

```bash
# Validate the skill's structure, metadata, and documentation links
python3 ../scripts/validate_skill.py
```
