---
name: skill-test
description: Automated testing and evaluation framework for Claude Code skills. Discovers skills, generates test cases, executes tests, and produces standardized quality reports with scoring across multiple dimensions.
---

# skill-test: Claude Code Skill Testing Framework

Automated testing and quality evaluation for Claude Code skills. Helps you discover, test, compare, and select the best skills for your needs.

## When to Use This Skill

Use this skill when you want to:

- **Discover skills**: Search for skills related to a specific topic or task
- **Evaluate quality**: Test a skill's output quality, speed, and reliability
- **Compare options**: Benchmark multiple skills side-by-side
- **Make decisions**: Get data-driven recommendations on which skill to use

## Trigger Phrases

- `测试 [topic] 相关skill` - Search and test skills related to a topic
- `测试 [skill-name]` - Test a specific skill directly
- `test [topic] skills` - English version of topic search
- `test [skill-name]` - English version of direct test

## How It Works

### 1. Skill Discovery

When you say "测试 写文章 相关skill":

1. **Local search**: Scans installed skills from system context
2. **Remote search**: Queries skills.sh via `find-skills`
3. **Merge & rank**: Combines results, removes duplicates, ranks by install count
4. **Present options**: Shows a table with skill names, sources, install counts, and descriptions

Example output:

```
找到以下与「写文章」相关的 skill：

| # | skill 名称 | 来源 | 安装量 | 简介 |
|---|---|---|---|---|
| 1 | humanizer-zh | 本地已安装 | - | 去除 AI 生成痕迹 |
| 2 | latex-thesis-zh | find-skill | 315 | 中文 LaTeX 学术论文写作 |
| 3 | xiaohongshu-converter | find-skill | 269 | 小红书风格文章转换 |

请确认要测试哪些？（可多选，输入编号，如：1 2 3）
```

### 2. Test Execution

For each selected skill:

**Step 1: Setup**
- Creates directory: `[category]/[skill-name]/`
- Generates realistic test input: `input.md`
- Records start time and initial usage

**Step 2: Execution**
- Invokes the skill using the Skill tool
- Captures output and execution time
- Handles errors gracefully
- Tracks token usage during execution

**Step 3: Cost Analysis**
- Runs `/usage` to get token consumption
- Runs `/cost` to calculate API costs
- Exports conversation with `/export` to `process.md`
- Records performance metrics

**Step 4: Evaluation**
- Saves output to `output.*`
- Generates `REPORT.md` with:
  - 5-dimension scoring (1-5 scale): quality, speed, instruction following, practicality, **cost-efficiency**
  - Token usage and cost breakdown
  - Execution time analysis
  - Highlights and weaknesses
  - Conclusion and recommendations

**Step 5: Summary**
- Outputs brief test summary with cost metrics
- Continues to next skill

### 3. Report Generation

After all tests complete, generates `SUMMARY.md` with:

- **Comparison table**: All skills scored side-by-side
- **Key findings**: Major insights from testing
- **Recommendations**: Which skill to use for which scenario
- **Detailed analysis**: Strengths, weaknesses, and trade-offs

## Scoring Dimensions

Each skill is scored 1-5 on five dimensions:

| Dimension | What It Measures |
|---|---|
| **Output Quality** | Accuracy, completeness, and polish of results |
| **Response Speed** | Execution time and performance |
| **Instruction Following** | How well it adheres to its documented behavior |
| **Practicality** | Real-world usefulness and value |
| **Cost Efficiency** | Token usage and API cost relative to value delivered |

**Total Score**: 25 points maximum

### Cost Efficiency Scoring Guide

- **5 points**: Minimal tokens, excellent value (< 5k tokens for simple tasks)
- **4 points**: Reasonable usage (5k-15k tokens)
- **3 points**: Moderate usage (15k-30k tokens)
- **2 points**: High usage (30k-50k tokens)
- **1 point**: Excessive usage (> 50k tokens)

## Output Structure

```
[category]/
├── [skill-name-1]/
│   ├── input.md      ← Generated test prompt
│   ├── output.*      ← Skill output
│   ├── process.md    ← Exported conversation (via /export)
│   └── REPORT.md     ← Individual evaluation with cost analysis
├── [skill-name-2]/
│   ├── input.md
│   ├── output.*
│   ├── process.md
│   └── REPORT.md
└── SUMMARY.md        ← Comparative analysis with cost comparison
```

## Example Usage

### Example 1: Find the best writing skill

**Input:**
```
测试 写文章 相关skill
```

**Process:**
1. Finds 8 writing-related skills
2. User selects 3 to test
3. Tests each with realistic writing tasks
4. Generates comparative report

**Output:**
- `writing/humanizer-zh/` - Score: 19/20
- `writing/xiaohongshu-converter/` - Score: 16/20
- `writing/wechat-converter/` - Score: 18/20
- `writing/SUMMARY.md` - Recommendation: Use humanizer-zh for general use

### Example 2: Verify a specific skill

**Input:**
```
测试 humanizer-zh
```

**Process:**
1. Skips discovery phase
2. Generates test case for AI text humanization
3. Executes skill and captures output
4. Produces detailed evaluation report

**Output:**
- `writing/humanizer-zh/REPORT.md` with full analysis

## Automation Rules

- ✅ Directories created automatically
- ✅ Test inputs generated based on skill purpose
- ✅ Outputs saved to files (not shown in chat)
- ✅ Progress updates after each test
- ✅ Summary generated when all tests complete

## Handling Special Cases

### Non-invocable Skills

Some skills have `user-invocable: false` and cannot be called directly.

**Behavior**: skill-test will:
1. Read the skill's documentation
2. Manually apply its instructions
3. Note the limitation in the report
4. Score "Response Speed" lower due to manual process

### Failed Tests

If a skill fails or errors:
1. Error is captured in the report
2. Scoring reflects the failure
3. Testing continues with remaining skills

### Missing Skills

If a skill needs installation:
1. Prompts user for confirmation
2. Runs `npx skills add [package] -g -y`
3. Proceeds with testing

## Best Practices

1. **Test multiple skills**: Compare at least 2-3 options for better insights
2. **Review outputs**: Check the actual output files, not just scores
3. **Consider context**: A lower-scored skill might be better for your specific use case
4. **Read summaries**: The SUMMARY.md provides the most valuable insights

## Limitations

- Each skill tested with only one scenario (may not cover all features)
- Scoring has subjective elements based on AI judgment
- Non-invocable skills require manual execution (slower, less automated)
- Test quality depends on generated input.md relevance

## Commands Reference

| Command | Action |
|---|---|
| `测试 [topic] 相关skill` | Discover and test skills for a topic |
| `测试 [skill-name]` | Test a specific skill |
| `进度` | Show testing progress |
| `报告 [skill-name]` | View a skill's report |
| `对比 [skill1] [skill2]` | Compare two skills |

## Technical Details

- **Type**: Claude Code Agent
- **Tools**: All tools available
- **Trigger**: User message matching patterns
- **Execution**: Runs as subagent via Agent tool
- **State**: Stateless (each invocation is independent)

## Future Enhancements

- Multi-scenario testing per skill
- Custom test case support
- Performance benchmarking
- Regression testing for skill updates
- Export reports to JSON/CSV

---

**Version**: 1.0.0
**Last Updated**: 2026-03-10
**Compatibility**: Claude Code CLI
