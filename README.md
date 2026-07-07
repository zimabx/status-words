# StatusWords

[Simplified Chinese](README.zh-CN.md)

Show customizable word and character statistics in the Obsidian status bar.

StatusWords displays live statistics for the current note, current line,
current paragraph, selected text, cursor position, and file information.

## Features

- Show character counts for the current line, current paragraph, full note, and selected text.
- Display selection line count, cursor position, file name, and file path.
- Customize the status bar text with templates.
- Choose from multiple counting modes.
- Follow the current Obsidian interface language for English and Simplified Chinese UI text.
- Use readable localized template placeholders, with compatibility for raw placeholder keys.

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

The settings UI follows the current Obsidian interface language. Chinese and
English template placeholders can both be rendered, so existing templates keep
working when the interface language changes.

### Template examples

```text
Line: {{Current line count}}  Note: {{Note count}}
Note {{Note count}} | {{Total lines}} lines
{{File name}} | Line {{Cursor line}}, column {{Cursor column}}
```

### Available template values

- `currentLineCount`
- `currentParagraphCount`
- `noteCount`
- `selectionCount`
- `selectionLineCount`
- `fileName`
- `fileNameWithExtension`
- `filePath`
- `cursorLine`
- `cursorColumn`
- `noteLineCount`

### Counting modes

- Obsidian style: counts spaces, punctuation, and line breaks.
- No whitespace: excludes spaces, tabs, and line breaks.
- Letters and numbers: counts only letters and numbers.
- Grapheme: counts visible characters, so combined characters such as emoji usually count as one.

## Privacy

StatusWords does not make network requests, collect telemetry, or send content
to external services. It only reads text from the current editor to calculate
statistics locally.

## License

MIT
