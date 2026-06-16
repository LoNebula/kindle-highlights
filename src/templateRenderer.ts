import * as nunjucks from 'nunjucks';
import type { BookHighlight } from './models';

/**
 * Renders BookHighlight data to Markdown using Nunjucks templates.
 */
export class TemplateRenderer {
  private env: nunjucks.Environment;

  constructor() {
    this.env = new nunjucks.Environment(null, {
      autoescape: false,
      trimBlocks: true,
      lstripBlocks: true,
    });

    // Register custom filters
    this.registerFilters();
  }

  private registerFilters(): void {
    // Date formatting filter
    this.env.addFilter('date', (date: Date | string | undefined, format?: string) => {
      if (!date) return '';
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return String(date);

      if (format === 'YYYY-MM-DD') {
        return d.toISOString().split('T')[0];
      }
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // Truncate filter
    this.env.addFilter('truncate', (str: string, length: number) => {
      if (!str) return '';
      if (str.length <= length) return str;
      return str.substring(0, length) + '...';
    });

    // Upper/lower/title case
    this.env.addFilter('upper', (str: string) => str?.toUpperCase() ?? '');
    this.env.addFilter('lower', (str: string) => str?.toLowerCase() ?? '');
    this.env.addFilter('title', (str: string) => {
      return str?.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()) ?? '';
    });

    // Replace filter
    this.env.addFilter('replace', (str: string, search: string, replacement: string) => {
      return str?.split(search).join(replacement) ?? '';
    });

    // Count filter
    this.env.addFilter('length', (arr: unknown[] | string) => {
      return arr?.length ?? 0;
    });
  }

  /**
   * Render a BookHighlight to Markdown using the given template.
   */
  renderBook(bookHighlight: BookHighlight, template: string): string {
    const { book, highlights } = bookHighlight;

    const context = {
      title: book.title,
      author: book.author,
      asin: book.asin ?? '',
      lastAnnotatedDate: book.lastAnnotatedDate,
      highlightsCount: highlights.length,
      highlights: highlights.map((h, idx) => ({
        index: idx + 1,
        text: h.text,
        note: h.note ?? '',
        location: h.location ?? '',
        page: h.page ?? '',
        color: h.color ?? '',
        createdDate: h.createdDate,
        type: h.type ?? 'highlight',
        id: h.id,
      })),
      book: {
        ...book,
      },
    };

    try {
      return this.env.renderString(template, context);
    } catch (error) {
      throw new Error(`Template rendering failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Render a file name using the given template.
   */
  renderFileName(bookHighlight: BookHighlight, template: string): string {
    const { book } = bookHighlight;
    const context = {
      title: book.title,
      author: book.author,
      asin: book.asin ?? '',
    };

    try {
      let fileName = this.env.renderString(template, context);
      // Sanitize file name: remove illegal characters
      fileName = fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
      // Trim trailing dots and spaces
      fileName = fileName.replace(/[. ]+$/, '');
      return fileName || 'Untitled';
    } catch {
      return this.sanitizeFileName(book.title);
    }
  }

  private sanitizeFileName(name: string): string {
    return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/[. ]+$/, '') || 'Untitled';
  }

  /**
   * Validate a template string - returns error message or null if valid.
   */
  validateTemplate(template: string): string | null {
    try {
      this.env.renderString(template, {
        title: 'Test Book',
        author: 'Test Author',
        asin: 'B000TEST',
        lastAnnotatedDate: new Date(),
        highlightsCount: 1,
        highlights: [{
          index: 1,
          text: 'Test highlight text',
          note: '',
          location: '100',
          page: '10',
          color: 'yellow',
          createdDate: new Date(),
          type: 'highlight',
          id: 'test-id',
        }],
        book: {
          id: 'test',
          title: 'Test Book',
          author: 'Test Author',
        },
      });
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }
}
