"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBooks = exports.parseImageUrl = exports.parseAuthor = exports.parseToDateString = void 0;
const moment_1 = __importDefault(require("moment"));
const store_1 = require("svelte/store");
const amazonRegion_1 = require("~/amazonRegion");
const eventEmitter_1 = require("~/eventEmitter");
const store_2 = require("~/store");
const utils_1 = require("~/utils");
const loadRemoteDom_1 = require("./loadRemoteDom");
/**
 * Amazon dates in the Kindle notebook looks like "Sunday October 24, 2021"
 * This method will parse this string and return a valid Date object
 */
const parseToDateString = (kindleDate, region) => {
    switch (region) {
        case 'japan': {
            const amazonDateString = kindleDate.substring(0, kindleDate.indexOf(' '));
            return (0, moment_1.default)(amazonDateString, 'YYYY MM DD', 'ja').toDate();
        }
        case 'france': {
            return (0, moment_1.default)(kindleDate, 'MMMM D, YYYY', 'fr').toDate();
        }
        default: {
            const amazonDateString = kindleDate.substr(kindleDate.indexOf(' ') + 1);
            return (0, moment_1.default)(amazonDateString, 'MMM DD, YYYY').toDate();
        }
    }
};
exports.parseToDateString = parseToDateString;
const parseAuthor = (scrapedAuthor) => {
    return scrapedAuthor.replace(/.*: /, '')?.trim();
};
exports.parseAuthor = parseAuthor;
const parseImageUrl = (scrapedImageUrl) => {
    return scrapedImageUrl.replace(/\._SY\d+\./, '._SX1024.')?.trim();
};
exports.parseImageUrl = parseImageUrl;
const parseBooks = ($) => {
    const region = (0, amazonRegion_1.currentAmazonRegion)();
    const domainURL = `https://${region.hostname}`;
    const booksEl = $('.kp-notebook-library-each-book').toArray();
    return booksEl.map((bookEl) => {
        const title = $('h2.kp-notebook-searchable', bookEl).text()?.trim();
        const scrapedLastAnnotatedDate = $('[id^="kp-notebook-annotated-date"]', bookEl).val();
        const scrapedAuthor = $('p.kp-notebook-searchable', bookEl).text();
        const scrapedImageUrl = $('.kp-notebook-cover-image', bookEl).attr('src');
        return {
            id: (0, utils_1.hash)(title),
            asin: $(bookEl).attr('id'),
            title,
            author: (0, exports.parseAuthor)(scrapedAuthor),
            url: `${domainURL}/dp/${$(bookEl).attr('id')}`,
            imageUrl: (0, exports.parseImageUrl)(scrapedImageUrl),
            lastAnnotatedDate: (0, exports.parseToDateString)(scrapedLastAnnotatedDate, (0, store_1.get)(store_2.settingsStore).amazonRegion),
        };
    });
};
exports.parseBooks = parseBooks;
const scrapeBooks = async () => {
    const region = (0, amazonRegion_1.currentAmazonRegion)();
    eventEmitter_1.ee.emit('syncLog', `Loading Kindle notebook from ${region.hostname}…`);
    const { dom } = await (0, loadRemoteDom_1.loadRemoteDom)(region.notebookUrl, 30000);
    const books = (0, exports.parseBooks)(dom);
    // Amazon's Kindle notebook page typically shows up to 54 books per page
    // If we get exactly 54, there may be more books on additional pages
    // However, pagination requires complex interaction with Amazon's interface
    // Users with more than 54 books may need to sync multiple times
    // The sync process is intelligent and will only sync new/changed books
    if (books.length === 54) {
        console.log('Found 54 books. If you have more books, you may need to sync multiple times to get them all.');
        eventEmitter_1.ee.emit('syncLog', 'Note: Kindle notebook may show only 54 books per page');
    }
    return books;
};
exports.default = scrapeBooks;
//# sourceMappingURL=scrapeBooks.js.map