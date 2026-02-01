// Entry point для renderer process
console.log('Renderer process started');
console.log('Platform:', window.electronAPI.platform);

// Интерфейсы
interface InteractiveRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Drag & drop state
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

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
 */
function initializeDragAndDrop() {
  const dragHandle = document.getElementById('dragHandle');
  if (!dragHandle) return;

  dragHandle.addEventListener('mousedown', async (e: MouseEvent) => {
    if (e.button !== 0) return; // Только левая кнопка мыши

    isDragging = true;

    // Сохраняем offset от курсора до левого верхнего угла окна
    dragOffsetX = e.clientX;
    dragOffsetY = e.clientY;

    await window.electronAPI.window.startDrag();

    // Предотвращаем выделение текста
    e.preventDefault();
  });

  // Mousemove должен быть на document, чтобы работать даже если курсор вышел за пределы handle
  document.addEventListener('mousemove', async (e: MouseEvent) => {
    if (!isDragging) return;

    await window.electronAPI.window.updateDragPosition(
      e.screenX,
      e.screenY,
      dragOffsetX,
      dragOffsetY
    );
  });

  document.addEventListener('mouseup', async () => {
    if (!isDragging) return;

    isDragging = false;
    await window.electronAPI.window.endDrag();
  });
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

// Базовая инициализация
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, overlay ready');

  // Инициализация функциональности
  initializeDragAndDrop();
  initializePinButton();

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
});
