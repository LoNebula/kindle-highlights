import * as vscode from 'vscode';
import type { BookHighlight } from './models';

/**
 * WebviewPanel for the Kindle Highlights sidebar UI.
 * Displays books and highlights with a beautiful dark UI.
 */
export class KindleHighlightsPanel {
  public static currentPanel: KindleHighlightsPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _books: BookHighlight[] = [];
  private _onSyncRequested: (() => void) | undefined;
  private _onOpenSettings: (() => void) | undefined;
  private _onOpenBook: ((book: BookHighlight) => void) | undefined;
  private _onIgnoreBook: ((title: string) => void) | undefined;

  public static createOrShow(
    extensionUri: vscode.Uri,
    books: BookHighlight[],
    callbacks: {
      onSyncRequested: () => void;
      onOpenSettings: () => void;
      onOpenBook: (book: BookHighlight) => void;
      onIgnoreBook: (title: string) => void;
    }
  ): KindleHighlightsPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (KindleHighlightsPanel.currentPanel) {
      KindleHighlightsPanel.currentPanel._panel.reveal(column);
      KindleHighlightsPanel.currentPanel.update(books);
      return KindleHighlightsPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'kindleHighlights',
      'Kindle Highlights',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      }
    );

    KindleHighlightsPanel.currentPanel = new KindleHighlightsPanel(
      panel,
      extensionUri,
      books,
      callbacks
    );
    return KindleHighlightsPanel.currentPanel;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    books: BookHighlight[],
    callbacks: {
      onSyncRequested: () => void;
      onOpenSettings: () => void;
      onOpenBook: (book: BookHighlight) => void;
      onIgnoreBook: (title: string) => void;
    }
  ) {
    this._panel = panel;
    this._books = books;
    this._onSyncRequested = callbacks.onSyncRequested;
    this._onOpenSettings = callbacks.onOpenSettings;
    this._onOpenBook = callbacks.onOpenBook;
    this._onIgnoreBook = callbacks.onIgnoreBook;

    this._panel.webview.html = this._getHtmlContent(this._books);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      (message: { command: string; bookId?: string; bookTitle?: string }) => {
        switch (message.command) {
          case 'sync':
            this._onSyncRequested?.();
            break;
          case 'openSettings':
            this._onOpenSettings?.();
            break;
          case 'openBook':
            if (message.bookId) {
              const book = this._books.find(b => b.book.id === message.bookId);
              if (book) this._onOpenBook?.(book);
            }
            break;
          case 'ignoreBook':
            if (message.bookTitle) {
              this._onIgnoreBook?.(message.bookTitle);
            }
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public update(books: BookHighlight[]): void {
    this._books = books;
    this._panel.webview.html = this._getHtmlContent(books);
  }

  public showSyncing(): void {
    this._panel.webview.postMessage({ command: 'syncing', status: true });
  }

  public showSyncComplete(newBooks: number, updatedBooks: number): void {
    this._panel.webview.postMessage({
      command: 'syncComplete',
      newBooks,
      updatedBooks,
    });
  }

  public dispose(): void {
    KindleHighlightsPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) disposable.dispose();
    }
  }

  private _getHtmlContent(books: BookHighlight[]): string {
    const booksJson = JSON.stringify(
      books.map(b => ({
        id: b.book.id,
        title: b.book.title,
        author: b.book.author,
        asin: b.book.asin ?? '',
        lastAnnotatedDate: b.book.lastAnnotatedDate?.toISOString() ?? '',
        highlightsCount: b.highlights.length,
      }))
    );

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kindle Highlights</title>
  <style>
    :root {
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --bg-card: #1c2128;
      --bg-hover: #21262d;
      --border: #30363d;
      --text-primary: #e6edf3;
      --text-secondary: #8b949e;
      --text-muted: #484f58;
      --accent: #f78166;
      --accent-orange: #e3b341;
      --accent-blue: #58a6ff;
      --accent-green: #3fb950;
      --highlight-yellow: #f0e68c;
      --shadow: rgba(0, 0, 0, 0.4);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #1a1f2e 0%, #0d1117 100%);
      border-bottom: 1px solid var(--border);
      padding: 20px 24px;
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(12px);
    }

    .header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .header-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .kindle-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-orange) 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 4px 12px rgba(247, 129, 102, 0.3);
    }

    .header-title {
      font-size: 18px;
      font-weight: 700;
      background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .header-subtitle {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--accent) 0%, #f0522a 100%);
      color: white;
      box-shadow: 0 2px 8px rgba(247, 129, 102, 0.3);
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(247, 129, 102, 0.4);
    }

    .btn-secondary {
      background: var(--bg-card);
      color: var(--text-secondary);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
      transform: translateY(-1px);
    }

    .btn:active {
      transform: translateY(0);
    }

    .btn-icon {
      font-size: 14px;
    }

    /* Stats bar */
    .stats-bar {
      display: flex;
      gap: 20px;
      padding: 12px 0 0;
    }

    .stat {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: var(--accent-orange);
    }

    .stat-label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Search */
    .search-container {
      padding: 16px 24px;
      border-bottom: 1px solid var(--border);
    }

    .search-input {
      width: 100%;
      padding: 10px 16px 10px 40px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text-primary);
      font-size: 14px;
      outline: none;
      transition: all 0.2s ease;
      position: relative;
    }

    .search-wrapper {
      position: relative;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 14px;
      pointer-events: none;
    }

    .search-input:focus {
      border-color: var(--accent-blue);
      box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15);
    }

    .search-input::placeholder {
      color: var(--text-muted);
    }

    /* Book list */
    .book-list {
      padding: 16px 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .book-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
    }

    .book-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, var(--accent) 0%, var(--accent-orange) 100%);
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .book-card:hover {
      border-color: rgba(247, 129, 102, 0.4);
      background: var(--bg-hover);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px var(--shadow);
    }

    .book-card:hover::before {
      opacity: 1;
    }

    .book-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 10px;
    }

    .book-cover-placeholder {
      width: 44px;
      height: 60px;
      background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
      border-radius: 4px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 2px 2px 8px rgba(0,0,0,0.4);
      border-left: 3px solid var(--accent);
    }

    .book-info {
      flex: 1;
      min-width: 0;
    }

    .book-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .book-author {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }

    .book-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
    }

    .badge-highlights {
      background: rgba(227, 179, 65, 0.15);
      color: var(--accent-orange);
      border: 1px solid rgba(227, 179, 65, 0.3);
    }

    .badge-date {
      background: rgba(88, 166, 255, 0.1);
      color: var(--accent-blue);
      border: 1px solid rgba(88, 166, 255, 0.2);
    }

    .book-actions {
      display: flex;
      gap: 6px;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .book-card:hover .book-actions {
      opacity: 1;
    }

    .action-btn {
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--bg-secondary);
      color: var(--text-secondary);
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .action-btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .action-btn.danger:hover {
      background: rgba(248, 81, 73, 0.15);
      color: #f85149;
      border-color: rgba(248, 81, 73, 0.3);
    }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 24px;
      text-align: center;
      gap: 16px;
    }

    .empty-icon {
      font-size: 64px;
      opacity: 0.5;
    }

    .empty-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .empty-desc {
      font-size: 14px;
      color: var(--text-secondary);
      max-width: 320px;
      line-height: 1.6;
    }

    .empty-steps {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px 24px;
      text-align: left;
      max-width: 360px;
      margin-top: 8px;
    }

    .empty-steps h3 {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }

    .step {
      display: flex;
      gap: 12px;
      margin-bottom: 10px;
      align-items: flex-start;
    }

    .step-num {
      width: 20px;
      height: 20px;
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-orange) 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: white;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .step-text {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .step-text code {
      background: var(--bg-hover);
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 12px;
      color: var(--accent-orange);
      font-family: 'Courier New', monospace;
    }

    /* Sync overlay */
    .sync-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(13, 17, 23, 0.8);
      backdrop-filter: blur(4px);
      z-index: 200;
      align-items: center;
      justify-content: center;
    }

    .sync-overlay.active {
      display: flex;
    }

    .sync-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px 40px;
      text-align: center;
      max-width: 300px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .sync-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 8px;
    }

    .sync-subtitle {
      font-size: 13px;
      color: var(--text-secondary);
    }

    /* Toast notification */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      box-shadow: 0 8px 24px var(--shadow);
      transform: translateY(80px);
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 300;
    }

    .toast.show {
      transform: translateY(0);
      opacity: 1;
    }

    .toast-icon {
      font-size: 16px;
    }

    .toast-success {
      border-color: rgba(63, 185, 80, 0.3);
    }

    .toast-success .toast-icon {
      color: var(--accent-green);
    }

    /* Section header */
    .section-header {
      padding: 8px 24px 0;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    /* Scrollbar styling */
    ::-webkit-scrollbar {
      width: 4px;
    }

    ::-webkit-scrollbar-track {
      background: transparent;
    }

    ::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 2px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: var(--text-muted);
    }

    /* Animations */
    .book-card {
      animation: fadeInUp 0.3s ease forwards;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .book-card:nth-child(1) { animation-delay: 0ms; }
    .book-card:nth-child(2) { animation-delay: 40ms; }
    .book-card:nth-child(3) { animation-delay: 80ms; }
    .book-card:nth-child(4) { animation-delay: 120ms; }
    .book-card:nth-child(5) { animation-delay: 160ms; }
    .book-card:nth-child(n+6) { animation-delay: 200ms; }
  </style>
</head>
<body>

  <!-- Sync overlay -->
  <div class="sync-overlay" id="syncOverlay">
    <div class="sync-card">
      <div class="spinner"></div>
      <div class="sync-title">Syncing Highlights</div>
      <div class="sync-subtitle">Parsing your Kindle clippings...</div>
    </div>
  </div>

  <!-- Toast -->
  <div class="toast" id="toast">
    <span class="toast-icon" id="toastIcon">✓</span>
    <span id="toastMsg">Done!</span>
  </div>

  <!-- Header -->
  <div class="header">
    <div class="header-top">
      <div class="header-brand">
        <div class="kindle-icon">📚</div>
        <div>
          <div class="header-title">Kindle Highlights</div>
          <div class="header-subtitle">Your reading insights</div>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" onclick="openSettings()" title="Settings">
          <span>⚙️</span>
        </button>
        <button class="btn btn-primary" onclick="syncClippings()" id="syncBtn">
          <span class="btn-icon">⚡</span>
          Sync
        </button>
      </div>
    </div>

    <div class="stats-bar">
      <div class="stat">
        <div class="stat-value" id="totalBooks">0</div>
        <div class="stat-label">Books</div>
      </div>
      <div class="stat">
        <div class="stat-value" id="totalHighlights">0</div>
        <div class="stat-label">Highlights</div>
      </div>
      <div class="stat">
        <div class="stat-value" id="filteredCount">0</div>
        <div class="stat-label">Shown</div>
      </div>
    </div>
  </div>

  <!-- Search -->
  <div class="search-container">
    <div class="search-wrapper">
      <span class="search-icon">🔍</span>
      <input
        type="text"
        class="search-input"
        id="searchInput"
        placeholder="Search books and authors..."
        oninput="filterBooks(this.value)"
      />
    </div>
  </div>

  <!-- Book list -->
  <div id="content">
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let allBooks = ${booksJson};
    let filteredBooks = [...allBooks];

    function init() {
      renderStats();
      renderBooks(allBooks);
    }

    function renderStats() {
      const totalHighlights = allBooks.reduce((sum, b) => sum + b.highlightsCount, 0);
      document.getElementById('totalBooks').textContent = allBooks.length;
      document.getElementById('totalHighlights').textContent = totalHighlights;
      document.getElementById('filteredCount').textContent = filteredBooks.length;
    }

    function renderBooks(books) {
      const content = document.getElementById('content');

      if (books.length === 0 && allBooks.length === 0) {
        content.innerHTML = renderEmptyState();
        return;
      }

      if (books.length === 0) {
        content.innerHTML = \`
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <div class="empty-title">No results found</div>
            <div class="empty-desc">Try a different search term.</div>
          </div>
        \`;
        return;
      }

      // Sort by lastAnnotatedDate desc
      const sorted = [...books].sort((a, b) => {
        const da = new Date(a.lastAnnotatedDate || 0).getTime();
        const db = new Date(b.lastAnnotatedDate || 0).getTime();
        return db - da;
      });

      content.innerHTML = \`
        <div class="section-header">Your Library (\${books.length} books)</div>
        <div class="book-list">
          \${sorted.map(book => renderBookCard(book)).join('')}
        </div>
      \`;
    }

    function renderBookCard(book) {
      const dateStr = book.lastAnnotatedDate
        ? new Date(book.lastAnnotatedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : '';

      return \`
        <div class="book-card" onclick="openBook('\${book.id}')">
          <div class="book-header">
            <div class="book-cover-placeholder">📖</div>
            <div class="book-info">
              <div class="book-title" title="\${escapeHtml(book.title)}">\${escapeHtml(book.title)}</div>
              <div class="book-author">\${escapeHtml(book.author)}</div>
              <div class="book-meta">
                <span class="badge badge-highlights">✨ \${book.highlightsCount} highlights</span>
                \${dateStr ? \`<span class="badge badge-date">📅 \${dateStr}</span>\` : ''}
              </div>
            </div>
          </div>
          <div class="book-actions">
            <button class="action-btn" onclick="openBook('\${book.id}', event)">Open file</button>
            <button class="action-btn danger" onclick="ignoreBook('\${escapeHtml(book.title)}', event)">Ignore</button>
          </div>
        </div>
      \`;
    }

    function renderEmptyState() {
      return \`
        <div class="empty-state">
          <div class="empty-icon">📱</div>
          <div class="empty-title">No highlights yet</div>
          <div class="empty-desc">Sync your Kindle highlights by importing your clippings file.</div>
          <div class="empty-steps">
            <h3>How to get started</h3>
            <div class="step">
              <div class="step-num">1</div>
              <div class="step-text">Connect your Kindle device to your computer via USB</div>
            </div>
            <div class="step">
              <div class="step-num">2</div>
              <div class="step-text">Find the file <code>My Clippings.txt</code> in the Kindle documents folder</div>
            </div>
            <div class="step">
              <div class="step-num">3</div>
              <div class="step-text">Click the <strong>Sync</strong> button above and select the file</div>
            </div>
          </div>
        </div>
      \`;
    }

    function filterBooks(query) {
      const q = query.toLowerCase().trim();
      if (!q) {
        filteredBooks = [...allBooks];
      } else {
        filteredBooks = allBooks.filter(b =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q)
        );
      }
      document.getElementById('filteredCount').textContent = filteredBooks.length;
      renderBooks(filteredBooks);
    }

    function syncClippings() {
      vscode.postMessage({ command: 'sync' });
      showSyncing(true);
    }

    function openSettings() {
      vscode.postMessage({ command: 'openSettings' });
    }

    function openBook(bookId, event) {
      if (event) event.stopPropagation();
      vscode.postMessage({ command: 'openBook', bookId });
    }

    function ignoreBook(bookTitle, event) {
      if (event) event.stopPropagation();
      if (confirm(\`Ignore "\${bookTitle}" in future syncs?\`)) {
        vscode.postMessage({ command: 'ignoreBook', bookTitle });
      }
    }

    function showSyncing(active) {
      document.getElementById('syncOverlay').classList.toggle('active', active);
    }

    function showToast(message, isSuccess = true) {
      const toast = document.getElementById('toast');
      const icon = document.getElementById('toastIcon');
      const msg = document.getElementById('toastMsg');
      icon.textContent = isSuccess ? '✓' : '⚠️';
      msg.textContent = message;
      toast.className = 'toast show' + (isSuccess ? ' toast-success' : '');
      setTimeout(() => { toast.classList.remove('show'); }, 4000);
    }

    function escapeHtml(str) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    // Handle messages from extension
    window.addEventListener('message', event => {
      const message = event.data;
      switch (message.command) {
        case 'syncing':
          showSyncing(message.status);
          break;
        case 'syncComplete':
          showSyncing(false);
          showToast(\`Sync complete! \${message.newBooks} new, \${message.updatedBooks} updated\`);
          break;
        case 'updateBooks':
          allBooks = message.books;
          filteredBooks = [...allBooks];
          renderStats();
          renderBooks(filteredBooks);
          break;
      }
    });

    // Initialize
    init();
  </script>
</body>
</html>`;
  }
}
