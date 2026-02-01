# Phase 2: Optimize Drag Performance

## Overview

Перенос отслеживания курсора из renderer в main process для плавного перетаскивания окна.

## Problem

Текущая архитектура использует IPC вызов на каждое событие `mousemove` (~60-100 раз/сек):
- Renderer: `mousedown` → IPC → `mousemove` → IPC → `mousemove` → IPC → ... → `mouseup` → IPC
- Каждый IPC вызов создаёт задержку, что приводит к "дёрганому" перетаскиванию

## Solution

Native cursor polling в main process:
- Renderer отправляет только `startDrag(offsetX, offsetY)` и `endDrag()`
- Main process использует `setInterval(16ms)` для polling `screen.getCursorScreenPoint()`
- Позиция окна обновляется напрямую без IPC overhead

## Changes

### 1. window-manager.ts

**Новые поля:**
```typescript
private dragOffsetX = 0;
private dragOffsetY = 0;
private dragInterval: NodeJS.Timeout | null = null;
```

**Изменения в IPC handlers:**
- `window:start-drag` принимает `(offsetX: number, offsetY: number)`
- Удалить `window:update-drag-position` handler

**Новая логика:**
```typescript
// В startDrag handler:
this.dragOffsetX = offsetX;
this.dragOffsetY = offsetY;
this.isDragging = true;
this.stopCursorPolling();
this.overlayWindow.setIgnoreMouseEvents(false);

this.dragInterval = setInterval(() => {
  const cursor = screen.getCursorScreenPoint();
  const x = cursor.x - this.dragOffsetX;
  const y = cursor.y - this.dragOffsetY;
  const validated = this.validatePosition(x, y);
  this.overlayWindow.setPosition(validated.x, validated.y);
}, 16); // ~60fps

// В endDrag handler:
if (this.dragInterval) {
  clearInterval(this.dragInterval);
  this.dragInterval = null;
}
this.isDragging = false;
this.saveConfig();
this.startCursorPolling();
```

### 2. preload/types.ts

```typescript
// Было:
startDrag(): Promise<void>;
updateDragPosition(screenX: number, screenY: number, offsetX: number, offsetY: number): Promise<void>;

// Стало:
startDrag(offsetX: number, offsetY: number): Promise<void>;
// updateDragPosition - удалить
```

### 3. preload/index.ts

```typescript
// Было:
startDrag: () => ipcRenderer.invoke('window:start-drag'),
updateDragPosition: (screenX, screenY, offsetX, offsetY) =>
  ipcRenderer.invoke('window:update-drag-position', screenX, screenY, offsetX, offsetY),

// Стало:
startDrag: (offsetX: number, offsetY: number) =>
  ipcRenderer.invoke('window:start-drag', offsetX, offsetY),
// updateDragPosition - удалить
```

### 4. renderer/main.ts

```typescript
// Было:
dragHandle.addEventListener('mousedown', async (e) => {
  isDragging = true;
  dragOffsetX = e.clientX;
  dragOffsetY = e.clientY;
  await window.electronAPI.window.startDrag();
  e.preventDefault();
});

document.addEventListener('mousemove', async (e) => {
  if (!isDragging) return;
  await window.electronAPI.window.updateDragPosition(
    e.screenX, e.screenY, dragOffsetX, dragOffsetY
  );
});

document.addEventListener('mouseup', async () => {
  if (!isDragging) return;
  isDragging = false;
  await window.electronAPI.window.endDrag();
});

// Стало:
dragHandle.addEventListener('mousedown', async (e) => {
  if (e.button !== 0) return;
  await window.electronAPI.window.startDrag(e.clientX, e.clientY);
  e.preventDefault();
});

document.addEventListener('mouseup', async () => {
  await window.electronAPI.window.endDrag();
});

// Удалить: isDragging, dragOffsetX, dragOffsetY переменные
// Удалить: mousemove listener
```

## Success Criteria

- [x] Перетаскивание плавное на 60fps
- [x] IPC вызовы только на mousedown/mouseup
- [x] CPU usage не увеличивается при перетаскивании
- [x] Позиция окна валидируется (не уходит за экран)
- [x] Конфиг сохраняется при завершении drag
