#!/usr/bin/env python3
"""
writer fmt: 多平台文章格式转换工具
读取 .templates/themes/ 目录获取主题样式
支持平台: wechat, toutiao, x, etc.

用法:
    python3 fmt.py <md文件> [平台名] [--output <输出文件>]
    python3 fmt.py list  # 列出可用主题
"""

import sys
import re
import os
import json

# 平台默认值
DEFAULT_PLATFORM = 'wechat'

# 内置的默认 HTML wrapper（当找不到 index.html 时使用）
DEFAULT_WRAPPER = '''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>
<body>
<section style="{{container_style}}">
{{content}}
</section>
</body>
</html>'''


def get_skill_dir():
    """获取 skill 目录（fmt.py 的父目录）"""
    return os.path.dirname(os.path.abspath(__file__))


def get_template_dir():
    """获取模板目录"""
    return os.path.join(get_skill_dir(), '.templates')


def get_themes_dir():
    """获取主题目录"""
    return os.path.join(get_skill_dir(), '.templates', 'themes')


def list_themes():
    """列出所有可用的主题"""
    themes_dir = get_themes_dir()
    if not os.path.exists(themes_dir):
        return []
    return [f.replace('.json', '') for f in os.listdir(themes_dir) if f.endswith('.json')]


def load_theme(platform):
    """加载指定平台的主题"""
    themes_dir = get_themes_dir()
    theme_path = os.path.join(themes_dir, f'{platform}.json')

    if not os.path.exists(theme_path):
        available = list_themes()
        print(f"错误: 主题 '{platform}' 不存在", file=sys.stderr)
        if available:
            print(f"可用主题: {', '.join(available)}", file=sys.stderr)
        else:
            print(f"请在 {themes_dir} 目录下创建主题文件", file=sys.stderr)
        print(f"格式: {platform}.json", file=sys.stderr)
        sys.exit(1)

    with open(theme_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_wrapper():
    """加载 HTML wrapper 模板"""
    template_path = os.path.join(get_template_dir(), 'index.html')
    if os.path.exists(template_path):
        with open(template_path, 'r', encoding='utf-8') as f:
            return f.read()
    return DEFAULT_WRAPPER


def md_to_html(md_content, theme):
    """将 Markdown 转换为 HTML（使用主题样式）"""

    s = theme  # 主题本身包含所有样式键

    lines = md_content.split('\n')
    html_parts = []
    in_code_block = False
    in_frontmatter = False
    code_content = []

    for line in lines:
        # 跳过 frontmatter
        if line.strip() == '---':
            if not in_frontmatter:
                in_frontmatter = True
                continue
            else:
                in_frontmatter = False
                continue
        if in_frontmatter:
            continue

        # 代码块
        if line.strip().startswith('```'):
            if in_code_block:
                code_text = '\n'.join(code_content)
                code_text = (code_text
                    .replace('&', '&amp;')
                    .replace('<', '&lt;')
                    .replace('>', '&gt;')
                    .replace('"', '&quot;')
                    .replace("'", '&#39;'))
                code_text = code_text.replace('\n', '<br>')
                lang = code_content[0].strip()[3:] if code_content else ''

                # 生成窗口按钮（如果有样式）
                header = ''
                if s.get('code_block_header'):
                    dots = ''
                    dot_colors = ['#fc625d', '#fdbc40', '#3bc950']
                    for color in dot_colors:
                        dots += f'<span style="{s.get("code_block_dots", "")} background: {color};"></span>'
                    header = f'<div style="{s.get("code_block_header", "")}">{dots}</div>'

                code = f'<code style="{s.get("code_block_content", "")}">{code_text}</code>'
                code_html = f'<pre style="{s.get("code_block", "")}">{header}{code}</pre>'
                html_parts.append(code_html)
                code_content = []
                in_code_block = False
            else:
                in_code_block = True
            continue

        if in_code_block:
            code_content.append(line)
            continue

        # 标题处理
        if line.startswith('#### '):
            text = line[5:].strip()
            style = s.get('h4', '')
            html_parts.append(f'<h4 style="{style}">{text}</h4>')
            continue
        elif line.startswith('### '):
            text = line[4:].strip()
            style = s.get('h3', '')
            html_parts.append(f'<h3 style="{style}">{text}</h3>')
            continue
        elif line.startswith('## '):
            text = line[3:].strip()
            style = s.get('h2', '')
            html_parts.append(f'<h2 style="{style}">{text}</h2>')
            continue
        elif line.startswith('# '):
            text = line[2:].strip()
            style = s.get('h1', '')
            html_parts.append(f'<h1 style="{style}">{text}</h1>')
            continue

        # 图片
        img_match = re.match(r'^!\[([^\]]*)\]\(([^)\s]+)\)$', line.strip())
        if img_match:
            alt, src = img_match.groups()
            style = s.get('img', 'max-width: 100%; height: auto; display: block; margin: 16px auto;')
            html_parts.append(f'<img src="{src}" alt="{alt}" style="{style}">')
            continue

        # 分割线
        if re.match(r'^[-*_]{3,}$', line.strip()):
            style = s.get('hr', '')
            html_parts.append(f'<hr style="{style}">')
            continue

        # 引用块
        if line.strip().startswith('>'):
            quote_text = line.strip()[1:].strip()
            quote_text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', quote_text)
            style = s.get('blockquote', '')
            html_parts.append(f'<blockquote style="{style}">{quote_text}</blockquote>')
            continue

        # 无序列表
        if re.match(r'^[-*]\s+', line):
            item_text = line[2:].strip()
            item_text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', item_text)
            ul_style = s.get('ul', '')
            li_style = s.get('li', '')
            html_parts.append(f'<ul style="{ul_style}"><li style="{li_style}">{item_text}</li></ul>')
            continue

        # 有序列表
        if re.match(r'^\d+\.\s+', line):
            match = re.match(r'^(\d+)\.\s+(.*)$', line)
            if match:
                item_text = match.group(2).strip()
                item_text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', item_text)
                ol_style = s.get('ol', '')
                li_style = s.get('li', '')
                html_parts.append(f'<ol style="{ol_style}"><li style="{li_style}">{item_text}</li></ol>')
            continue

        # 空行
        if not line.strip():
            continue

        # 普通段落
        text = line.strip()

        # 行内代码
        def replace_code(match):
            code = match.group(1).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            style = s.get('code_inline', '')
            return f'<code style="{style}">{code}</code>'

        text = re.sub(r'`([^`]+)`', replace_code, text)
        text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)

        style = s.get('p', '')
        html_parts.append(f'<p style="{style}">{text}</p>')

    return ''.join(html_parts)


