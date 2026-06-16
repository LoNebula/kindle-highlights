import type { Book, Highlight } from '~/models';
export declare const mapTextToColor: (highlightClasses: string) => Highlight["color"];
declare const scrapeBookHighlights: (book: Book, isCancelled?: () => boolean) => Promise<Highlight[]>;
export default scrapeBookHighlights;
//# sourceMappingURL=scrapeBookHighlights.d.ts.map