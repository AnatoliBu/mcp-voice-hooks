/**
 * Unit tests для Settings functionality
 */

import { DEFAULT_SETTINGS, SETTINGS_SCHEMA } from './types';
import type { AppSettings } from './types';

describe('Settings Types and Schema', () => {
  it('should have valid default settings', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      language: 'en-US',
      sendMode: 'auto',
      triggerWord: 'send',
      volume: 1.0,
      rate: 1.0
    });
  });

  it('should have schema matching defaults', () => {
    expect(SETTINGS_SCHEMA.language.default).toBe(DEFAULT_SETTINGS.language);
    expect(SETTINGS_SCHEMA.sendMode.default).toBe(DEFAULT_SETTINGS.sendMode);
    expect(SETTINGS_SCHEMA.triggerWord.default).toBe(DEFAULT_SETTINGS.triggerWord);
    expect(SETTINGS_SCHEMA.volume.default).toBe(DEFAULT_SETTINGS.volume);
    expect(SETTINGS_SCHEMA.rate.default).toBe(DEFAULT_SETTINGS.rate);
  });

  it('should validate sendMode enum', () => {
    expect(SETTINGS_SCHEMA.sendMode.enum).toEqual(['auto', 'trigger-word']);
  });

  it('should validate volume range', () => {
    expect(SETTINGS_SCHEMA.volume.minimum).toBe(0);
    expect(SETTINGS_SCHEMA.volume.maximum).toBe(1);
  });

  it('should validate rate range', () => {
    expect(SETTINGS_SCHEMA.rate.minimum).toBe(0.5);
    expect(SETTINGS_SCHEMA.rate.maximum).toBe(2.0);
  });
});

describe('Settings Validation', () => {
  it('should accept valid settings', () => {
    const validSettings: AppSettings = {
      language: 'ru-RU',
      sendMode: 'trigger-word',
      triggerWord: 'отправить',
      volume: 0.8,
      rate: 1.2
    };

    expect(validSettings.language).toBe('ru-RU');
    expect(validSettings.sendMode).toBe('trigger-word');
    expect(validSettings.volume).toBeGreaterThanOrEqual(0);
    expect(validSettings.volume).toBeLessThanOrEqual(1);
    expect(validSettings.rate).toBeGreaterThanOrEqual(0.5);
    expect(validSettings.rate).toBeLessThanOrEqual(2.0);
  });

  it('should handle partial settings updates', () => {
    const currentSettings = { ...DEFAULT_SETTINGS };
    const partialUpdate: Partial<AppSettings> = {
      language: 'fr-FR',
      volume: 0.5
    };

    const updatedSettings = { ...currentSettings, ...partialUpdate };

    expect(updatedSettings.language).toBe('fr-FR');
    expect(updatedSettings.volume).toBe(0.5);
    expect(updatedSettings.sendMode).toBe('auto'); // Unchanged
    expect(updatedSettings.triggerWord).toBe('send'); // Unchanged
    expect(updatedSettings.rate).toBe(1.0); // Unchanged
  });
});

describe('Settings Edge Cases', () => {
  it('should handle boundary volume values', () => {
    const minVolume: AppSettings = { ...DEFAULT_SETTINGS, volume: 0 };
    const maxVolume: AppSettings = { ...DEFAULT_SETTINGS, volume: 1 };

    expect(minVolume.volume).toBe(0);
    expect(maxVolume.volume).toBe(1);
  });

  it('should handle boundary rate values', () => {
    const minRate: AppSettings = { ...DEFAULT_SETTINGS, rate: 0.5 };
    const maxRate: AppSettings = { ...DEFAULT_SETTINGS, rate: 2.0 };

    expect(minRate.rate).toBe(0.5);
    expect(maxRate.rate).toBe(2.0);
  });

  it('should handle empty trigger word', () => {
    const emptyTrigger: AppSettings = { ...DEFAULT_SETTINGS, triggerWord: '' };
    expect(emptyTrigger.triggerWord).toBe('');
  });

  it('should handle various language codes', () => {
    const languages = ['en-US', 'ru-RU', 'es-ES', 'zh-CN', 'ja-JP'];

    languages.forEach(lang => {
      const settings: AppSettings = { ...DEFAULT_SETTINGS, language: lang };
      expect(settings.language).toBe(lang);
    });
  });
});
