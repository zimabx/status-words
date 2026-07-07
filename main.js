const {
  Plugin,
  MarkdownView,
  PluginSettingTab,
  ButtonComponent,
  TextAreaComponent,
  DropdownComponent,
  ToggleComponent,
} = require("obsidian");

const DEFAULT_SETTINGS = {
  displayTemplate: "当前行：{{当前行字数}} 字　全文：{{全文字数}} 字",
  useThousandsSeparator: true,
  countingMode: "obsidian",
};

const COUNTING_MODE_SAMPLE_TEXT = "中文 ABC 123，空格 🙂";

const COUNTING_MODES = [
  {
    key: "obsidian",
    label: "Obsidian 风格",
    desc: "空格、标点、换行都会计入字符数。",
  },
  {
    key: "noWhitespace",
    label: "不计空白",
    desc: "不统计空格、制表符和换行。",
  },
  {
    key: "lettersAndNumbers",
    label: "文字与数字",
    desc: "只统计文字和数字，不统计空格、标点和符号。",
  },
  {
    key: "grapheme",
    label: "可见字符",
    desc: "按肉眼看到的字符统计，emoji 等组合字符通常算 1 个。",
  },
];

const TEMPLATE_PROPERTIES = [
  { key: "currentLineCount", label: "当前行字数" },
  { key: "currentParagraphCount", label: "当前段落字数" },
  { key: "noteCount", label: "全文字数" },

  { key: "selectionCount", label: "选中文本字数" },
  { key: "selectionLineCount", label: "选中文本行数" },
  { key: "selectionText", label: "选中文本" },

  { key: "currentLineText", label: "当前行文本" },
  { key: "currentParagraphText", label: "当前段落文本" },

  { key: "fileName", label: "文件名" },
  { key: "fileNameWithExtension", label: "完整文件名" },
  { key: "filePath", label: "文件路径" },

  { key: "cursorLine", label: "光标行号" },
  { key: "cursorColumn", label: "光标列号" },
  { key: "noteLineCount", label: "总行数" },
];

const LEGACY_RAW_PROPERTIES = [
  { key: "currentLineRawCount", label: "当前行原始字数" },
  { key: "currentParagraphRawCount", label: "当前段落原始字数" },
  { key: "noteRawCount", label: "全文原始字数" },
  { key: "selectionRawCount", label: "选中文本原始字数" },
];

const TEMPLATE_EXAMPLES = [
  {
    template:
      "当前行：{{当前行字数}} 字　当前段：{{当前段落字数}} 字　全文：{{全文字数}} 字",
    preview: "当前行：26 字　当前段：128 字　全文：1,284 字",
  },
  {
    template: "选中：{{选中文本字数}} 字　全文：{{全文字数}} 字",
    preview: "选中：56 字　全文：1,284 字",
  },
  {
    template: "{{文件名}}｜第 {{光标行号}} 行，第 {{光标列号}} 列",
    preview: "示例笔记｜第 8 行，第 16 列",
  },
  {
    template: "全文 {{全文字数}} 字｜共 {{总行数}} 行",
    preview: "全文 1,284 字｜共 120 行",
  },
];

const TEMPLATE_LABEL_TO_KEY = Object.fromEntries(
  [...TEMPLATE_PROPERTIES, ...LEGACY_RAW_PROPERTIES].map((item) => [
    item.label,
    item.key,
  ])
);

const TEMPLATE_KEY_TO_LABEL = Object.fromEntries(
  [...TEMPLATE_PROPERTIES, ...LEGACY_RAW_PROPERTIES].map((item) => [
    item.key,
    item.label,
  ])
);

module.exports = class CurrentLineAndNoteCountPlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    this.statusBar = this.addStatusBarItem();
    this.statusBar.addClass("current-line-note-count-status");

    this.lastCacheKey = "";

    this.addSettingTab(new CurrentLineAndNoteCountSettingTab(this.app, this));

    this.updateStatusBar(true);

    this.registerInterval(
      window.setInterval(() => {
        this.updateStatusBar();
      }, 300)
    );

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.resetCache();
        this.updateStatusBar(true);
      })
    );

    this.registerEvent(
      this.app.workspace.on("file-open", () => {
        this.resetCache();
        this.updateStatusBar(true);
      })
    );

    this.registerEvent(
      this.app.workspace.on("editor-change", () => {
        this.updateStatusBar(true);
      })
    );
  }

  onunload() {
    if (this.statusBar) {
      this.statusBar.remove();
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    const migratedTemplate = this.migrateLegacyTemplateToChinese(
      this.settings.displayTemplate || DEFAULT_SETTINGS.displayTemplate
    );

    if (migratedTemplate !== this.settings.displayTemplate) {
      this.settings.displayTemplate = migratedTemplate;
      await this.saveData(this.settings);
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.resetCache();
    this.updateStatusBar(true);
  }

  resetCache() {
    this.lastCacheKey = "";
  }

  updateStatusBar(force = false) {
    if (!this.statusBar) {
      return;
    }

    const data = this.getTemplateData(false);

    if (!data) {
      this.statusBar.setText("");
      return;
    }

    const template =
      this.settings.displayTemplate || DEFAULT_SETTINGS.displayTemplate;

    const output = this.renderTemplate(template, data);

    const cacheKey = JSON.stringify({
      template,
      output,
      useThousandsSeparator: this.settings.useThousandsSeparator,
      countingMode: this.settings.countingMode,
    });

    if (!force && this.lastCacheKey === cacheKey) {
      return;
    }

    this.lastCacheKey = cacheKey;
    this.statusBar.setText(output);
  }

  getTemplateData(useFallback = false) {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);

    if (!view || !view.editor) {
      return useFallback ? this.getFallbackTemplateData() : null;
    }

    const editor = view.editor;
    const cursor = editor.getCursor();

    const currentLineText = editor.getLine(cursor.line) ?? "";
    const currentParagraphText = this.getCurrentParagraphText(editor, cursor.line);
    const noteText = editor.getValue() ?? "";
    const selectionText = editor.getSelection() ?? "";

    const currentLineRawCount = this.countCharacters(currentLineText);
    const currentParagraphRawCount = this.countCharacters(currentParagraphText);
    const noteRawCount = this.countCharacters(noteText);
    const selectionRawCount = this.countCharacters(selectionText);

    const file = view.file;

    return {
      currentLineCount: this.formatCount(currentLineRawCount),
      currentParagraphCount: this.formatCount(currentParagraphRawCount),
      noteCount: this.formatCount(noteRawCount),
      selectionCount: this.formatCount(selectionRawCount),

      currentLineRawCount,
      currentParagraphRawCount,
      noteRawCount,
      selectionRawCount,

      selectionLineCount: this.getSelectionLineCount(selectionText),

      currentLineText,
      currentParagraphText,
      selectionText,

      fileName: file?.basename ?? "",
      fileNameWithExtension: file?.name ?? "",
      filePath: file?.path ?? "",

      cursorLine: cursor.line + 1,
      cursorColumn: cursor.ch + 1,
      noteLineCount: editor.lineCount(),
    };
  }

  getFallbackTemplateData() {
    return {
      currentLineCount: this.formatCount(26),
      currentParagraphCount: this.formatCount(128),
      noteCount: this.formatCount(1284),
      selectionCount: this.formatCount(56),

      currentLineRawCount: 26,
      currentParagraphRawCount: 128,
      noteRawCount: 1284,
      selectionRawCount: 56,

      selectionLineCount: 2,

      currentLineText: "这里会显示当前行文本",
      currentParagraphText: "这里会显示当前段落文本",
      selectionText: "这里会显示选中的文本",

      fileName: "示例笔记",
      fileNameWithExtension: "示例笔记.md",
      filePath: "文件夹/示例笔记.md",

      cursorLine: 8,
      cursorColumn: 16,
      noteLineCount: 120,
    };
  }

  getSelectionLineCount(selectionText) {
    if (!selectionText) {
      return 0;
    }

    return selectionText.split(/\r?\n/).length;
  }

  getCurrentParagraphText(editor, currentLine) {
    const totalLines = editor.lineCount();

    let startLine = currentLine;
    let endLine = currentLine;

    while (
      startLine > 0 &&
      ((editor.getLine(startLine - 1) ?? "").trim() !== "")
    ) {
      startLine--;
    }

    while (
      endLine < totalLines - 1 &&
      ((editor.getLine(endLine + 1) ?? "").trim() !== "")
    ) {
      endLine++;
    }

    const lines = [];

    for (let i = startLine; i <= endLine; i++) {
      lines.push(editor.getLine(i) ?? "");
    }

    return lines.join("\n");
  }

  renderTemplate(template, data) {
    return String(template ?? "").replace(
      /\{\{\s*([^{}]+?)\s*\}\}/g,
      (match, rawKey) => {
        const key = this.resolveTemplateKey(rawKey);

        if (!(key in data)) {
          return "";
        }

        return this.normalizeStatusBarText(data[key]);
      }
    );
  }

  resolveTemplateKey(rawKey) {
    const key = String(rawKey ?? "").trim();
    return TEMPLATE_LABEL_TO_KEY[key] || key;
  }

  migrateLegacyTemplateToChinese(template) {
    return String(template ?? "").replace(
      /\{\{\s*([^{}]+?)\s*\}\}/g,
      (match, rawKey) => {
        const key = String(rawKey ?? "").trim();
        const label = TEMPLATE_KEY_TO_LABEL[key];

        if (!label) {
          return match;
        }

        return `{{${label}}}`;
      }
    );
  }

  normalizeStatusBarText(value) {
    return String(value)
      .replace(/\r?\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  countCharacters(text) {
    const value = String(text ?? "");
    const mode = this.settings.countingMode || DEFAULT_SETTINGS.countingMode;

    if (mode === "noWhitespace") {
      return value.replace(/\s/g, "").length;
    }

    if (mode === "lettersAndNumbers") {
      return this.countLettersAndNumbers(value);
    }

    if (mode === "grapheme") {
      return this.countGraphemes(value);
    }

    return value.length;
  }

  countLettersAndNumbers(text) {
    try {
      const matches = text.match(/[\p{L}\p{N}]/gu);
      return matches ? matches.length : 0;
    } catch (error) {
      const fallbackMatches = text.match(/[A-Za-z0-9\u4e00-\u9fff]/g);
      return fallbackMatches ? fallbackMatches.length : 0;
    }
  }

  countGraphemes(text) {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter(undefined, {
        granularity: "grapheme",
      });

      return Array.from(segmenter.segment(text)).length;
    }

    return Array.from(text).length;
  }

  formatCount(num) {
    if (!this.settings.useThousandsSeparator) {
      return String(num);
    }

    return new Intl.NumberFormat().format(num);
  }
};

class CurrentLineAndNoteCountSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;

    this.templateTextAreaComponent = null;
    this.templateInputEl = null;
    this.previewValueEl = null;
    this.countingModePreviewEl = null;
  }

  display() {
    const { containerEl } = this;

    containerEl.empty();
    containerEl.addClass("current-line-note-count-settings");

    containerEl.createEl("h2", {
      text: "字数状态栏",
      cls: "current-line-note-count-title",
    });

    this.createTemplateCard(containerEl);
    this.createPropertiesCard(containerEl);
    this.createExamplesCard(containerEl);
    this.createCountingModeCard(containerEl);
    this.createThousandsSeparatorCard(containerEl);

    this.updatePreview();
    this.updateCountingModePreview();
  }

  createTemplateCard(containerEl) {
    const cardEl = containerEl.createDiv({
      cls: "current-line-note-count-card current-line-note-count-template-card",
    });

    const headerEl = cardEl.createDiv({
      cls: "current-line-note-count-card-header",
    });

    headerEl.createEl("h3", {
      text: "显示模板",
      cls: "current-line-note-count-card-title",
    });

    const resetWrapEl = headerEl.createDiv({
      cls: "current-line-note-count-reset-button-wrap",
    });

    const resetButton = new ButtonComponent(resetWrapEl);

    resetButton
      .setButtonText("重置")
      .onClick(async () => {
        this.plugin.settings.displayTemplate = DEFAULT_SETTINGS.displayTemplate;
        await this.plugin.saveSettings();

        if (this.templateTextAreaComponent) {
          this.templateTextAreaComponent.setValue(DEFAULT_SETTINGS.displayTemplate);
        }

        this.syncTemplateInputEl();
        this.autoResizeTextarea();

        if (this.templateInputEl) {
          this.templateInputEl.focus();
        }

        this.updatePreview();
      });

    const textAreaWrapEl = cardEl.createDiv({
      cls: "current-line-note-count-template-textarea-wrap",
    });

    this.templateTextAreaComponent = new TextAreaComponent(textAreaWrapEl);

    this.templateTextAreaComponent
      .setPlaceholder(DEFAULT_SETTINGS.displayTemplate)
      .setValue(
        this.plugin.settings.displayTemplate || DEFAULT_SETTINGS.displayTemplate
      )
      .onChange(async (value) => {
        this.plugin.settings.displayTemplate =
          value.trim() || DEFAULT_SETTINGS.displayTemplate;

        await this.plugin.saveSettings();

        this.syncTemplateInputEl();
        this.autoResizeTextarea();
        this.updatePreview();
      });

    this.syncTemplateInputEl();

    if (this.templateInputEl) {
      this.templateInputEl.setAttr("spellcheck", "false");
      this.templateInputEl.setAttr("rows", "3");
    }

    const previewEl = cardEl.createDiv({
      cls: "current-line-note-count-compact-preview",
    });

    previewEl.createSpan({
      text: "预览",
      cls: "current-line-note-count-compact-preview-label",
    });

    this.previewValueEl = previewEl.createSpan({
      cls: "current-line-note-count-compact-preview-value",
    });

    window.setTimeout(() => {
      this.syncTemplateInputEl();
      this.autoResizeTextarea();
      this.updatePreview();
    }, 0);
  }

  createPropertiesCard(containerEl) {
    const cardEl = containerEl.createDiv({
      cls: "current-line-note-count-card",
    });

    cardEl.createEl("h3", {
      text: "可用属性",
      cls: "current-line-note-count-card-title",
    });

    cardEl.createEl("p", {
      text: "点击属性可插入到上方模板的光标位置。",
      cls: "current-line-note-count-section-desc",
    });

    const flowEl = cardEl.createDiv({
      cls: "current-line-note-count-property-flow",
    });

    for (const property of TEMPLATE_PROPERTIES) {
      const buttonWrapEl = flowEl.createDiv({
        cls: "current-line-note-count-property-button-wrap",
      });

      const button = new ButtonComponent(buttonWrapEl);

      button
        .setButtonText(property.label)
        .onClick(async () => {
          await this.insertPropertyToTemplate(property.label);
        });
    }
  }

  createExamplesCard(containerEl) {
    const cardEl = containerEl.createDiv({
      cls: "current-line-note-count-card current-line-note-count-examples-card",
    });

    cardEl.createEl("h3", {
      text: "模板示例",
      cls: "current-line-note-count-card-title",
    });

    const listEl = cardEl.createDiv({
      cls: "current-line-note-count-example-list",
    });

    for (const example of TEMPLATE_EXAMPLES) {
      const buttonWrapEl = listEl.createDiv({
        cls: "current-line-note-count-example-button-wrap",
      });

      const button = new ButtonComponent(buttonWrapEl);

      button
        .setButtonText(example.preview)
        .onClick(async () => {
          this.plugin.settings.displayTemplate = example.template;
          await this.plugin.saveSettings();

          if (this.templateTextAreaComponent) {
            this.templateTextAreaComponent.setValue(example.template);
          }

          this.syncTemplateInputEl();
          this.autoResizeTextarea();

          if (this.templateInputEl) {
            this.templateInputEl.focus();
          }

          this.updatePreview();
        });
    }
  }

  createCountingModeCard(containerEl) {
    const cardEl = containerEl.createDiv({
      cls: "current-line-note-count-card current-line-note-count-mode-card",
    });

    cardEl.createEl("h3", {
      text: "统计模式",
      cls: "current-line-note-count-card-title",
    });

    const controlRowEl = cardEl.createDiv({
      cls: "current-line-note-count-mode-control-row",
    });

    const dropdownWrapEl = controlRowEl.createDiv({
      cls: "current-line-note-count-dropdown-wrap",
    });

    const descEl = controlRowEl.createDiv({
      cls: "current-line-note-count-mode-desc-inline",
    });

    const dropdown = new DropdownComponent(dropdownWrapEl);

    for (const mode of COUNTING_MODES) {
      dropdown.addOption(mode.key, mode.label);
    }

    dropdown.setValue(
      this.plugin.settings.countingMode || DEFAULT_SETTINGS.countingMode
    );

    const updateModeDesc = () => {
      const currentMode = COUNTING_MODES.find(
        (mode) => mode.key === dropdown.getValue()
      );

      descEl.setText(currentMode?.desc ?? "");
    };

    updateModeDesc();

    dropdown.onChange(async (value) => {
      this.plugin.settings.countingMode = value;
      await this.plugin.saveSettings();

      updateModeDesc();
      this.updatePreview();
      this.updateCountingModePreview();
    });

    const previewEl = cardEl.createDiv({
      cls: "current-line-note-count-mode-preview",
    });

    previewEl.createSpan({
      text: "预览",
      cls: "current-line-note-count-mode-preview-label",
    });

    this.countingModePreviewEl = previewEl.createSpan({
      cls: "current-line-note-count-mode-preview-value",
    });
  }

  createThousandsSeparatorCard(containerEl) {
    const cardEl = containerEl.createDiv({
      cls: "current-line-note-count-card current-line-note-count-setting-row current-line-note-count-simple-row",
    });

    cardEl.createEl("h3", {
      text: "数字千分位分隔",
      cls: "current-line-note-count-card-title",
    });

    const toggleWrapEl = cardEl.createDiv({
      cls: "current-line-note-count-toggle-wrap",
    });

    const toggle = new ToggleComponent(toggleWrapEl);

    toggle
      .setValue(this.plugin.settings.useThousandsSeparator)
      .onChange(async (checked) => {
        this.plugin.settings.useThousandsSeparator = checked;
        await this.plugin.saveSettings();

        this.updatePreview();
        this.updateCountingModePreview();
      });
  }

  syncTemplateInputEl() {
    if (this.templateTextAreaComponent?.inputEl) {
      this.templateInputEl = this.templateTextAreaComponent.inputEl;
      return;
    }

    this.templateInputEl =
      this.templateInputEl ||
      document.querySelector(
        ".current-line-note-count-template-textarea-wrap textarea"
      );
  }

  async insertPropertyToTemplate(label) {
    this.syncTemplateInputEl();

    if (!this.templateInputEl) {
      return;
    }

    const token = `{{${label}}}`;
    const inputEl = this.templateInputEl;

    const start = inputEl.selectionStart ?? inputEl.value.length;
    const end = inputEl.selectionEnd ?? inputEl.value.length;

    const before = inputEl.value.slice(0, start);
    const after = inputEl.value.slice(end);

    const shouldAddSpaceBefore =
      before.length > 0 && !/\s$/.test(before) ? " " : "";

    const shouldAddSpaceAfter =
      after.length > 0 && !/^\s/.test(after) ? " " : "";

    const insertText = `${shouldAddSpaceBefore}${token}${shouldAddSpaceAfter}`;

    inputEl.value = `${before}${insertText}${after}`;

    const cursorPosition = before.length + insertText.length;
    inputEl.setSelectionRange(cursorPosition, cursorPosition);
    inputEl.focus();

    this.plugin.settings.displayTemplate =
      inputEl.value.trim() || DEFAULT_SETTINGS.displayTemplate;

    await this.plugin.saveSettings();

    if (this.templateTextAreaComponent) {
      this.templateTextAreaComponent.setValue(inputEl.value);
    }

    this.autoResizeTextarea();
    this.updatePreview();
  }

  autoResizeTextarea() {
    this.syncTemplateInputEl();

    if (!this.templateInputEl) {
      return;
    }

    const textarea = this.templateInputEl;
    const computedStyle = window.getComputedStyle(textarea);

    const lineHeight = parseFloat(computedStyle.lineHeight) || 22.4;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;

    const minHeight =
      lineHeight * 3 + paddingTop + paddingBottom + borderTop + borderBottom;

    const maxHeight =
      lineHeight * 5 + paddingTop + paddingBottom + borderTop + borderBottom;

    textarea.style.height = "auto";

    const nextHeight = Math.min(
      Math.max(textarea.scrollHeight, minHeight),
      maxHeight
    );

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }

  updatePreview() {
    if (!this.previewValueEl) {
      return;
    }

    const template =
      this.templateInputEl?.value.trim() ||
      this.plugin.settings.displayTemplate ||
      DEFAULT_SETTINGS.displayTemplate;

    const data = this.plugin.getTemplateData(true);
    const output = this.plugin.renderTemplate(template, data);

    this.previewValueEl.setText(output || "预览内容为空");
  }

  updateCountingModePreview() {
    if (!this.countingModePreviewEl) {
      return;
    }

    const count = this.plugin.countCharacters(COUNTING_MODE_SAMPLE_TEXT);
    const formattedCount = this.plugin.formatCount(count);

    this.countingModePreviewEl.setText(
      `“${COUNTING_MODE_SAMPLE_TEXT}” 统计为 ${formattedCount} 字`
    );
  }
}