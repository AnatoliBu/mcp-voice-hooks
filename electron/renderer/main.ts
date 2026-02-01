// Entry point для renderer process
import { StateIndicator } from './components/StateIndicator';
import { TooltipManager } from './components/Tooltip';
import { OverlayState } from './types';
import { WindowDrag } from './utils/window-drag';

console.log('Renderer process started');
console.log('Platform:', window.electronAPI.platform);

// Глобальные компоненты
let stateIndicator: StateIndicator;
let tooltipManager: TooltipManager;

// Интерфейсы
interface InteractiveRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Drag state (tracking moved to main process for smooth 60fps)
let windowDrag: WindowDrag;

/**
 * Собирает все интерактивные элементы и вычисляет их регионы
 */
function collectInteractiveRegions(): InteractiveRegion[] {
  const regions: InteractiveRegion[] = [];

  // Селекторы интерактивных элементов
  const interactiveSelectors = [
    '.drag-handle',
    '.control-btn',
    'button',
    'input',
    'textarea',
    'select',
    'a'
  ];

  interactiveSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element: Element) => {
      const htmlElement = element as HTMLElement;
      const rect = htmlElement.getBoundingClientRect();

      // Добавляем небольшой padding для удобства взаимодействия
      const padding = 2;
      regions.push({
        x: rect.left - padding,
        y: rect.top - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2
      });
    });
  });

  return regions;
}

/**
 * Обновляет интерактивные регионы в main process
 */
async function updateInteractiveRegions() {
  const regions = collectInteractiveRegions();
  await window.electronAPI.window.updateInteractiveRegions(regions);
}

/**
 * Инициализация drag & drop для drag handle
 * Tracking курсора перенесён в main process для плавного 60fps
 */
function initializeDragAndDrop() {
  windowDrag = new WindowDrag({ dragHandleId: 'dragHandle' });
}

/**
 * Инициализация pin button
 */
function initializePinButton() {
  const pinBtn = document.getElementById('pinBtn');
  if (!pinBtn) return;

  // Загружаем текущее состояние
  window.electronAPI.window.getState().then(state => {
    if (state.alwaysOnTop) {
      pinBtn.classList.add('active');
    }
  });

  pinBtn.addEventListener('click', async () => {
    const state = await window.electronAPI.window.getState();
    const newAlwaysOnTop = !state.alwaysOnTop;

    await window.electronAPI.window.setAlwaysOnTop(newAlwaysOnTop);

    if (newAlwaysOnTop) {
      pinBtn.classList.add('active');
    } else {
      pinBtn.classList.remove('active');
    }
  });
}

/**
 * Инициализация settings button
 */
function initializeSettingsButton() {
  const settingsBtn = document.getElementById('settingsBtn');
  if (!settingsBtn) return;

  settingsBtn.addEventListener('click', async () => {
    await window.electronAPI.window.toggleSettings();
  });
}

/**
 * Debounced update интерактивных регионов
 */
let updateRegionsTimeout: number | null = null;
function scheduleUpdateRegions() {
  if (updateRegionsTimeout !== null) {
    clearTimeout(updateRegionsTimeout);
  }

  updateRegionsTimeout = window.setTimeout(() => {
    updateInteractiveRegions();
    updateRegionsTimeout = null;
  }, 100); // 100ms debounce
}

/**
 * Инициализация UI компонентов
 */
function initializeUIComponents() {
  // Создаём StateIndicator
  stateIndicator = new StateIndicator('.status-indicator');

  // Создаём TooltipManager
  tooltipManager = new TooltipManager();

  // Регистрируем tooltips для control buttons
  const pinBtn = document.getElementById('pinBtn');
  if (pinBtn) {
    tooltipManager.attach(pinBtn, {
      text: 'Always on Top',
      hotkey: {
        action: 'Toggle always on top',
        keys: ['Command', 'T'],
        platformSpecific: true
      },
      position: 'bottom'
    });
  }

  console.log('UI components initialized');
}

/**
 * Инициализация Speech Manager
 */
async function initializeSpeechManager() {
  const { SpeechManager } = await import('./speech/speech-manager');
  const { SpeechUI } = await import('./speech/speech-ui');

  // Создаём MCP клиент для renderer процесса, используя IPC API
  const mcpClient = {
    async sendUtterance(text: string) {
      await window.electronAPI.mcp.sendUtterance(text);
    },
    async setVoiceInputActive(active: boolean) {
      await window.electronAPI.mcp.setVoiceInputActive(active);
    }
  };

  const speechUI = new SpeechUI(stateIndicator);
  const speechManager = new SpeechManager(speechUI, mcpClient);

  // Сохраняем в глобальном scope для отладки
  (window as any)._speechManager = speechManager;

  console.log('Speech Manager initialized');
}

/**
 * Подключается к voice state updates из main process
 */
function connectVoiceStateUpdates() {
  // Подписываемся на изменения состояния
  const unsubscribe = window.electronAPI.voice.onStateChanged((voiceState) => {
    console.log('Voice state update received:', voiceState);

    // Конвертируем VoiceState в OverlayState
    const overlayState = voiceState.state as OverlayState;
    stateIndicator.setState(overlayState, voiceState.metadata);
  });

  // Сохраняем функцию отписки для cleanup
  (window as any)._voiceStateUnsubscribe = unsubscribe;

  // Получаем начальное состояние
  window.electronAPI.voice.getState().then((voiceState) => {
    console.log('Initial voice state:', voiceState);
    const overlayState = voiceState.state as OverlayState;
    stateIndicator.setState(overlayState, voiceState.metadata);
  });

  console.log('Voice state updates connected');
}

/**
 * Демонстрация переходов между состояниями (для разработки)
 */
function demoStateTransitions() {
  const states = [
    OverlayState.IDLE,
    OverlayState.LISTENING,
    OverlayState.RECORDING,
    OverlayState.PROCESSING,
    OverlayState.IDLE,
    OverlayState.ERROR
  ];

  let index = 0;

  setInterval(() => {
    const state = states[index % states.length];
    const metadata = state === OverlayState.ERROR
      ? { errorMessage: 'Microphone not found' }
      : undefined;

    stateIndicator.setState(state, metadata);
    index++;
  }, 3000);
}

// Базовая инициализация
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, overlay ready');

  // Инициализация функциональности
  initializeDragAndDrop();
  initializePinButton();
  initializeSettingsButton();
  initializeUIComponents();

  // Подключаем voice state updates
  connectVoiceStateUpdates();

  // Инициализируем Speech Manager
  await initializeSpeechManager();

  // Первоначальное обновление интерактивных регионов
  updateInteractiveRegions();

  // Обновляем регионы при изменении размера окна
  window.addEventListener('resize', scheduleUpdateRegions);

  // Обновляем регионы при изменении DOM (для динамического контента)
  const observer = new MutationObserver(scheduleUpdateRegions);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });

  // TODO: Убрать после реализации MCP integration
  // Демонстрация для разработки
  if (process.env.NODE_ENV === 'development') {
    console.log('Running state transitions demo...');
    // demoStateTransitions();
  }
});
