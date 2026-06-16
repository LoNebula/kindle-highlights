import * as vscode from 'vscode';
import type { BookHighlight } from './models';
import { TemplateRenderer } from './templateRenderer';

/**
 * Interactive template editor with live preview.
 */
export class TemplateEditorPanel {
  private static currentPanel: TemplateEditorPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _renderer: TemplateRenderer;
  private _onSave: ((template: string) => Promise<void>) | undefined;

  public static createOrShow(
    extensionUri: vscode.Uri,
    currentTemplate: string,
    onSave: (template: string) => Promise<void>
  ): TemplateEditorPanel {
    const column = vscode.ViewColumn.Two;

    if (TemplateEditorPanel.currentPanel) {
      TemplateEditorPanel.currentPanel._panel.reveal(column);
      return TemplateEditorPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'kindleHighlightsTemplateEditor',
      'Kindle: Template Editor',
      column,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
      }
    );

    TemplateEditorPanel.currentPanel = new TemplateEditorPanel(
      panel,
      extensionUri,
      currentTemplate,
      onSave
    );
    return TemplateEditorPanel.currentPanel;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    _extensionUri: vscode.Uri,
    currentTemplate: string,
    onSave: (template: string) => Promise<void>
  ) {
    this._panel = panel;
    this._renderer = new TemplateRenderer();
    this._onSave = onSave;

    this._panel.webview.html = this._getHtml(currentTemplate);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message: { command: string; template?: string }) => {
        switch (message.command) {
          case 'preview':
            if (message.template !== undefined) {
              const preview = this._generatePreview(message.template);
              this._panel.webview.postMessage({ command: 'previewResult', html: preview });
            }
            break;
          case 'save':
            if (message.template !== undefined) {
              await this._onSave?.(message.template);
              vscode.window.showInformationMessage('Template saved successfully!');
              this._panel.webview.postMessage({ command: 'saved' });
            }
            break;
          case 'reset':
            // Reset handled in UI
            break;
        }
      },
      null,
      this._disposables
    );
  }

  private _generatePreview(template: string): string {
    const sampleData: BookHighlight = {
      book: {
        id: 'sample-id',
        title: 'The Psychology of Money',
        author: 'Morgan Housel',
        asin: 'B08D9WJ9G8',
        lastAnnotatedDate: new Date('2024-01-15'),
      },
      highlights: [
        {
          id: 'h1',
          text: 'Your personal experiences with money make up maybe 0.00000001% of what\'s happened in the world, but maybe 80% of how you think the world works.',
          location: '245',
          page: '12',
          type: 'highlight',
          createdDate: new Date('2024-01-10'),
        },
        {
          id: 'h2',
          text: 'Doing well with money has a little to do with how smart you are and a lot to do with how you behave.',
          note: 'This is the key insight of the book.',
          location: '312',
          page: '15',
          type: 'highlight',
          color: 'yellow',
          createdDate: new Date('2024-01-12'),
        },
        {
          id: 'h3',
          text: 'Wealth is what you don\'t see. It\'s the cars not purchased, the clothes not bought, the first-class seat not taken.',
          location: '789',
          page: '38',
          type: 'highlight',
          color: 'blue',
          createdDate: new Date('2024-01-14'),
        },
      ],
    };

    const error = this._renderer.validateTemplate(template);
    if (error) {
      return `<div style="color: #f85149; background: rgba(248, 81, 73, 0.1); padding: 16px; border-radius: 8px; border: 1px solid rgba(248, 81, 73, 0.3);">
        <strong>Template Error:</strong><br>${escapeHtml(error)}
      </div>`;
    }

    try {
      const markdown = this._renderer.renderBook(sampleData, template);
      // Convert basic markdown to HTML for preview
      const html = this._markdownToHtml(markdown);
      return html;
    } catch (err) {
      return `<div style="color: #f85149;">Error: ${escapeHtml(String(err))}</div>`;
    }
  }

  private _markdownToHtml(markdown: string): string {
    let html = escapeHtml(markdown);
    // Convert markdown elements
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/^---\n([\s\S]*?\n)---/m, '<div class="frontmatter">$1</div>');
    html = html.replace(/\n\n/g, '</p><p>');
    return `<p>${html}</p>`;
  }

  private _getHtml(currentTemplate: string): string {
    const escapedTemplate = currentTemplate
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/`/g, '&#96;');

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Template Editor</title>
  <style>
    :root {
      --bg: #0d1117;
      --bg2: #161b22;
      --bg3: #1c2128;
      --border: #30363d;
      --text: #e6edf3;
      --text2: #8b949e;
      --accent: #f78166;
      --green: #3fb950;
      --blue: #58a6ff;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      background: var(--bg2);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .toolbar-title {
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toolbar-actions {
      display: flex;
      gap: 8px;
    }

    .btn {
      padding: 7px 16px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.2s;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--green) 0%, #2ea043 100%);
      color: white;
    }

    .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }

    .btn-secondary {
      background: var(--bg3);
      color: var(--text2);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover { background: #21262d; color: var(--text); }

    .editor-container {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .editor-pane, .preview-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .editor-pane {
      border-right: 1px solid var(--border);
    }

    .pane-header {
      padding: 10px 16px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text2);
      background: var(--bg2);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .live-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      padding: 2px 6px;
      background: rgba(63, 185, 80, 0.1);
      color: var(--green);
      border: 1px solid rgba(63, 185, 80, 0.3);
      border-radius: 20px;
    }

    .live-dot {
      width: 6px;
      height: 6px;
      background: var(--green);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    textarea {
      flex: 1;
      width: 100%;
      background: var(--bg);
      color: var(--text);
      border: none;
      outline: none;
      padding: 20px;
      font-family: 'Courier New', 'Consolas', monospace;
      font-size: 13px;
      line-height: 1.7;
      resize: none;
      tab-size: 2;
    }

    .preview-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px 24px;
      font-size: 14px;
      line-height: 1.8;
    }

    .preview-content h1 {
      font-size: 22px;
      margin-bottom: 8px;
      color: var(--text);
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
    }

    .preview-content h2 {
      font-size: 17px;
      margin: 20px 0 10px;
      color: var(--text);
    }

    .preview-content h3 {
      font-size: 15px;
      margin: 16px 0 8px;
      color: var(--text2);
    }

    .preview-content blockquote {
      border-left: 3px solid var(--accent);
      padding: 8px 16px;
      margin: 12px 0;
      background: rgba(247, 129, 102, 0.05);
      border-radius: 0 6px 6px 0;
      color: var(--text);
      font-style: italic;
    }

    .preview-content hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 16px 0;
    }

    .preview-content strong { color: var(--text); }
    .preview-content em { color: var(--text2); }

    .preview-content p { margin-bottom: 12px; color: var(--text2); }

    .preview-content .frontmatter {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 16px;
      font-family: monospace;
      font-size: 12px;
      color: var(--blue);
      margin-bottom: 16px;
      white-space: pre-wrap;
    }

    .variable-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 12px 16px;
      background: var(--bg2);
      border-top: 1px solid var(--border);
    }

    .chip {
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-family: monospace;
      cursor: pointer;
      border: 1px solid var(--border);
      background: var(--bg3);
      color: var(--blue);
      transition: all 0.15s;
    }

    .chip:hover {
      background: rgba(88, 166, 255, 0.1);
      border-color: var(--blue);
    }

    .save-indicator {
      font-size: 11px;
      color: var(--green);
      display: none;
    }

    .save-indicator.show { display: inline; }

    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-title">
      ✏️ Template Editor
      <span class="save-indicator" id="saveIndicator">✓ Saved</span>
    </div>
    <div class="toolbar-actions">
      <button class="btn btn-secondary" onclick="resetTemplate()">Reset to Default</button>
      <button class="btn btn-primary" onclick="saveTemplate()">💾 Save Template</button>
    </div>
  </div>

  <div class="editor-container">
    <div class="editor-pane">
      <div class="pane-header">
        Template (Nunjucks)
        <div class="live-badge">
          <div class="live-dot"></div>
          Live Preview
        </div>
      </div>
      <textarea
        id="templateEditor"
        spellcheck="false"
        oninput="schedulePreview()"
      >${escapedTemplate}</textarea>
      <div class="variable-chips">
        <span style="font-size: 11px; color: var(--text2); margin-right: 4px;">Variables:</span>
        <span class="chip" onclick="insertVar('{{ title }}')">title</span>
        <span class="chip" onclick="insertVar('{{ author }}')">author</span>
        <span class="chip" onclick="insertVar('{{ asin }}')">asin</span>
        <span class="chip" onclick="insertVar('{{ highlightsCount }}')">highlightsCount</span>
        <span class="chip" onclick="insertVar('{{ lastAnnotatedDate | date(\\"YYYY-MM-DD\\") }}')">lastAnnotatedDate</span>
        <span class="chip" onclick="insertVar('{% for highlight in highlights %}\\n{{ highlight.text }}\\n{% endfor %}')">for..highlights</span>
        <span class="chip" onclick="insertVar('{{ highlight.text }}')">highlight.text</span>
        <span class="chip" onclick="insertVar('{{ highlight.note }}')">highlight.note</span>
        <span class="chip" onclick="insertVar('{{ highlight.location }}')">highlight.location</span>
        <span class="chip" onclick="insertVar('{{ highlight.page }}')">highlight.page</span>
        <span class="chip" onclick="insertVar('{{ highlight.color }}')">highlight.color</span>
        <span class="chip" onclick="insertVar('{{ highlight.createdDate | date(\\"YYYY-MM-DD\\") }}')">highlight.date</span>
      </div>
    </div>

    <div class="preview-pane">
      <div class="pane-header">
        Live Preview
        <span style="font-size: 10px; color: var(--text2);">Sample: The Psychology of Money</span>
      </div>
      <div class="preview-content" id="preview">
        <em style="color: var(--text2);">Preview loading...</em>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let previewTimer = null;

    function schedulePreview() {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(requestPreview, 400);
    }

    function requestPreview() {
      const template = document.getElementById('templateEditor').value;
      vscode.postMessage({ command: 'preview', template });
    }

    function saveTemplate() {
      const template = document.getElementById('templateEditor').value;
      vscode.postMessage({ command: 'save', template });
    }

    function resetTemplate() {
      if (confirm('Reset to the default template? This will overwrite your current template.')) {
        vscode.postMessage({ command: 'reset' });
      }
    }

    function insertVar(text) {
      const editor = document.getElementById('templateEditor');
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const before = editor.value.substring(0, start);
      const after = editor.value.substring(end);
      editor.value = before + text + after;
      editor.selectionStart = editor.selectionEnd = start + text.length;
      editor.focus();
      schedulePreview();
    }

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.command === 'previewResult') {
        document.getElementById('preview').innerHTML = msg.html;
      } else if (msg.command === 'saved') {
        const indicator = document.getElementById('saveIndicator');
        indicator.classList.add('show');
        setTimeout(() => indicator.classList.remove('show'), 2000);
      }
    });

    // Initial preview
    requestPreview();
  </script>
</body>
</html>`;
  }

  public dispose(): void {
    TemplateEditorPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) d.dispose();
    }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
