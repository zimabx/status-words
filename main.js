const {
  Plugin,
  MarkdownView,
  PluginSettingTab,
  ButtonComponent,
  TextAreaComponent,
  DropdownComponent,
  ToggleComponent,
  getLanguage,
} = require("obsidian");

const DEFAULT_SETTINGS = {
  displayTemplate: "",
  useThousandsSeparator: true,
  countingMode: "obsidian",
};

const DEFAULT_LOCALE = "en";

const I18N = {
  en: {
    defaultDisplayTemplate: "Line: {{Current line count}}  Note: {{Note count}}",
    settingsTitle: "Status bar word count",
    templateTitle: "Display template",
    reset: "Reset",
    preview: "Preview",
    propertiesTitle: "Available properties",
    propertiesDescription:
      "Click a property to insert it at the cursor position in the template above.",
    examplesTitle: "Template examples",
    countingModeTitle: "Counting mode",
    thousandsSeparatorTitle: "Thousands separator",
    emptyPreview: "Preview is empty",
    countingModeSampleText: "Text ABC 123, spaces 🙂",
    countingModePreview: '"{{sample}}" counts as {{count}} characters',
    fallbackCurrentLineText: "Current line text appears here",
    fallbackCurrentParagraphText: "Current paragraph text appears here",
    fallbackSelectionText: "Selected text appears here",
    fallbackFileName: "Sample note",
    fallbackFileNameWithExtension: "Sample note.md",
    fallbackFilePath: "Folder/Sample note.md",
  },
  zh: {
    defaultDisplayTemplate: "当前行：{{当前行字数}} 字　全文：{{全文字数}} 字",
    settingsTitle: "字数状态栏",
    templateTitle: "显示模板",
    reset: "重置",
    preview: "预览",
    propertiesTitle: "可用属性",
    propertiesDescription: "点击属性可插入到上方模板的光标位置。",
    examplesTitle: "模板示例",
    countingModeTitle: "统计模式",
    thousandsSeparatorTitle: "数字千分位分隔",
    emptyPreview: "预览内容为空",
    countingModeSampleText: "中文 ABC 123，空格 🙂",
    countingModePreview: "“{{sample}}” 统计为 {{count}} 字",
    fallbackCurrentLineText: "这里会显示当前行文本",
    fallbackCurrentParagraphText: "这里会显示当前段落文本",
    fallbackSelectionText: "这里会显示选中的文本",
    fallbackFileName: "示例笔记",
    fallbackFileNameWithExtension: "示例笔记.md",
    fallbackFilePath: "文件夹/示例笔记.md",
  },
};

const COUNTING_MODE_DEFINITIONS = [
  {
    key: "obsidian",
    labels: {
      en: "Obsidian style",
      zh: "Obsidian 风格",
    },
    descriptions: {
      en: "Spaces, punctuation, and line breaks are included in the count.",
      zh: "空格、标点、换行都会计入字符数。",
    },
  },
  {
    key: "noWhitespace",
    labels: {
      en: "Ignore whitespace",
      zh: "不计空白",
    },
    descriptions: {
      en: "Spaces, tabs, and line breaks are excluded.",
      zh: "不统计空格、制表符和换行。",
    },
  },
  {
    key: "lettersAndNumbers",
    labels: {
      en: "Letters and numbers",
      zh: "文字与数字",
    },
    descriptions: {
      en: "Only letters and numbers are counted.",
      zh: "只统计文字和数字，不统计空格、标点和符号。",
    },
  },
  {
    key: "grapheme",
    labels: {
      en: "Visible characters",
      zh: "可见字符",
    },
    descriptions: {
      en: "Counts user-visible characters; emoji sequences usually count as 1.",
      zh: "按肉眼看到的字符统计，emoji 等组合字符通常算 1 个。",
    },
  },
];

