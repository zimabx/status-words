# StatusWords

Show customizable word and character statistics in the Obsidian status bar.

StatusWords displays live statistics for the current note, current line,
current paragraph, selected text, cursor position, and file information.

## Features

- Show character counts for the current line, current paragraph, full note, and selected text.
- Display selection line count, cursor position, file name, and file path.
- Customize the status bar text with templates.
- Choose from multiple counting modes.
- Use Chinese template placeholders, with compatibility for legacy English placeholders.

## Installation

### From the community plugin directory

1. Open Obsidian settings.
2. Go to **Community plugins**.
3. Search for **StatusWords**.
4. Install and enable the plugin.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Create this folder in your vault: `.obsidian/plugins/status-words/`.
3. Put the downloaded files into that folder.
4. Restart Obsidian.
5. Enable StatusWords in **Settings > Community plugins**.

## Usage

After enabling the plugin, the status bar shows statistics for the active note.

Open the plugin settings to customize the display template, counting mode, and
thousands separator.

### Template examples

```text
当前行：{{当前行字数}} 字　全文：{{全文字数}} 字
全文 {{全文字数}} 字｜共 {{总行数}} 行
{{文件名}}｜第 {{光标行号}} 行，第 {{光标列号}} 列
```

### Available template values

- 当前行字数
- 当前段落字数
- 全文字数
- 选中文本字数
- 选中文本行数
- 文件名
- 完整文件名
- 文件路径
- 光标行号
- 光标列号
- 总行数

### Counting modes

- Obsidian style: counts spaces, punctuation, and line breaks.
- No whitespace: excludes spaces, tabs, and line breaks.
- Letters and numbers: counts only letters and numbers.
- Grapheme: counts visible characters, so combined characters such as emoji usually count as one.

## Privacy

StatusWords does not make network requests, collect telemetry, or send content
to external services. It only reads text from the current editor to calculate
statistics locally.

## 中文说明

在 Obsidian 状态栏中显示可自定义的单词和字符统计。

## 功能

- 当前行字符数
- 当前段落字符数
- 整篇笔记字符数
- 选中文本统计
- 自定义显示模板
- 多种计数模式
- 中文模板占位符，同时兼容旧版英文占位符

## 使用方法

启用插件后，状态栏会显示当前笔记的统计信息。

打开插件设置，可以自定义显示模板、计数模式和数字千分位分隔。

## 模板示例

```text
当前行：{{当前行字数}} 字　全文：{{全文字数}} 字
全文 {{全文字数}} 字｜共 {{总行数}} 行
{{文件名}}｜第 {{光标行号}} 行，第 {{光标列号}} 列
```

## 可用统计

- 当前行字数
- 当前段落字数
- 全文字数
- 选中文本字数
- 选中文本行数
- 文件名
- 完整文件名
- 文件路径
- 光标行号
- 光标列号
- 总行数

## 计数模式

- Obsidian 风格：空格、标点、换行都会计入字符数。
- 不计空白：不统计空格、制表符和换行。
- 文字与数字：只统计文字和数字，不统计空格、标点和符号。
- 可见字符：按肉眼看到的字符统计，emoji 等组合字符通常算 1 个。

## 手动安装

1. 下载发布版本中的 `main.js`、`manifest.json` 和 `styles.css`。
2. 在仓库的 `.obsidian/plugins/status-words/` 目录中放入这些文件。
3. 重启 Obsidian。
4. 在设置中的社区插件列表里启用 StatusWords。

## 隐私

StatusWords 不联网，不收集遥测数据，不向外部服务发送任何内容。插件只读取当前 Obsidian 编辑器中的文本，用于在本地计算并显示统计信息。

## License

MIT
