/**
 * WeChat Article Toolkit - Public API
 */

export { WeChatConverter, previewHtml, type ConvertResult, type ConverterOptions } from './converter.js';
export {
  generateTheme,
  listThemes,
  listPresetColors,
  ColorPalette,
  PRESET_COLORS,
  PRESET_COLOR_LIST,
  DEFAULT_COLOR,
  DEFAULT_THEME,
  type Theme,
  type ThemeKey,
  type ThemeStyles,
  type ThemeOptions,
  type HeadingSize,
  type ParagraphSpacing,
  type FontFamily,
} from './theme-engine.js';
export { createDraft, type DraftResult, type CreateDraftOptions } from './publisher.js';
export { getAccessToken, uploadImage, uploadThumb } from './wechat-api.js';
export {
  generateGemini, generateOpenAI, generateDoubao,
  selectFallbackCover, downloadFallbackCover, resolveProvider,
  GENERATORS, SIZE_MAP,
} from './image-gen.js';
export { analyzeDiff, type DiffAnalysis } from './learn-edits.js';
export { latexToSvg, convertMathToHtml, processMathInHtml } from './math-processor.js';
export { renderMermaidToPng, processMermaidBlocks, isMermaidAvailable } from './mermaid-processor.js';
export { enhanceCodeBlocks } from './code-block-processor.js';