const TEMPLATE_PROPERTY_DEFINITIONS = [
  { key: "currentLineCount", labels: { en: "Current line count", zh: "当前行字数" } },
  {
    key: "currentParagraphCount",
    labels: { en: "Current paragraph count", zh: "当前段落字数" },
  },
  { key: "noteCount", labels: { en: "Note count", zh: "全文字数" } },

  { key: "selectionCount", labels: { en: "Selection count", zh: "选中文本字数" } },
  { key: "selectionLineCount", labels: { en: "Selection lines", zh: "选中文本行数" } },
  { key: "selectionText", labels: { en: "Selection text", zh: "选中文本" } },

  { key: "currentLineText", labels: { en: "Current line text", zh: "当前行文本" } },
  {
    key: "currentParagraphText",
    labels: { en: "Current paragraph text", zh: "当前段落文本" },
  },

  { key: "fileName", labels: { en: "File name", zh: "文件名" } },
  { key: "fileNameWithExtension", labels: { en: "Full file name", zh: "完整文件名" } },
  { key: "filePath", labels: { en: "File path", zh: "文件路径" } },

  { key: "cursorLine", labels: { en: "Cursor line", zh: "光标行号" } },
  { key: "cursorColumn", labels: { en: "Cursor column", zh: "光标列号" } },
  { key: "noteLineCount", labels: { en: "Total lines", zh: "总行数" } },
];

const LEGACY_RAW_PROPERTY_DEFINITIONS = [
  {
    key: "currentLineRawCount",
    labels: { en: "Current line raw count", zh: "当前行原始字数" },
  },
  {
    key: "currentParagraphRawCount",
    labels: { en: "Current paragraph raw count", zh: "当前段落原始字数" },
  },
  { key: "noteRawCount", labels: { en: "Note raw count", zh: "全文原始字数" } },
  {
    key: "selectionRawCount",
    labels: { en: "Selection raw count", zh: "选中文本原始字数" },
  },
];

const TEMPLATE_EXAMPLES = [
  {
    templates: {
      en:
        "Line: {{Current line count}}  Paragraph: {{Current paragraph count}}  Note: {{Note count}}",
      zh:
        "当前行：{{当前行字数}} 字　当前段：{{当前段落字数}} 字　全文：{{全文字数}} 字",
    },
  },
  {
    templates: {
      en: "Selection: {{Selection count}}  Note: {{Note count}}",
      zh: "选中：{{选中文本字数}} 字　全文：{{全文字数}} 字",
    },
  },
  {
    templates: {
      en: "{{File name}} | Line {{Cursor line}}, column {{Cursor column}}",
      zh: "{{文件名}}｜第 {{光标行号}} 行，第 {{光标列号}} 列",
    },
  },
  {
    templates: {
      en: "Note {{Note count}} | {{Total lines}} lines",
      zh: "全文 {{全文字数}} 字｜共 {{总行数}} 行",
    },
  },
];

const TEMPLATE_DEFINITIONS = [
  ...TEMPLATE_PROPERTY_DEFINITIONS,
  ...LEGACY_RAW_PROPERTY_DEFINITIONS,
];

const TEMPLATE_LABEL_TO_KEY = TEMPLATE_DEFINITIONS.reduce((labels, item) => {
  for (const label of Object.values(item.labels)) {
    labels[label] = item.key;
  }

  return labels;
}, {});

const NUMBER_FORMATTER = new Intl.NumberFormat();

const GRAPHEME_SEGMENTER =
  typeof Intl !== "undefined" && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function getPluginLocale() {
  const language = typeof getLanguage === "function" ? getLanguage() : "";

  return String(language).toLowerCase().startsWith("zh") ? "zh" : "en";
}

