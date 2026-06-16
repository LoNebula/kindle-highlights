import * as vscode from 'vscode';
import type { ExtensionSettings } from './models';

/**
 * Manages extension settings, loading from and saving to VSCode configuration.
 */
export class SettingsManager {
  private readonly CONFIG_SECTION = 'kindleHighlights';

  getSettings(): ExtensionSettings {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    return {
      outputFolder: config.get<string>('outputFolder', 'C:\\obsidian\\00_note\\02_book'),
      fileNameTemplate: config.get<string>('fileNameTemplate', '{{ author }}-{{ title }}'),
      highlightTemplate: config.get<string>('highlightTemplate', this.getDefaultTemplate()),
      lastClippingsPath: config.get<string>('lastClippingsPath', ''),
      syncOnStartup: config.get<boolean>('syncOnStartup', false),
      ignoreBooks: config.get<string[]>('ignoreBooks', []),
    };
  }

  async updateSetting<K extends keyof ExtensionSettings>(
    key: K,
    value: ExtensionSettings[K]
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    await config.update(key, value, vscode.ConfigurationTarget.Global);
  }

  async updateLastClippingsPath(filePath: string): Promise<void> {
    await this.updateSetting('lastClippingsPath', filePath);
  }

  async addIgnoredBook(title: string): Promise<void> {
    const settings = this.getSettings();
    if (!settings.ignoreBooks.includes(title)) {
      const updated = [...settings.ignoreBooks, title];
      await this.updateSetting('ignoreBooks', updated);
    }
  }

  async removeIgnoredBook(title: string): Promise<void> {
    const settings = this.getSettings();
    const updated = settings.ignoreBooks.filter(b => b !== title);
    await this.updateSetting('ignoreBooks', updated);
  }

  getDefaultTemplate(): string {
    return `---
title: "{{ title }}"
author: "{{ author }}"
asin: "{{ asin }}"
lastAnnotatedDate: "{{ lastAnnotatedDate | date("YYYY-MM-DD") }}"
highlightsCount: {{ highlightsCount }}
---

# {{ title }}

**Author:** {{ author }}

{% if asin %}**ASIN:** {{ asin }}

{% endif %}
## Highlights

{% for highlight in highlights %}
> {{ highlight.text }}

{% if highlight.note %}**Note:** {{ highlight.note }}

{% endif %}
{% if highlight.location or highlight.page %}
*{% if highlight.page %}Page {{ highlight.page }}{% endif %}{% if highlight.page and highlight.location %} | {% endif %}{% if highlight.location %}Location {{ highlight.location }}{% endif %}*

{% endif %}
---

{% endfor %}
`;
  }
}
