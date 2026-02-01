import { TrayManager } from './tray-manager';
import type { VoiceState } from '../preload/types';

// Mock Electron modules
jest.mock('electron', () => {
  const mockTrayInstance = {
    setToolTip: jest.fn(),
    setContextMenu: jest.fn(),
    setImage: jest.fn(),
    destroy: jest.fn(),
  };

  return {
    Tray: jest.fn(() => mockTrayInstance),
    Menu: {
      buildFromTemplate: jest.fn((template) => template),
    },
    nativeImage: {
      createFromPath: jest.fn(() => ({
        setTemplateImage: jest.fn(),
      })),
      createEmpty: jest.fn(() => ({})),
    },
    app: {
      quit: jest.fn(),
    },
  };
});

describe('TrayManager', () => {
  let trayManager: TrayManager;
  let mockOnSettings: jest.Mock;
  let mockOnQuit: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOnSettings = jest.fn();
    mockOnQuit = jest.fn();

    trayManager = new TrayManager({
      onSettingsClick: mockOnSettings,
      onQuitClick: mockOnQuit,
    });
  });

  afterEach(() => {
    trayManager.destroy();
  });

  describe('createTray', () => {
    it('should create tray instance', () => {
      const { Tray } = require('electron');

      trayManager.createTray();

      expect(Tray).toHaveBeenCalled();
    });

    it('should set initial tooltip', () => {
      const { Tray } = require('electron');

      trayManager.createTray();

      const trayInstance = Tray.mock.results[0].value;
      expect(trayInstance.setToolTip).toHaveBeenCalledWith('MCP Voice Hooks');
    });
  });

  describe('mapVoiceStateToIcon', () => {
    it('should map listening state to listening icon', () => {
      const state: VoiceState = { state: 'listening', timestamp: Date.now() };
      const iconState = (trayManager as any).mapVoiceStateToIcon(state);

      expect(iconState).toBe('listening');
    });

    it('should map recording state to listening icon', () => {
      const state: VoiceState = { state: 'recording', timestamp: Date.now() };
      const iconState = (trayManager as any).mapVoiceStateToIcon(state);

      expect(iconState).toBe('listening');
    });

    it('should map processing state to processing icon', () => {
      const state: VoiceState = { state: 'processing', timestamp: Date.now() };
      const iconState = (trayManager as any).mapVoiceStateToIcon(state);

      expect(iconState).toBe('processing');
    });

    it('should map idle state to idle icon', () => {
      const state: VoiceState = { state: 'idle', timestamp: Date.now() };
      const iconState = (trayManager as any).mapVoiceStateToIcon(state);

      expect(iconState).toBe('idle');
    });

    it('should map error state to idle icon', () => {
      const state: VoiceState = { state: 'error', timestamp: Date.now() };
      const iconState = (trayManager as any).mapVoiceStateToIcon(state);

      expect(iconState).toBe('idle');
    });
  });

  describe('context menu', () => {
    beforeEach(() => {
      trayManager.createTray();
    });

    it('should call onSettingsClick when Settings is clicked', () => {
      const { Menu } = require('electron');
      const menuTemplate = Menu.buildFromTemplate.mock.calls[0][0];
      const settingsItem = menuTemplate[0];

      settingsItem.click();

      expect(mockOnSettings).toHaveBeenCalled();
    });

    it('should call onQuitClick when Quit is clicked', () => {
      const { Menu } = require('electron');
      const menuTemplate = Menu.buildFromTemplate.mock.calls[0][0];
      const quitItem = menuTemplate[2]; // After separator

      quitItem.click();

      expect(mockOnQuit).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should destroy tray instance', () => {
      const { Tray } = require('electron');

      trayManager.createTray();
      const trayInstance = Tray.mock.results[0].value;

      trayManager.destroy();

      expect(trayInstance.destroy).toHaveBeenCalled();
    });
  });
});