module.exports = class CurrentLineAndNoteCountPlugin extends Plugin {
  async onload() {
    this.refreshLocale();
    await this.loadSettings();

    this.statusBar = this.addStatusBarItem();
    this.statusBar.addClass("current-line-note-count-status");

    this.lastCacheKey = "";
    this.noteLevelCache = null;

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
        this.noteLevelCache = null;
        this.updateStatusBar(true);
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (
          !this.isActiveFilePath(file?.path) &&
          !this.isActiveFilePath(oldPath)
        ) {
          return;
        }

        this.resetCache();
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

    if (!this.settings.displayTemplate) {
      this.settings.displayTemplate = this.getDefaultDisplayTemplate();
    }

    const migratedTemplate = this.migrateLegacyTemplateToLocalized(
      this.settings.displayTemplate
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

  refreshLocale() {
    this.locale = getPluginLocale();
    return this.locale;
  }

  getLocale() {
    return this.locale || getPluginLocale();
  }

  t(key) {
    const localeText = I18N[this.getLocale()] || I18N[DEFAULT_LOCALE];
    return localeText[key] ?? I18N[DEFAULT_LOCALE][key] ?? key;
  }

  formatText(key, values = {}) {
    return this.t(key).replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, rawKey) => {
      const valueKey = String(rawKey ?? "").trim();

      return valueKey in values ? String(values[valueKey]) : match;
    });
  }

  getDefaultDisplayTemplate() {
    return this.t("defaultDisplayTemplate");
  }

  getCountingModes() {
    const locale = this.getLocale();

    return COUNTING_MODE_DEFINITIONS.map((mode) => ({
      key: mode.key,
      label: mode.labels[locale] || mode.labels[DEFAULT_LOCALE],
      desc: mode.descriptions[locale] || mode.descriptions[DEFAULT_LOCALE],
    }));
  }

  getTemplateProperties() {
    const locale = this.getLocale();

    return TEMPLATE_PROPERTY_DEFINITIONS.map((property) => ({
      key: property.key,
      label: this.getTemplateLabel(property.key, locale),
    }));
  }

  getTemplateExamples() {
    const locale = this.getLocale();

    return TEMPLATE_EXAMPLES.map((example) => ({
      template:
        example.templates[locale] || example.templates[DEFAULT_LOCALE],
    }));
  }

  getTemplateLabel(key, locale = this.getLocale()) {
    const definition = TEMPLATE_DEFINITIONS.find((item) => item.key === key);

    return (
      definition?.labels[locale] ||
      definition?.labels[DEFAULT_LOCALE] ||
      key
    );
  }

  resetCache() {
    this.lastCacheKey = "";
    this.noteLevelCache = null;
  }

  isActiveFilePath(path) {
    const activeFile = this.app.workspace.getActiveFile();

    return !!path && !!activeFile && activeFile.path === path;
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
      this.settings.displayTemplate || this.getDefaultDisplayTemplate();

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

    this.refreshNoteLevelCache(editor, view.file);

    const currentLineText = editor.getLine(cursor.line) ?? "";
    const currentParagraphText = this.getCurrentParagraphText(editor, cursor.line);
    const selectionText = editor.getSelection() ?? "";

    const currentLineRawCount = this.countCharacters(currentLineText);
    const currentParagraphRawCount = this.countCharacters(currentParagraphText);
    const selectionRawCount = this.countCharacters(selectionText);

    return {
      currentLineCount: this.formatCount(currentLineRawCount),
      currentParagraphCount: this.formatCount(currentParagraphRawCount),
      noteCount: this.formatCount(this.noteLevelCache.noteRawCount),
      selectionCount: this.formatCount(selectionRawCount),

      currentLineRawCount,
      currentParagraphRawCount,
      noteRawCount: this.noteLevelCache.noteRawCount,
      selectionRawCount,

      selectionLineCount: this.getSelectionLineCount(selectionText),

      currentLineText,
      currentParagraphText,
      selectionText,

      fileName: this.noteLevelCache.fileName,
      fileNameWithExtension: this.noteLevelCache.fileNameWithExtension,
      filePath: this.noteLevelCache.filePath,

      cursorLine: cursor.line + 1,
      cursorColumn: cursor.ch + 1,
      noteLineCount: this.noteLevelCache.noteLineCount,
    };
  }

  refreshNoteLevelCache(editor, file) {
    if (this.noteLevelCache) {
      return;
    }

    const noteText = editor.getValue() ?? "";

    this.noteLevelCache = {
      noteRawCount: this.countCharacters(noteText),
      noteLineCount: editor.lineCount(),
      fileName: file?.basename ?? "",
      fileNameWithExtension: file?.name ?? "",
      filePath: file?.path ?? "",
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

      currentLineText: this.t("fallbackCurrentLineText"),
      currentParagraphText: this.t("fallbackCurrentParagraphText"),
      selectionText: this.t("fallbackSelectionText"),

      fileName: this.t("fallbackFileName"),
      fileNameWithExtension: this.t("fallbackFileNameWithExtension"),
      filePath: this.t("fallbackFilePath"),

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

  migrateLegacyTemplateToLocalized(template) {
    return String(template ?? "").replace(
      /\{\{\s*([^{}]+?)\s*\}\}/g,
      (match, rawKey) => {
        const key = String(rawKey ?? "").trim();
        const label = this.getTemplateLabel(key);

        if (label === key) {
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
    if (GRAPHEME_SEGMENTER) {
      let count = 0;

      for (const _ of GRAPHEME_SEGMENTER.segment(text)) {
        count++;
      }

      return count;
    }

    return Array.from(text).length;
  }

  formatCount(num) {
    if (!this.settings.useThousandsSeparator) {
      return String(num);
    }

    return NUMBER_FORMATTER.format(num);
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
    this.exampleButtons = null;
    this.saveTemplateTimeoutId = null;
    this.templateSaveVersion = 0;
    this.templateSavePromise = Promise.resolve();
  }

  display() {
    this.plugin.refreshLocale();

    const { containerEl } = this;

    containerEl.empty();
    containerEl.addClass("current-line-note-count-settings");

    containerEl.createEl("h2", {
      text: this.plugin.t("settingsTitle"),
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

  hide() {
    const pendingSave = this.saveTemplateTimeoutId
      ? this.flushTemplateSave()
      : null;

    if (super.hide) {
      super.hide();
    }

    return pendingSave;
  }

  createTemplateCard(containerEl) {
    const cardEl = containerEl.createDiv({
      cls: "current-line-note-count-card",
    });

    const headerEl = cardEl.createDiv({
      cls: "current-line-note-count-card-header",
    });

    headerEl.createEl("h3", {
      text: this.plugin.t("templateTitle"),
      cls: "current-line-note-count-card-title",
    });

    const resetWrapEl = headerEl.createDiv({
      cls: "current-line-note-count-reset-button-wrap",
    });

    const resetButton = new ButtonComponent(resetWrapEl);

    resetButton
      .setButtonText(this.plugin.t("reset"))
      .onClick(async () => {
        const defaultTemplate = this.plugin.getDefaultDisplayTemplate();

        this.cancelPendingTemplateSave();
        await this.queueTemplateSave(defaultTemplate);

        if (this.templateTextAreaComponent) {
          this.templateTextAreaComponent.setValue(defaultTemplate);
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
      .setPlaceholder(this.plugin.getDefaultDisplayTemplate())
      .setValue(
        this.plugin.settings.displayTemplate ||
          this.plugin.getDefaultDisplayTemplate()
      )
      .onChange((value) => {
        this.syncTemplateInputEl();
        this.autoResizeTextarea();
        this.updatePreview();

        this.scheduleTemplateSave(value);
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
      text: this.plugin.t("preview"),
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
      text: this.plugin.t("propertiesTitle"),
      cls: "current-line-note-count-card-title",
    });

    cardEl.createEl("p", {
      text: this.plugin.t("propertiesDescription"),
      cls: "current-line-note-count-section-desc",
    });

    const flowEl = cardEl.createDiv({
      cls: "current-line-note-count-property-flow",
    });

    for (const property of this.plugin.getTemplateProperties()) {
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
      cls: "current-line-note-count-card",
    });

    cardEl.createEl("h3", {
      text: this.plugin.t("examplesTitle"),
      cls: "current-line-note-count-card-title",
    });

    const listEl = cardEl.createDiv({
      cls: "current-line-note-count-example-list",
    });

    this.exampleButtons = [];

    for (const example of this.plugin.getTemplateExamples()) {
      const buttonWrapEl = listEl.createDiv({
        cls: "current-line-note-count-example-button-wrap",
      });

      const button = new ButtonComponent(buttonWrapEl);

      button.onClick(async () => {
        this.cancelPendingTemplateSave();
        await this.queueTemplateSave(example.template);

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

      this.exampleButtons.push({ button, template: example.template });
    }

    this.updateExamplePreviews();
  }

  createCountingModeCard(containerEl) {
    const cardEl = containerEl.createDiv({
      cls: "current-line-note-count-card current-line-note-count-mode-card",
    });

    cardEl.createEl("h3", {
      text: this.plugin.t("countingModeTitle"),
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
    const countingModes = this.plugin.getCountingModes();

    for (const mode of countingModes) {
      dropdown.addOption(mode.key, mode.label);
    }

    dropdown.setValue(
      this.plugin.settings.countingMode || DEFAULT_SETTINGS.countingMode
    );

    const updateModeDesc = () => {
      const currentMode = countingModes.find(
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
      this.updateExamplePreviews();
    });

    const previewEl = cardEl.createDiv({
      cls: "current-line-note-count-mode-preview",
    });

    previewEl.createSpan({
      text: this.plugin.t("preview"),
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
      text: this.plugin.t("thousandsSeparatorTitle"),
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
        this.updateExamplePreviews();
      });
  }

  syncTemplateInputEl() {
    if (this.templateTextAreaComponent?.inputEl) {
      this.templateInputEl = this.templateTextAreaComponent.inputEl;
      return;
    }

    this.templateInputEl =
      this.templateInputEl ||
      this.containerEl.querySelector(
        ".current-line-note-count-template-textarea-wrap textarea"
      );
  }

  cancelPendingTemplateSave() {
    if (this.saveTemplateTimeoutId) {
      window.clearTimeout(this.saveTemplateTimeoutId);
      this.saveTemplateTimeoutId = null;
    }
  }

  scheduleTemplateSave(value) {
    this.cancelPendingTemplateSave();

    this.saveTemplateTimeoutId = window.setTimeout(() => {
      this.saveTemplateTimeoutId = null;
      void this.queueTemplateSave(value);
    }, 400);
  }

  flushTemplateSave() {
    this.cancelPendingTemplateSave();

    const value =
      this.templateInputEl?.value ?? this.plugin.settings.displayTemplate;

    return this.queueTemplateSave(value);
  }

  queueTemplateSave(value) {
    const normalizedValue =
      String(value ?? "").trim() || this.plugin.getDefaultDisplayTemplate();
    const saveVersion = ++this.templateSaveVersion;

    this.plugin.settings.displayTemplate = normalizedValue;
    this.templateSavePromise = this.templateSavePromise
      .catch(() => {})
      .then(async () => {
        if (saveVersion !== this.templateSaveVersion) {
          return;
        }

        await this.plugin.saveSettings();
      });

    return this.templateSavePromise;
  }

  async insertPropertyToTemplate(label) {
    this.cancelPendingTemplateSave();
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

    await this.queueTemplateSave(inputEl.value);

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
      this.plugin.getDefaultDisplayTemplate();

    const data = this.plugin.getTemplateData(true);
    const output = this.plugin.renderTemplate(template, data);

    this.previewValueEl.setText(output || this.plugin.t("emptyPreview"));
  }

  updateExamplePreviews() {
    if (!this.exampleButtons) {
      return;
    }

    const fallbackData = this.plugin.getFallbackTemplateData();

    for (const { button, template } of this.exampleButtons) {
      button.setButtonText(this.plugin.renderTemplate(template, fallbackData));
    }
  }

  updateCountingModePreview() {
    if (!this.countingModePreviewEl) {
      return;
    }

    const sampleText = this.plugin.t("countingModeSampleText");
    const count = this.plugin.countCharacters(sampleText);
    const formattedCount = this.plugin.formatCount(count);

    this.countingModePreviewEl.setText(
      this.plugin.formatText("countingModePreview", {
        sample: sampleText,
        count: formattedCount,
      })
    );
  }
}
