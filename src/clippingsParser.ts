import type { ParsedClipping, BookHighlight, Book, Highlight } from './models';
import * as crypto from 'crypto';

/**
 * Parse Kindle's "My Clippings.txt" file into structured BookHighlight objects.
 * 
 * The format of My Clippings.txt entries:
 * ─────────────────────────────────
 * Book Title (Author Name)
 * - Your Highlight on page X | Location X-X | Added on Weekday, Month Day, Year HH:MM:SS AM/PM
 * 
 * Highlighted text here
 * ==========
 * ─────────────────────────────────
 */
export class ClippingsParser {
  private readonly SEPARATOR = '==========';

  parse(content: string): BookHighlight[] {
    const entries = content
      .split(this.SEPARATOR)
      .map(e => e.trim())
      .filter(e => e.length > 0);

    const clippings = entries
      .map(entry => this.parseEntry(entry))
      .filter((c): c is ParsedClipping => c !== null);

    return this.groupIntoBooks(clippings);
  }

  private parseEntry(entry: string): ParsedClipping | null {
    const lines = entry.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return null;

    const titleLine = lines[0];
    const metaLine = lines[1];
    const textLines = lines.slice(2);

    // Parse title and author from first line
    // Format: "Book Title (Author Name)" or "Book Title"
    const titleMatch = titleLine.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    let title: string;
    let author: string;

    if (titleMatch) {
      title = titleMatch[1].trim();
      author = this.normalizeAuthor(titleMatch[2].trim());
    } else {
      title = titleLine.trim();
      author = 'Unknown';
    }

    // Parse metadata line
    // Format: "- Your Highlight on page X | Location X-X | Added on ..."
    // or:     "- Your Highlight at Location X-X | Added on ..."
    const type = this.parseType(metaLine);
    const location = this.parseLocation(metaLine);
    const page = this.parsePage(metaLine);
    const createdDate = this.parseDate(metaLine);

    const text = textLines.join('\n').trim();

    if (!title || (!text && type !== 'bookmark')) return null;

    return {
      title,
      author,
      type,
      location,
      page,
      createdDate,
      text,
    };
  }

  private parseType(metaLine: string): 'highlight' | 'note' | 'bookmark' {
    const lower = metaLine.toLowerCase();
    if (lower.includes('your note') || lower.includes('note on')) return 'note';
    if (lower.includes('bookmark')) return 'bookmark';
    return 'highlight';
  }

  private parseLocation(metaLine: string): string | undefined {
    // Match patterns: "Location X-X", "Location X", "位置No. X-X"
    const match = metaLine.match(/[Ll]ocation\s+([\d\-]+)/);
    return match ? match[1] : undefined;
  }

  private parsePage(metaLine: string): string | undefined {
    // Match patterns: "page X", "ページ X"
    const match = metaLine.match(/[Pp]age\s+([\d\-]+)/i);
    return match ? match[1] : undefined;
  }

  private parseDate(metaLine: string): Date | undefined {
    // Match "Added on Weekday, Month Day, Year HH:MM:SS AM/PM"
    const match = metaLine.match(/[Aa]dded on\s+(.+)$/);
    if (!match) return undefined;

    try {
      const dateStr = match[1].trim();
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  }

  private normalizeAuthor(author: string): string {
    // Kindle sometimes stores author as "Last, First" - convert to "First Last"
    const parts = author.split(',').map(p => p.trim());
    if (parts.length === 2) {
      return `${parts[1]} ${parts[0]}`;
    }
    return author;
  }

  private generateId(input: string): string {
    return crypto.createHash('md5').update(input).digest('hex').substring(0, 8);
  }

  private groupIntoBooks(clippings: ParsedClipping[]): BookHighlight[] {
    const bookMap = new Map<string, BookHighlight>();

    for (const clipping of clippings) {
      const bookKey = `${clipping.title}::${clipping.author}`;

      if (!bookMap.has(bookKey)) {
        const book: Book = {
          id: this.generateId(bookKey),
          title: clipping.title,
          author: clipping.author,
        };
        bookMap.set(bookKey, { book, highlights: [] });
      }

      const bookHighlight = bookMap.get(bookKey)!;

      // Update lastAnnotatedDate if this clipping is more recent
      if (clipping.createdDate) {
        if (
          !bookHighlight.book.lastAnnotatedDate ||
          clipping.createdDate > bookHighlight.book.lastAnnotatedDate
        ) {
          bookHighlight.book.lastAnnotatedDate = clipping.createdDate;
        }
      }

      // Skip bookmarks (no text content)
      if (clipping.type === 'bookmark') continue;

      // Deduplicate by text content
      const isDuplicate = bookHighlight.highlights.some(
        h => h.text.trim() === clipping.text.trim()
      );
      if (isDuplicate) continue;

      const highlight: Highlight = {
        id: this.generateId(`${bookKey}::${clipping.text}::${clipping.location}`),
        text: clipping.text,
        location: clipping.location,
        page: clipping.page,
        type: clipping.type,
        createdDate: clipping.createdDate,
      };

      bookHighlight.highlights.push(highlight);
    }

    return Array.from(bookMap.values());
  }
}
