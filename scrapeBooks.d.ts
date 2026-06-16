import type { Root } from 'cheerio';
import type { AmazonAccountRegion, Book } from '~/models';
/**
 * Amazon dates in the Kindle notebook looks like "Sunday October 24, 2021"
 * This method will parse this string and return a valid Date object
 */
export declare const parseToDateString: (kindleDate: string, region: AmazonAccountRegion) => Date;
export declare const parseAuthor: (scrapedAuthor: string) => string;
export declare const parseImageUrl: (scrapedImageUrl: string) => string;
export declare const parseBooks: ($: Root) => Book[];
declare const scrapeBooks: () => Promise<Book[]>;
export default scrapeBooks;
//# sourceMappingURL=scrapeBooks.d.ts.map