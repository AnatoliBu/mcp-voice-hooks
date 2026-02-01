import { Tray, Menu, nativeImage, app } from 'electron';
import * as path from 'path';
import type { VoiceState } from '../preload/types';

export type TrayIconState = 'idle' | 'listening' | 'processing';

export class TrayManager {
  private tray: Tray | null = null;
  private currentState: TrayIconState = 'idle';
  private readonly iconPaths: Record<TrayIconState, string>;
  private onSettingsClick: () => void;
  private onQuitClick: () => void;

  constructor(options: {
    onSettingsClick: () => void;
    onQuitClick: () => void;
  }) {
    this.onSettingsClick = options.onSettingsClick;
    this.onQuitClick = options.onQuitClick;

    // Пути к иконкам (в build/icons/)
    const iconsDir = path.join(__dirname, '../../build/icons');
    this.iconPaths = {
      idle: path.join(iconsDir, 'tray-icon-idle.png'),
      listening: path.join(iconsDir, 'tray-icon-listening.png'),
      processing: path.join(iconsDir, 'tray-icon-processing.png'),
    };
  }

  /**
   * Создать системный трей
   */
  createTray(): void {
    if (this.tray) {
      console.warn('[TrayManager] Tray already exists');
      return;
    }

    // Создаём трей с иконкой idle
    const icon = this.loadIcon('idle');
    this.tray = new Tray(icon);

    // Устанавливаем tooltip
    this.tray.setToolTip('MCP Voice Hooks');

    // Создаём контекстное меню
    this.updateContextMenu();

    console.log('[TrayManager] Tray created');
  }

  /**
   * Обновить иконку трея на основе состояния
   */
  updateIcon(state: VoiceState): void {
    if (!this.tray) {
      console.warn('[TrayManager] Cannot update icon - tray not initialized');
      return;
    }

    // Маппинг VoiceState → TrayIconState
    const iconState = this.mapVoiceStateToIcon(state);

    // Избегаем лишних обновлений
    if (iconState === this.currentState) {
      return;
    }

    this.currentState = iconState;
    const icon = this.loadIcon(iconState);
    this.tray.setImage(icon);

    // Обновляем tooltip с текущим состоянием
    const stateLabel = this.getStateLabel(iconState);
    this.tray.setToolTip(`MCP Voice Hooks - ${stateLabel}`);

    console.log(`[TrayManager] Icon updated to: ${iconState}`);
  }

  /**
   * Уничтожить трей
   */
  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
      console.log('[TrayManager] Tray destroyed');
    }
  }

  /**
   * Загрузить иконку для состояния
   */
  private loadIcon(state: TrayIconState): Electron.NativeImage {
    const iconPath = this.iconPaths[state];

    try {
      const icon = nativeImage.createFromPath(iconPath);

      // Устанавливаем размер для Retina дисплеев
      if (process.platform === 'darwin') {
        icon.setTemplateImage(true); // macOS template image (автоматически инвертируется в dark mode)
      }

      return icon;
    } catch (error) {
      console.error(`[TrayManager] Failed to load icon: ${iconPath}`, error);

      // Fallback: создаём пустую иконку
      return nativeImage.createEmpty();
    }
  }

  /**
   * Маппинг VoiceState → TrayIconState
   */
  private mapVoiceStateToIcon(state: VoiceState): TrayIconState {
    switch (state.state) {
      case 'listening':
      case 'recording':
        return 'listening';

      case 'processing':

      case 'idle':
      case 'error':
      default:
        return 'idle';
    }
  }

  /**
   * Получить человекочитаемую метку для состояния
   */
  private getStateLabel(state: TrayIconState): string {
    switch (state) {
      case 'idle':
        return 'Idle';
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      default:
        return 'Unknown';
    }
  }

  /**
   * Обновить контекстное меню трея
   */
  private updateContextMenu(): void {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Settings...',
        accelerator: process.platform === 'darwin' ? 'Cmd+,' : 'Ctrl+,',
        click: () => {
          console.log('[TrayManager] Settings clicked');
          this.onSettingsClick();
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          console.log('[TrayManager] Quit clicked');
          this.onQuitClick();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }
}
