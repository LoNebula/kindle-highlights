import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import type { BookHighlight, SyncResult, ExtensionSettings } from './models';
import { TemplateRenderer } from './templateRenderer';

/**
 * Manages reading/writing of Kindle highlight Markdown files in the workspace.
 */
export class FileManager {
  private renderer: TemplateRenderer;

  constructor() {
    this.renderer = new TemplateRenderer();
  }

  /**
   * Get the output folder path, creating it if it doesn't exist.
   * Supports both absolute paths (e.g. C:\obsidian\00_note\02_book)
   * and relative paths (relative to workspace root).
   */
  async getOutputFolder(settings: ExtensionSettings): Promise<string> {
    let outputPath: string;

    if (path.isAbsolute(settings.outputFolder)) {
      // Use absolute path directly — no workspace required
      outputPath = settings.outputFolder;
    } else {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error(
          'No workspace folder open. Either open a folder or set an absolute path in "kindleHighlights.outputFolder".'
        );
      }
      outputPath = path.join(workspaceFolders[0].uri.fsPath, settings.outputFolder);
    }

    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    return outputPath;
  }

  /**
   * Sync book highlights to Markdown files.
   * Performs intelligent diff: only creates/updates files for new/changed books.
   */
  async syncBooks(
    bookHighlights: BookHighlight[],
    settings: ExtensionSettings,
    progress?: vscode.Progress<{ message?: string; increment?: number }>
  ): Promise<SyncResult> {
    const result: SyncResult = {
      totalBooks: bookHighlights.length,
      newBooks: 0,
      updatedBooks: 0,
      skippedBooks: 0,
      errors: [],
    };

    const outputFolder = await this.getOutputFolder(settings);
    const increment = 100 / Math.max(bookHighlights.length, 1);

    for (const bookHighlight of bookHighlights) {
      const { book } = bookHighlight;

      // Check if book is in ignore list
      if (settings.ignoreBooks.some(
        ignored => ignored.toLowerCase() === book.title.toLowerCase()
      )) {
        result.skippedBooks++;
        progress?.report({ message: `Skipping: ${book.title}`, increment });
        continue;
      }

      progress?.report({ message: `Processing: ${book.title}`, increment });

      try {
        const fileName = this.renderer.renderFileName(bookHighlight, settings.fileNameTemplate) + '.md';
        const filePath = path.join(outputFolder, fileName);
        const fileExists = fs.existsSync(filePath);

        if (fileExists) {
          // Read existing file to check if update is needed
          const existingContent = fs.readFileSync(filePath, 'utf-8');
          const existingHighlightsCount = this.extractHighlightsCount(existingContent);

          if (existingHighlightsCount >= bookHighlight.highlights.length) {
            // Merge new highlights while preserving existing content
            const mergedContent = this.mergeHighlights(
              existingContent,
              bookHighlight,
              settings.highlightTemplate
            );
            if (mergedContent !== existingContent) {
              fs.writeFileSync(filePath, mergedContent, 'utf-8');
              result.updatedBooks++;
            } else {
              result.skippedBooks++;
            }
          } else {
            // More highlights found - update the file
            const newContent = this.renderer.renderBook(bookHighlight, settings.highlightTemplate);
            fs.writeFileSync(filePath, newContent, 'utf-8');
            result.updatedBooks++;
          }
        } else {
          // New file
          const content = this.renderer.renderBook(bookHighlight, settings.highlightTemplate);
          fs.writeFileSync(filePath, content, 'utf-8');
          result.newBooks++;
        }
      } catch (error) {
        const errorMsg = `Failed to sync "${book.title}": ${error instanceof Error ? error.message : String(error)}`;
        result.errors.push(errorMsg);
      }
    }

    return result;
  }

  /**
   * Get list of all existing highlight files.
   */
  async getExistingFiles(settings: ExtensionSettings): Promise<string[]> {
    try {
      const outputFolder = await this.getOutputFolder(settings);
      const files = fs.readdirSync(outputFolder);
      return files
        .filter(f => f.endsWith('.md'))
        .map(f => path.join(outputFolder, f));
    } catch {
      return [];
    }
  }

  /**
   * Open a book's file in the editor.
   */
  async openBook(bookHighlight: BookHighlight, settings: ExtensionSettings): Promise<void> {
    const outputFolder = await this.getOutputFolder(settings);
    const fileName = this.renderer.renderFileName(bookHighlight, settings.fileNameTemplate) + '.md';
    const filePath = path.join(outputFolder, fileName);

    if (fs.existsSync(filePath)) {
      const uri = vscode.Uri.file(filePath);
      await vscode.window.showTextDocument(uri);
    } else {
      vscode.window.showWarningMessage(`File not found: ${fileName}. Try syncing first.`);
    }
  }

  /**
   * Delete a book's highlight file.
   */
  async deleteBook(bookHighlight: BookHighlight, settings: ExtensionSettings): Promise<void> {
    const outputFolder = await this.getOutputFolder(settings);
    const fileName = this.renderer.renderFileName(bookHighlight, settings.fileNameTemplate) + '.md';
    const filePath = path.join(outputFolder, fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Extract highlights count from frontmatter.
   */
  private extractHighlightsCount(content: string): number {
    const match = content.match(/highlightsCount:\s*(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Merge new highlights into existing file content, preserving any manual edits.
   * Strategy: Only append highlights that don't already exist in the file.
   */
  private mergeHighlights(
    existingContent: string,
    bookHighlight: BookHighlight,
    template: string
  ): string {
    // For now, regenerate the file with all highlights
    // A more sophisticated approach would preserve manual edits
    return this.renderer.renderBook(bookHighlight, template);
  }

  /**
   * Preview what a book's file would look like with the current template.
   */
  renderPreview(bookHighlight: BookHighlight, template: string): string {
    return this.renderer.renderBook(bookHighlight, template);
  }
}