def render_html(content, theme):
    """渲染最终 HTML"""
    container_style = theme.get('container', '')
    wrapper = load_wrapper()
    html = wrapper.replace('{{container_style}}', container_style)
    html = html.replace('{{content}}', content)
    return html


def copy_to_clipboard(html):
    """复制 HTML 到剪贴板（仅 macOS）"""
    try:
        import AppKit
        from AppKit import NSPasteboard
        pb = NSPasteboard.generalPasteboard()
        pb.clearContents()
        pb.setString_forType_(html, "public.html")
        pb.setString_forType_(html, "Apple HTML pasteboard type")
        text_only = re.sub(r'<[^>]+>', ' ', html)
        text_only = re.sub(r'\s+', ' ', text_only).strip()
        pb.setString_forType_(text_only, "public.utf8-plain-text")
        return True
    except Exception:
        return False


def main():
    # 解析参数
    args = sys.argv[1:]
    output_file = None

    # 处理 --output 参数
    if '--output' in args:
        idx = args.index('--output')
        if idx + 1 < len(args):
            output_file = args[idx + 1]
            args = args[:idx] + args[idx + 2:]

    # 处理 list 命令
    if args and args[0] == 'list':
        available = list_themes()
        print("可用主题:")
        for t in available:
            print(f"  - {t}")
        sys.exit(0)

    if len(args) < 1:
        skill_dir = get_skill_dir()
        themes_dir = get_themes_dir()
        available = list_themes()
        print(f"用法: python3 fmt.py <md文件> [平台名] [--output <输出文件>]", file=sys.stderr)
        print(f"       python3 fmt.py list  # 列出可用主题", file=sys.stderr)
        print(f"\nSkill 目录: {skill_dir}", file=sys.stderr)
        print(f"主题目录: {themes_dir}", file=sys.stderr)
        print(f"\n可用主题: {', '.join(available) if available else '无'}", file=sys.stderr)
        print(f"\n默认平台: {DEFAULT_PLATFORM}", file=sys.stderr)
        sys.exit(1)

    md_file = args[0]
    platform = args[1] if len(args) > 1 else DEFAULT_PLATFORM

    try:
        with open(md_file, 'r', encoding='utf-8') as f:
            md_content = f.read()
    except FileNotFoundError:
        print(f"文件不存在: {md_file}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"读取文件失败: {e}", file=sys.stderr)
        sys.exit(1)

    # 加载主题
    theme = load_theme(platform)

    # 转换为 HTML
    html_content = md_to_html(md_content, theme)

    # 渲染最终 HTML
    full_html = render_html(html_content, theme)

    # 输出
    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(full_html)
        print(f"转换完成！({platform})")
        print(f"已保存到: {output_file}")
        print(f"文件大小: {len(full_html)} 字节")
    else:
        # 尝试复制到剪贴板
        if copy_to_clipboard(full_html):
            print(f"转换完成！({platform})")
            print(f"已复制 {len(full_html)} 字节到剪贴板")
        else:
            # 输出到 stdout
            print(full_html)


if __name__ == "__main__":
    main()
