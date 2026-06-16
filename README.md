# Kindle Highlights — VSCode Extension

📚 **Sync your Kindle highlights and notes directly into your workspace as Markdown files.**

Inspired by the [Obsidian Kindle Plugin](https://github.com/hadynz/obsidian-kindle-plugin).

---

## Features

- **📥 Import from My Clippings.txt** — Parse your Kindle device's clippings file to extract all highlights, notes, and bookmarks
- **📄 Markdown file generation** — Each book gets its own Markdown file with all highlights
- **🔄 Smart sync** — Intelligently diffs existing files, adding only new highlights without overwriting your edits
- **✏️ Nunjucks templating** — Fully customizable output using the powerful Nunjucks template engine
- **👁️ Live template preview** — Interactive template editor with real-time preview
- **🔍 Book browser** — Beautiful sidebar panel to browse all your synced books
- **⚙️ Settings** — Configure output folder, file naming, and more

---

## Getting Started

### Method A: Sync from Amazon Cloud (Recommended)

1. Open your browser and log in to [Amazon Kindle Notebook](https://read.amazon.co.jp/notebook) (or your region's equivalent like `read.amazon.com/notebook`).
2. Open Developer Tools (F12 or Ctrl+Shift+I).
3. Go to the **Network** tab and refresh the page.
4. Click on the very first request (usually `notebook`) and scroll down to **Request Headers**.
5. Copy the entire value of the `cookie:` field (it starts with `session-id=...`).
6. In VSCode, open settings (`Ctrl+,`) and search for `Kindle Highlights: Amazon Cookie`.
7. Paste the cookie there and set your `Amazon Region`.
8. Run the command: **"Kindle Highlights: Sync from Amazon Cloud"**.

### Method B: Sync via My Clippings.txt

1. Connect your Kindle device to your computer via USB.
2. Navigate to the `documents` folder on your Kindle.
3. Find and copy `My Clippings.txt`.
4. Run the command: **"Kindle Highlights: Sync from My Clippings.txt"**.
5. Select your `My Clippings.txt` file.

### Find your Markdown files

Your highlights will be saved to the folder specified in settings (default: `C:\obsidian\00_note\02_book`).

---

## Template System

Templates use [Nunjucks](https://mozilla.github.io/nunjucks/) syntax.

### Available Variables

| Variable | Description |
|----------|-------------|
| `{{ title }}` | Book title |
| `{{ author }}` | Author name |
| `{{ asin }}` | Amazon ASIN (if available) |
| `{{ highlightsCount }}` | Number of highlights |
| `{{ lastAnnotatedDate }}` | Last annotation date |
| `{{ highlights }}` | Array of highlight objects |

### Highlight Object Properties

| Property | Description |
|----------|-------------|
| `{{ highlight.text }}` | Highlight text |
| `{{ highlight.note }}` | Associated note |
| `{{ highlight.location }}` | Kindle location |
| `{{ highlight.page }}` | Page number |
| `{{ highlight.color }}` | Highlight color |
| `{{ highlight.createdDate }}` | Date added |
| `{{ highlight.type }}` | `highlight`, `note`, or `bookmark` |

### Example Template

```nunjucks
---
title: "{{ title }}"
author: "{{ author }}"
date: "{{ lastAnnotatedDate | date("YYYY-MM-DD") }}"
highlights: {{ highlightsCount }}
---

# {{ title }}
by {{ author }}

{% for highlight in highlights %}
> {{ highlight.text }}

{% if highlight.note %}**Note:** {{ highlight.note }}

{% endif %}
*Location: {{ highlight.location }}*

---
{% endfor %}
```

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `kindleHighlights.outputFolder` | `Kindle Highlights` | Output folder (relative to workspace root) |
| `kindleHighlights.fileNameTemplate` | `{{ title }}` | Template for file names |
| `kindleHighlights.highlightTemplate` | *(default template)* | Nunjucks template for Markdown output |
| `kindleHighlights.syncOnStartup` | `false` | Auto-sync on startup |
| `kindleHighlights.ignoreBooks` | `[]` | Books to skip during sync |

---

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| Kindle Highlights: Sync from Amazon Cloud | — | Fetch highlights directly from Amazon |
| Kindle Highlights: Sync from My Clippings.txt | `Ctrl+Shift+K` | Import from local clippings file |
| Kindle Highlights: Open Panel | — | Open the books browser |
| Kindle Highlights: Open Settings | — | Open extension settings |

---

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode
npm run watch
```

Press `F5` in VSCode to launch the extension in a new Extension Development Host window.

---

## License

MIT
