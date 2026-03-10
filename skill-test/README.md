# skill-test：Claude Code Skill 测评工作台

一个用于系统测试 Claude Code skills 能力与质量的自动化测评工具。

---

## 功能介绍

skill-test 是一个运行在 Claude Code 中的 **agent**，通过 `CLAUDE.md` 驱动，自动完成：

- 🔍 **Skill 发现**：搜索本地已安装 + skills.sh 上的 skill
- 📝 **自动测试**：为每个 skill 生成测试 prompt 并执行
- 📊 **质量评分**：从输出质量、响应速度、指令遵循、实用性四个维度评分
- 📄 **报告生成**：自动生成单个 skill 的 REPORT.md 和汇总 SUMMARY.md

---

## 目录结构

```
creator/
├── CLAUDE.md              ← skill-test 的行为指令
├── README.md              ← 本文件
└── [业务类型]/            ← 如 writing、product、design
    ├── [skill名]/
    │   ├── input.md       ← 自动生成的测试 prompt
    │   ├── output.*       ← skill 产出物
    │   └── REPORT.md      ← 评分报告
    └── SUMMARY.md         ← 所有 skill 的汇总对比
```

---

## 快速开始

### 1. 进入项目目录

```bash
cd /Users/hardy/Work/creator
```

### 2. 启动 Claude Code

在该目录下启动 Claude Code，`CLAUDE.md` 会自动加载。

### 3. 开始测试

直接说一句话即可触发：

```
测试 写文章 相关skill
```

或直接测试指定 skill：

```
测试 humanizer-zh
```

---

## 使用指令

| 指令 | 说明 | 示例 |
|---|---|---|
| `测试 [xxx] 相关skill` | 搜索相关 skill → 列出候选 → 用户确认 → 逐个测试 | `测试 写文章 相关skill` |
| `测试 [skill名]` | 直接测试指定 skill，跳过搜索步骤 | `测试 humanizer-zh` |
| `进度` | 查看所有已完成的测试 | `进度` |
| `报告 [skill名]` | 查看某个 skill 的 REPORT.md | `报告 humanizer-zh` |
| `对比 [skill1] [skill2]` | 横向对比两个 skill 的评测结果 | `对比 humanizer-zh wechat-converter` |

---

## 工作流程

### 完整流程（以"测试 写文章 相关skill"为例）

```
Step 1: Skill 发现
├─ 搜索本地已安装 skill（从 system-reminder 读取）
├─ 执行 /find-skill 写文章
└─ 合并去重，列出候选表格

Step 2: 用户确认
└─ 用户选择要测试的 skill 编号（如：1 3 5）

Step 3: 逐个测试
对每个 skill：
├─ 创建目录 [业务类型]/[skill名]/
├─ 生成 input.md（贴近真实业务场景）
├─ 调用 skill（使用 Skill 工具）
├─ 保存产出物到 output.*
├─ 生成 REPORT.md（评分 + 亮点 + 不足）
└─ 输出测评摘要

Step 4: 生成汇总
└─ 在 [业务类型]/ 目录下生成 SUMMARY.md
   （总览表格 + 推荐使用 + 横向对比）
```

---

## 评分标准

每个 skill 从 4 个维度评分（1-5 分）：

| 维度 | 评估内容 |
|---|---|
| **输出质量** | 产出物是否符合预期，质量是否稳定 |
| **响应速度** | 执行速度，是否有明显延迟 |
| **指令遵循** | 是否完整执行 skill 定义的功能 |
| **实用性** | 对目标用户的实际价值 |

**总分**：20 分

---

## 测试案例

### 案例 1：写文章 skills 测评

**测试对象**：humanizer-zh、xiaohongshu-converter、wechat-converter

**测试结果**：

| Skill | 总分 | 核心发现 |
|---|---|---|
| humanizer-zh | 19/20 | ✅ 可直接调用，自动化程度高 |
| xiaohongshu-converter | 16/20 | ❌ 不可直接调用，需手动操作 |
| wechat-converter | 18/20 | 文档质量最高，但不可直接调用 |

**产出物**：`writing/` 目录下的完整测试报告

---

## 自动化规则

- ✅ 目录不存在时自动创建，无需确认
- ✅ input.md 由 Claude 根据 skill 用途自动生成
- ✅ 产出物直接写入目录，不在对话中重复输出
- ✅ 每轮测试结束后输出进度概览
- ✅ 所有 skill 测试完毕后自动生成 SUMMARY.md

---

## 技术架构

### 当前实现

- **类型**：Claude Code Agent（skill-test）
- **驱动**：`CLAUDE.md` 项目指令
- **工具权限**：All tools
- **触发方式**：用户说"测试 xxx 相关skill"

### 核心组件

1. **CLAUDE.md**：定义 agent 的行为逻辑和测试流程
2. **Agent 工具**：调用 skill-test agent 执行测试
3. **Skill 工具**：调用被测 skill
4. **find-skills**：搜索 skills.sh 上的 skill

---

## 已知限制

1. **不可直接调用的 skill**：如果 skill 设置了 `user-invocable: false`，无法用 Skill 工具自动调用，需手动按文档转换
2. **评分主观性**：评分基于 Claude 的判断，可能存在主观性
3. **测试场景单一**：每个 skill 只测试一个场景，可能无法覆盖所有功能

---

## 下一步计划

### 短期（本地验证）

- [x] 完成写文章 skills 测试
- [ ] 测试其他类型 skills（设计、产品、开发）
- [ ] 优化评分标准和报告模板
- [ ] 处理不可直接调用的 skill

### 中期（打包发布）

- [ ] 将 CLAUDE.md 逻辑提炼成 SKILL.md
- [ ] 本地安装测试：`npx skills add ./skill-test -g`
- [ ] 在不同项目中验证触发和执行效果

### 长期（发布到 skills.sh）

- [ ] 完善文档和示例
- [ ] 发布到 skills.sh：`npx skills publish`
- [ ] 收集用户反馈，持续优化

---

## 贡献指南

欢迎提交 Issue 和 PR：

- 报告 bug
- 建议新功能
- 分享测试案例
- 优化评分标准

---

## 许可证

MIT

---

**最后更新**：2026-03-10
