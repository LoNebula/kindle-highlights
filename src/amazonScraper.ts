import axios from 'axios';
import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import type { Book, Highlight, BookHighlight } from './models';

/**
 * Scrapes Kindle highlights from Amazon Notebook directly.
 */
export class AmazonScraper {
  private axiosInstance;
  private baseUrl: string;

  constructor(region: string, cookie: string) {
    this.baseUrl = `https://${region}/notebook`;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8',
      },
    });
  }

  private hash(text: string): string {
    return crypto.createHash('md5').update(text || '').digest('hex');
  }

  /**
   * Fetch all books from the Kindle notebook.
   */
  async getBooks(): Promise<Book[]> {
    try {
      const response = await this.axiosInstance.get('');
      const $ = cheerio.load(response.data);
      const booksEl = $('.kp-notebook-library-each-book').toArray();

      return booksEl.map((bookEl): Book => {
        const title = $('h2.kp-notebook-searchable', bookEl).text().trim();
        const scrapedAuthor = $('p.kp-notebook-searchable', bookEl).text().trim();
        const author = scrapedAuthor.replace(/.*: /, '').trim();
        const asin = $(bookEl).attr('id');
        const scrapedLastAnnotatedDate = $('[id^="kp-notebook-annotated-date"]', bookEl).val() as string;
        
        let lastAnnotatedDate: Date | undefined;
        if (scrapedLastAnnotatedDate) {
          // Attempt basic parsing. Amazon formats vary by region, so we'll do a simple fallback if needed.
          const dateStr = scrapedLastAnnotatedDate.replace(/^[^\s]+ /, ''); // Remove day of week
          lastAnnotatedDate = new Date(dateStr);
          if (isNaN(lastAnnotatedDate.getTime())) {
            // Fallback for Japanese format e.g., "2021年10月24日" -> "2021/10/24"
            const jaDate = scrapedLastAnnotatedDate.replace(/年|月/g, '/').replace(/日/g, '');
            lastAnnotatedDate = new Date(jaDate);
          }
        }

        return {
          id: this.hash(title || ''),
          asin,
          title,
          author,
          lastAnnotatedDate: lastAnnotatedDate && !isNaN(lastAnnotatedDate.getTime()) ? lastAnnotatedDate : undefined,
        };
      }).filter(b => b.title);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 302) {
        throw new Error('Authentication failed. The Amazon cookie might be invalid or expired.');
      }
      throw error;
    }
  }

  /**
   * Fetch highlights for a specific book.
   */
  async getBookHighlights(book: Book, progressCallback?: (msg: string) => void): Promise<Highlight[]> {
    let results: Highlight[] = [];
    let url = `?asin=${book.asin}`;
    let hasNextPage = true;
    let pageIndex = 0;

    while (hasNextPage) {
      pageIndex++;
      if (progressCallback) progressCallback(`Reading page ${pageIndex}...`);

      const response = await this.axiosInstance.get(url);
      const $ = cheerio.load(response.data);

      const highlightsEl = $('.a-row.a-spacing-base').toArray();
      const pageHighlights = highlightsEl.map((highlightEl): Highlight => {
        const pageText = $('#annotationNoteHeader', highlightEl).text() || '';
        const pageMatch = /\d+$/.exec(pageText);
        
        const highlightClasses = $('.kp-notebook-highlight', highlightEl).attr('class') || '';
        const colorMatch = /kp-notebook-highlight-(.*)/.exec(highlightClasses);
        const color = colorMatch ? colorMatch[1] : undefined;

        const text = $('#highlight', highlightEl).text().trim();
        const noteHtml = $('#note', highlightEl).html() || '';
        const note = noteHtml.replace(/<br\s*\/?>/gi, '\\n').trim();

        return {
          id: this.hash(text || note),
          text,
          color: color as Highlight['color'],
          location: $('#kp-annotation-location', highlightEl).val() as string,
          page: pageMatch ? pageMatch[0] : undefined,
          note: note ? note : undefined,
          type: text ? 'highlight' : 'note',
        };
      });

      results = [...results, ...pageHighlights];

      const contentLimitState = $('.kp-notebook-content-limit-state').val();
      const token = $('.kp-notebook-annotations-next-page-start').val();

      if (token) {
        url = `?asin=${book.asin}&contentLimitState=${contentLimitState || ''}&token=${token}`;
      } else {
        hasNextPage = false;
      }
    }

    // Filter out empties
    return results.filter((h) => h.text || h.note);
  }
}
