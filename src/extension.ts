import * as vscode from 'vscode';
import * as fs from 'fs';
import { ClippingsParser } from './clippingsParser';
import { FileManager } from './fileManager';
import { SettingsManager } from './settingsManager';
import { KindleHighlightsPanel } from './highlightsPanel';
import { TemplateEditorPanel } from './templateEditorPanel';
import type { BookHighlight } from './models';

/**
 * Main extension entry point.
 * Registers all commands and manages the extension lifecycle.
 */
export function activate(context: vscode.ExtensionContext): void {
  const settingsManager = new SettingsManager();
  const fileManager = new FileManager();
  const parser = new ClippingsParser();

  let currentBooks: BookHighlight[] = [];

  // ──────────────────────────────────────────────────────────────────────────
  // Command: Sync from My Clippings.txt
  // ──────────────────────────────────────────────────────────────────────────
  const syncCommand = vscode.commands.registerCommand(
    'kindle-highlights.syncClippings',
    async () => {
      const settings = settingsManager.getSettings();

      // Offer to re-use last path
      let filePath: string | undefined;

      if (settings.lastClippingsPath && fs.existsSync(settings.lastClippingsPath)) {
        const choice = await vscode.window.showInformationMessage(
          `Re-use last clippings file?\n${settings.lastClippingsPath}`,
          { modal: false },
          'Yes, re-use',
          'Choose another file'
        );

        if (choice === 'Yes, re-use') {
          filePath = settings.lastClippingsPath;
        }
      }

      if (!filePath) {
        const uris = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          title: 'Select My Clippings.txt',
          filters: {
            'Kindle Clippings': ['txt'],
            'All Files': ['*'],
          },
          defaultUri: settings.lastClippingsPath
            ? vscode.Uri.file(settings.lastClippingsPath)
            : undefined,
        });

        if (!uris || uris.length === 0) return;
        filePath = uris[0].fsPath;
        await settingsManager.updateLastClippingsPath(filePath);
      }

      // Show panel and start syncing
      KindleHighlightsPanel.createOrShow(context.extensionUri, currentBooks, {
        onSyncRequested: () => vscode.commands.executeCommand('kindle-highlights.syncClippings'),
        onOpenSettings: () => vscode.commands.executeCommand('workbench.action.openSettings', 'kindleHighlights'),
        onOpenBook: (book) => fileManager.openBook(book, settingsManager.getSettings()),
        onIgnoreBook: async (title) => {
          await settingsManager.addIgnoredBook(title);
          vscode.window.showInformationMessage(`"${title}" added to ignore list.`);
        },
      });

      KindleHighlightsPanel.currentPanel?.showSyncing();

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Kindle Highlights: Syncing...',
          cancellable: false,
        },
        async (progress) => {
          try {
            // Read and parse the file
            progress.report({ message: 'Reading clippings file...' });
            const content = fs.readFileSync(filePath!, 'utf-8');

            progress.report({ message: 'Parsing highlights...' });
            const bookHighlights = parser.parse(content);

            if (bookHighlights.length === 0) {
              vscode.window.showWarningMessage(
                'No highlights found in the clippings file. Make sure you selected the correct "My Clippings.txt" file.'
              );
              KindleHighlightsPanel.currentPanel?.showSyncComplete(0, 0);
              return;
            }

            // Sync to files
            progress.report({ message: `Syncing ${bookHighlights.length} books...` });
            const result = await fileManager.syncBooks(
              bookHighlights,
              settingsManager.getSettings(),
              progress
            );

            currentBooks = bookHighlights;

            // Update panel
            KindleHighlightsPanel.currentPanel?.update(bookHighlights);
            KindleHighlightsPanel.currentPanel?.showSyncComplete(result.newBooks, result.updatedBooks);

            // Show result
            let message = `✅ Sync complete! ${result.newBooks} new, ${result.updatedBooks} updated`;
            if (result.skippedBooks > 0) {
              message += `, ${result.skippedBooks} skipped`;
            }

            const action = await vscode.window.showInformationMessage(message, 'Open Folder');
            if (action === 'Open Folder') {
              const settings = settingsManager.getSettings();
              const outputFolder = await fileManager.getOutputFolder(settings);
              vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputFolder));
            }

            // Report errors if any
            if (result.errors.length > 0) {
              const errMsg = result.errors.slice(0, 3).join('\n');
              vscode.window.showWarningMessage(
                `Some books had errors:\n${errMsg}`,
                'OK'
              );
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Sync failed: ${msg}`);
            KindleHighlightsPanel.currentPanel?.showSyncComplete(0, 0);
          }
        }
      );
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Command: Open Panel
  // ──────────────────────────────────────────────────────────────────────────
  const openPanelCommand = vscode.commands.registerCommand(
    'kindle-highlights.openPanel',
    () => {
      KindleHighlightsPanel.createOrShow(context.extensionUri, currentBooks, {
        onSyncRequested: () => vscode.commands.executeCommand('kindle-highlights.syncClippings'),
        onOpenSettings: () => vscode.commands.executeCommand('workbench.action.openSettings', 'kindleHighlights'),
        onOpenBook: (book) => fileManager.openBook(book, settingsManager.getSettings()),
        onIgnoreBook: async (title) => {
          await settingsManager.addIgnoredBook(title);
          vscode.window.showInformationMessage(`"${title}" added to ignore list.`);
        },
      });
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Command: Open Settings
  // ──────────────────────────────────────────────────────────────────────────
  const openSettingsCommand = vscode.commands.registerCommand(
    'kindle-highlights.openSettings',
    () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'kindleHighlights');
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Command: Edit Template
  // ──────────────────────────────────────────────────────────────────────────
  const editTemplateCommand = vscode.commands.registerCommand(
    'kindle-highlights.editTemplate',
    () => {
      const settings = settingsManager.getSettings();
      TemplateEditorPanel.createOrShow(
        context.extensionUri,
        settings.highlightTemplate,
        async (newTemplate) => {
          await settingsManager.updateSetting('highlightTemplate', newTemplate);
        }
      );
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Status bar item
  // ──────────────────────────────────────────────────────────────────────────
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = '$(book) Kindle';
  statusBarItem.tooltip = 'Kindle Highlights: Click to sync';
  statusBarItem.command = 'kindle-highlights.openPanel';
  statusBarItem.show();

  // ──────────────────────────────────────────────────────────────────────────
  // Auto-sync on startup
  // ──────────────────────────────────────────────────────────────────────────
  const settings = settingsManager.getSettings();
  if (settings.syncOnStartup && settings.lastClippingsPath) {
    // Delay startup sync to avoid blocking activation
    setTimeout(() => {
      const currentSettings = settingsManager.getSettings();
      if (currentSettings.syncOnStartup && currentSettings.lastClippingsPath && 
          fs.existsSync(currentSettings.lastClippingsPath)) {
        vscode.window.showInformationMessage(
          'Kindle Highlights: Auto-syncing on startup...',
          'Sync Now',
          'Dismiss'
        ).then(choice => {
          if (choice === 'Sync Now') {
            vscode.commands.executeCommand('kindle-highlights.syncClippings');
          }
        });
      }
    }, 3000);
  }

  // Register all disposables
  context.subscriptions.push(
    syncCommand,
    openPanelCommand,
    openSettingsCommand,
    editTemplateCommand,
    statusBarItem
  );

  // Show welcome message on first install
  const hasShownWelcome = context.globalState.get<boolean>('hasShownWelcome', false);
  if (!hasShownWelcome) {
    context.globalState.update('hasShownWelcome', true);
    vscode.window.showInformationMessage(
      '📚 Kindle Highlights extension installed! Ready to sync your Kindle highlights.',
      'Open Panel',
      'View Documentation'
    ).then(choice => {
      if (choice === 'Open Panel') {
        vscode.commands.executeCommand('kindle-highlights.openPanel');
      }
    });
  }
}

export function deactivate(): void {
  // Cleanup is handled by VSCode's disposal mechanism
}
