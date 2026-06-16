"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapTextToColor = void 0;
const amazonRegion_1 = require("~/amazonRegion");
const eventEmitter_1 = require("~/eventEmitter");
const utils_1 = require("~/utils");
const loadRemoteDom_1 = require("./loadRemoteDom");
const mapTextToColor = (highlightClasses) => {
    const matches = /kp-notebook-highlight-(.*)/.exec(highlightClasses);
    return matches ? matches[1] : null;
};
exports.mapTextToColor = mapTextToColor;
const highlightsUrl = (book, state) => {
    const region = (0, amazonRegion_1.currentAmazonRegion)();
    return `${region.notebookUrl}?asin=${book.asin}&contentLimitState=${state?.contentLimitState ?? ''}&token=${state?.token ?? ''}`;
};
const parseNextPageState = ($) => {
    const contentLimitState = $('.kp-notebook-content-limit-state').val();
    const token = $('.kp-notebook-annotations-next-page-start').val();
    return token === undefined ? null : { contentLimitState, token };
};
const parseHighlights = ($) => {
    const highlightsEl = $('.a-row.a-spacing-base').toArray();
    return highlightsEl.map((highlightEl) => {
        const pageMatch = /\d+$/.exec($('#annotationNoteHeader', highlightEl).text());
        const highlightClasses = $('.kp-notebook-highlight', highlightEl).attr('class');
        const color = (0, exports.mapTextToColor)(highlightClasses);
        const text = $('#highlight', highlightEl).text()?.trim();
        return {
            id: (0, utils_1.hash)(text),
            text,
            color,
            location: $('#kp-annotation-location', highlightEl).val(),
            page: pageMatch ? pageMatch[0] : null,
            note: (0, utils_1.br2ln)($('#note', highlightEl).html()),
        };
    });
};
const loadAndScrapeHighlights = async (book, url) => {
    const { dom } = await (0, loadRemoteDom_1.loadRemoteDom)(url, 0, { log: false });
    const nextPageState = parseNextPageState(dom);
    return {
        highlights: parseHighlights(dom),
        nextPageUrl: highlightsUrl(book, nextPageState),
        hasNextPage: nextPageState !== null,
    };
};
const scrapeBookHighlights = async (book, isCancelled) => {
    let results = [];
    let url = highlightsUrl(book);
    let hasNextPage = true;
    let pageIndex = 0;
    while (hasNextPage) {
        if (isCancelled?.()) {
            break;
        }
        pageIndex++;
        eventEmitter_1.ee.emit('syncLog', `Reading highlights from page ${pageIndex}…`);
        const data = await loadAndScrapeHighlights(book, url);
        eventEmitter_1.ee.emit('syncLog', `Found ${data.highlights.length} highlight${data.highlights.length === 1 ? '' : 's'} on page ${pageIndex}`);
        results = [...results, ...data.highlights];
        url = data.nextPageUrl;
        hasNextPage = data.hasNextPage;
    }
    return results.filter((h) => h.text || h.note);
};
exports.default = scrapeBookHighlights;
//# sourceMappingURL=scrapeBookHighlights.js.map