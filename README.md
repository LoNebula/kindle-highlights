<p align="center">
  <img src="assets/hero.png" alt="📚 Kindle Highlights — VS Code Sync & Note Manager Hero Banner" width="100%" />
</p>

<h1 align="center">📚 Kindle Highlights — VS Code Sync & Note Manager</h1>

<p align="center">
  <strong>Sync Amazon Kindle Highlights into Workspace Markdown Files with Customizable Nunjucks Templates.</strong>
</p>

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-features">Features</a> •
  <a href="#-code-architecture">Code Architecture</a> •
  <a href="#-system-flow">System Flow</a> •
  <a href="#-project-structure">Structure</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/VS_Code-Extension-007acc?style=for-the-badge&logo=visualstudiocode&logoColor=white" alt="VS_Code" /> <img src="https://img.shields.io/badge/Version-1.1.3-blue?style=for-the-badge&logo=semver&logoColor=white" alt="Version" /> <img src="https://img.shields.io/badge/TypeScript-5.4+-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge&logo=opensourceinitiative&logoColor=white" alt="License" />
</p>

---

## 📌 Overview

A feature-rich VS Code extension (`LoNebula9.kindle-highlights`) inspired by the Obsidian Kindle Plugin. It parses your Kindle device's `My Clippings.txt` file or Amazon Cloud Notebook, extracts highlights, annotations, and bookmarks, and formats them into structured Markdown files using customizable Nunjucks templates.

---

## ✨ Features (Key Outcomes & Capabilities)

| Icon | Feature | Outcome & Real Proof |
| :---: | :--- | :--- |
| 📥 | **My Clippings.txt Parser** | Extracts highlights, notes, locations, and timestamps from any Kindle device file |
| 📄 | **Custom Nunjucks Templates** | Full control over Markdown structure, frontmatter metadata, and citation layout |
| 🔄 | **Smart Idempotent Merge** | Appends new highlights without erasing your personal annotations or edits |
| 🎨 | **Interactive Webview UI** | Browse books and highlights with dedicated search and filter panels |

---

## 🔬 Code Architecture & Implementation

### 🔬 Code Implementation (`src/`)
- **`clippingsParser.ts`**: Regular expression parser for multilingual Kindle clippings format (`==========` delimiter, Title (Author), Location/Page, Timestamp, Highlight Text).
- **`fileManager.ts`**: Handles idempotent Markdown file generation, creating one file per book with YAML frontmatter and merging new highlights without overwriting user notes.
- **`templateEditorPanel.ts`**: Interactive Webview panel for customizing Nunjucks templates (`{{title}}`, `{{author}}`, `{% for highlight in highlights %}`).
- **`highlightsPanel.ts`**: Visual book shelf and highlight explorer inside VS Code.

---

## 📊 System Flow

```mermaid
graph TD
  Clippings[📖 My Clippings.txt] --> Parser[⚙️ ClippingsParser Engine]
  Parser --> Data[📚 Structured BookHighlight Object]
  Data --> Template[📝 Nunjucks Template Formatter]
  Template --> FileMgr[💾 FileManager: Smart Markdown Merge]
  FileMgr --> Notes[(📁 Workspace Markdown Notes)]
  Data --> Webview[💻 Highlights Explorer Webview Panel]

  classDef primary fill:#f97316,stroke:#ea580c,stroke-width:2px,color:#fff;
  classDef accent fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff;
  class Parser,Template primary;
  class Notes,Webview accent;
```

---

## 📁 Project Structure

```bash
kindle-highlights/
├── 📁 assets/                 # Marketplace PNG hero banners
│   └── 🎨 hero.png
├── 📁 src/
│   ├── 📄 clippingsParser.ts  # Kindle clippings regex parsing engine
│   ├── 📄 fileManager.ts      # Markdown generation & smart merge
│   ├── 📄 templateEditorPanel.ts # Nunjucks template editor webview
│   └── 📄 extension.ts        # Main commands & lifecycle
├── 📄 package.json            # Extension manifest
└── 📄 README.md               # Documentation
```

---

## 🚀 Quick Start

```bash
# Install from Marketplace:
ext install LoNebula9.kindle-highlights

# Or build locally:
npm install
npm run compile
```

---

<p align="center">
  Released under the <a href="LICENSE">MIT License</a>. Crafted with precision by <a href="https://github.com/LoNebula">LoNebula</a>
</p>
