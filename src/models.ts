// Models for Kindle Highlights VSCode Extension

export interface Book {
  id: string;
  title: string;
  author: string;
  asin?: string;
  lastAnnotatedDate?: Date;
}

export interface Highlight {
  id: string;
  text: string;
  location?: string;
  page?: string;
  note?: string;
  color?: 'pink' | 'blue' | 'yellow' | 'orange';
  createdDate?: Date;
  type?: 'highlight' | 'note' | 'bookmark';
}

export interface BookHighlight {
  book: Book;
  highlights: Highlight[];
}

export interface SyncResult {
  totalBooks: number;
  newBooks: number;
  updatedBooks: number;
  skippedBooks: number;
  errors: string[];
}

export interface ExtensionSettings {
  outputFolder: string;
  fileNameTemplate: string;
  highlightTemplate: string;
  lastClippingsPath: string;
  syncOnStartup: boolean;
  ignoreBooks: string[];
}

export interface ParsedClipping {
  title: string;
  author: string;
  type: 'highlight' | 'note' | 'bookmark';
  location?: string;
  page?: string;
  createdDate?: Date;
  text: string;
}
