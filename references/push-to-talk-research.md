# Технический отчёт: Push-to-Talk в браузерном приложении

## 1. Варианты взаимодействия

### Hold-to-Talk (Зажать = говорить, Отпустить = отправить)

**Принцип работы:**
- `keydown` событие запускает запись
- `keyup` событие останавливает запись и отправляет

**Плюсы:**
- Интуитивно понятен (как рация)
- Пользователь полностью контролирует длительность записи
- Меньше случайных отправок

**Минусы:**
- Требует удержания клавиши - неудобно для длинных сообщений
- Проблема с `event.repeat` - при удержании клавиши браузер генерирует множественные `keydown` события
- Требует обработки `event.repeat === true` для фильтрации повторных срабатываний

**Код для обработки repeat:**
```javascript
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat) {
    startRecording();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    stopRecordingAndSend();
  }
});
```

### Toggle Mode (Нажать = начать, Нажать снова = отправить)

**Принцип работы:**
- Первое нажатие запускает запись
- Второе нажатие останавливает и отправляет

**Плюсы:**
- Удобнее для длинных сообщений
- Не требует удержания клавиши
- Проще в реализации (только `keydown`)
- Лучше для accessibility

**Минусы:**
- Можно забыть остановить запись
- Требует визуальный индикатор состояния

### Рекомендация для mcp-voice-hooks

**Toggle mode предпочтительнее** для данного проекта, потому что:
1. Уже реализован continuous режим с автоматической сегментацией utterances
2. Пользователь может говорить долго без удержания клавиши
3. Проект уже использует toggle в Electron (`toggle-listening` IPC event)

---

## 2. Технические ограничения браузеров

### Критическое ограничение: Фоновые вкладки

**Keyboard events НЕ работают когда вкладка неактивна.** Это фундаментальное ограничение безопасности браузеров.

> "Push to Talk is limited online and only works when the browser tab has focus" - [Discord Support](https://support.discord.com/hc/en-us/articles/211376518-Voice-Input-Modes-101-Push-to-Talk-Voice-Activated)

**Причины:**
- Защита от keyloggers
- Экономия ресурсов
- Privacy concerns

**Workarounds:**
1. **Electron app** - использовать `globalShortcut` (работает глобально)
2. **Browser extension** - может получить elevated permissions
3. **Native desktop app** - полный контроль

### Какие события использовать

| Событие | Статус | Использование |
|---------|--------|---------------|
| `keydown` | Рекомендуется | Момент нажатия клавиши |
| `keyup` | Рекомендуется | Момент отпускания клавиши |
| `keypress` | **Deprecated** | Не использовать |

> "keydown fires the moment a key goes down. keyup fires when the key comes back up" - [JavaScript.info](https://javascript.info/keyboard-events)

### Pointer Events для кнопок UI

| Событие | Использование |
|---------|---------------|
| `pointerdown` | Универсально (touch + mouse) |
| `pointerup` | Универсально (touch + mouse) |
| `mousedown/mouseup` | Только mouse |
| `touchstart/touchend` | Только touch |

**Рекомендация:** Использовать `pointer*` события для универсальности.

### Ограничения на мобильных устройствах

1. **Нет физической клавиатуры** - keyboard shortcuts неприменимы
2. **Touch events** - используйте `pointerdown`/`pointerup` для кнопки
3. **Screen reader** - кнопка должна быть accessible

### Проблемы с фокусом и потерей событий

1. **Потеря фокуса при клике вне окна** - `keyup` может не сработать
2. **Alert/confirm dialogs** - блокируют события
3. **Tab switching** - теряется контекст

**Решение:**
```javascript
window.addEventListener('blur', () => {
  // Принудительно останавливаем запись при потере фокуса
  if (isRecording) {
    stopRecording();
  }
});
```

---

## 3. Best Practices для UI/UX

### Выбор клавиши по умолчанию

| Клавиша | За | Против |
|---------|-----|--------|
| **Space** | Интуитивно, большая | Конфликт с accessibility (активация кнопок, чекбоксы) |
| **Ctrl+Space** | Нет конфликтов | Сложнее нажать |
| **C, V, B** | Рекомендует Discord | Конфликт с Ctrl+C/V |
| **`** (Backtick) | Редко используется | Неудобно на некоторых раскладках |
| **F-keys** | Нет конфликтов | Могут быть заняты системой |

**Рекомендация для mcp-voice-hooks:**
- **Primary:** `Ctrl+Space` или `Alt+Space` - модификатор избегает конфликтов
- **Alternative:** Настраиваемая клавиша через UI
- Текущая реализация уже позволяет настраивать hotkey

### WCAG Accessibility Requirements

Согласно [WCAG 2.1.4 Character Key Shortcuts](https://www.w3.org/WAI/WCAG21/Understanding/character-key-shortcuts.html):

1. **Возможность отключить** shortcut
2. **Возможность переназначить** на другую клавишу
3. **Активация только при фокусе** на компоненте

> "If a keyboard shortcut is implemented using only a letter, punctuation, number, or symbol characters, users have the ability to turn it off, remap it" - W3C WCAG

### Визуальная обратная связь

**Обязательные индикаторы:**
1. Состояние "Listening" - микрофон активен (пульсирующий красный)
2. Состояние "Processing" - идёт обработка (spinner)
3. Состояние "Idle" - готов к записи (нейтральный)
4. Состояние "Error" - проблема (красный с описанием)

**Уже реализовано в проекте:**
```typescript
// electron/renderer/types.ts
export enum OverlayState {
  IDLE = 'idle',
  LISTENING = 'listening',
  RECORDING = 'recording',
  PROCESSING = 'processing',
  ERROR = 'error'
}
```

### Избежание конфликтов с браузерными shortcuts

**Зарезервированные комбинации (избегать):**
- `Ctrl+C/V/X/A/Z` - буфер обмена, выделение, undo
- `Ctrl+W/T/N` - управление вкладками
- `Ctrl+F` - поиск
- `Ctrl+S` - сохранение
- `Ctrl+P` - печать
- `F5` - обновление
- `Space` - scroll, активация кнопок

**Безопасные комбинации:**
- `Ctrl+Shift+<letter>` - редко используются браузером
- `Alt+<letter>` - осторожно, могут конфликтовать с меню
- `F1-F12` - некоторые свободны

---

## 4. Примеры реализации

### Discord

**Desktop app:**
- Использует native hooks через C++ модули
- Работает глобально, даже когда приложение свёрнуто
- Поддерживает hold-to-talk и toggle
- Настраиваемые keybinds

**Web app:**
> "The Web version PTT is significantly restricted. It will only work if you have the Discord browser tab open" - [Discord Support](https://support.discord.com/hc/en-us/articles/211376518-Voice-Input-Modes-101-Push-to-Talk-Voice-Activated)

- PTT работает только при фокусе на вкладке
- Рекомендуют desktop версию для полноценного PTT

### Telegram Desktop

- Поддерживает настраиваемые Push-to-Talk shortcuts
- Toggle включается через Settings
- Работает глобально через native hooks
- Поддержка mouse buttons (M4-M5)

### Google Meet (Bookmarklet workaround)

- [Push To Talk Bookmarklet](https://gist.github.com/caseywatts/561bc498b6feec3d419b29a65d916663) - временное решение
- Работает только при фокусе на вкладке
- Использует Space для PTT

---

## 5. Готовые библиотеки

### Для браузера (ограничены фокусом)

1. **[react-speech-recognition](https://www.npmjs.com/package/react-speech-recognition)**
   - Wrapper над Web Speech API
   - Документация по созданию PTT button
   - `SpeechRecognition.startListening()` / `SpeechRecognition.stopListening()`

2. **[push-to-talk](https://github.com/richardanaya/push-to-talk)**
   - Простая библиотека для voice-to-text PTT
   - Демонстрационный пример

### Для Electron/Node.js (глобальные shortcuts)

1. **[iohook](https://github.com/wilix-team/iohook)** (npm: 40+ проектов)
   - Global keyboard AND mouse listener
   - Поддерживает `keydown` и `keyup` events
   - Поддерживает shortcut registration с callbacks для press/release
   - Linux требует `libxkbcommon-x11`

   ```javascript
   const ioHook = require('iohook');

   ioHook.on('keydown', event => {
     if (event.keycode === 57) { // Space
       startRecording();
     }
   });

   ioHook.on('keyup', event => {
     if (event.keycode === 57) {
       stopRecording();
     }
   });

   ioHook.start();
   ```

2. **[node-global-key-listener](https://github.com/LaunchMenu/node-global-key-listener)** (npm: 21 проект)
   - Более простая альтернатива iohook
   - Cross-platform
   - Меньше зависимостей

**Важно:** Electron `globalShortcut` НЕ поддерживает `keyup` события - только `keydown`. Для полноценного hold-to-talk нужны native modules.

---

## 6. Web Speech API специфика

### Программный контроль start/stop

```javascript
const recognition = new webkitSpeechRecognition();

// Запуск
recognition.start();

// Остановка с получением результата
recognition.stop(); // Попытается вернуть результат из уже записанного аудио

// Прерывание без результата
recognition.abort();
```

> "The stop method represents an instruction to the recognition service to stop listening to more audio, and to try and return a result using just the audio that it has already received" - [Web Speech API Spec](https://dvcs.w3.org/hg/speech-api/raw-file/tip/webspeechapi)

### Latency и задержки

**Типичные задержки:**
- **Start latency:** ~100-300ms до начала распознавания
- **Stop latency:** ~200-500ms до получения финального результата
- **Network latency:** Зависит от провайдера (Chrome использует Google серверы)

**Проблемы continuous mode:**
> "The continuous param doesn't work properly in Chrome desktop or for Android. It stops when no-speech was detected after usually 3-4 seconds" - [GitHub Issue](https://github.com/WebAudio/web-speech-api/issues/99)

**Workaround (уже реализован в проекте):**
```typescript
// electron/renderer/speech/speech-recognition.ts
private handleEnd(): void {
  this.isListening = false;

  // Auto-restart если пользователь хочет продолжать слушать
  if (this.shouldBeListening && this.restartAttempts < this.maxRestartAttempts) {
    this.attemptRestart();
  }
}
```

### MediaRecorder API как альтернатива

Для более точного контроля можно использовать MediaRecorder:

```javascript
const mediaRecorder = new MediaRecorder(stream);
const chunks = [];

mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
mediaRecorder.onstop = () => {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  // Отправить blob на сервер для STT
};

// Точный контроль start/stop
mediaRecorder.start();
mediaRecorder.stop(); // Немедленная остановка
```

**Сравнение:**
| Аспект | Web Speech API | MediaRecorder + External STT |
|--------|---------------|------------------------------|
| Latency | Выше (network) | Контролируемый |
| Offline | Нет | Да (локальный STT) |
| Контроль stop | Задержка | Мгновенный |
| Качество | Зависит от браузера | Контролируемый |

---

## 7. Рекомендации для mcp-voice-hooks

### Текущее состояние

Проект уже имеет:
1. **Electron app** с `globalShortcut` для toggle listening
2. **Continuous mode** с auto-restart
3. **Trigger word mode** как альтернатива
4. **Настраиваемый hotkey** через settings

### Рекомендуемые улучшения

#### 0. Standalone PTT Helper Script (Простейший вариант)

Отдельный Node.js скрипт, который слушает глобальную клавишу и отправляет HTTP запросы на браузерную страничку:

```javascript
// ptt-helper.js
// npm install node-global-key-listener

import { GlobalKeyboardListener } from 'node-global-key-listener';

const PORT = 5111; // mcp-voice-hooks port
const PTT_KEY = 'SPACE'; // или другая клавиша

const listener = new GlobalKeyboardListener();

let isHolding = false;

listener.addListener((e, down) => {
  if (e.name === PTT_KEY) {
    if (down[e.name] && !isHolding) {
      // Key pressed - start recording
      isHolding = true;
      fetch(`http://localhost:${PORT}/api/ptt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      }).catch(console.error);
      console.log('PTT: Recording started');
    } else if (!down[e.name] && isHolding) {
      // Key released - stop recording and send
      isHolding = false;
      fetch(`http://localhost:${PORT}/api/ptt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      }).catch(console.error);
      console.log('PTT: Recording stopped, sending...');
    }
  }
});

console.log(`PTT Helper listening for ${PTT_KEY} key...`);
console.log(`Sending commands to http://localhost:${PORT}`);
```

**Использование:**
```bash
npm install node-global-key-listener
node ptt-helper.js
```

**Преимущества:**
- Работает глобально, даже когда браузер не в фокусе
- Не требует модификации браузера или расширений
- Легко настроить любую клавишу
- Можно запускать как системный сервис

**На стороне сервера (добавить endpoint):**
```typescript
// В unified-server.ts добавить:
app.post('/api/ptt', (req, res) => {
  const { action } = req.body;
  // Отправить SSE событие в браузер
  const message = JSON.stringify({ type: 'ptt', action });
  ttsClients.forEach(client => {
    client.write(`data: ${message}\n\n`);
  });
  res.json({ success: true });
});
```

**На стороне браузера (обработать SSE):**
```javascript
eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'ptt') {
    if (data.action === 'start') {
      startListening();
    } else if (data.action === 'stop') {
      stopListeningAndSend();
    }
  }
});
```

---

#### 1. Добавить Hold-to-Talk режим

Для реализации полноценного hold-to-talk в Electron потребуется:

```typescript
// Использовать node-global-key-listener или iohook
import { GlobalKeyboardListener } from 'node-global-key-listener';

const listener = new GlobalKeyboardListener();

listener.addListener((e, down) => {
  if (e.name === 'SPACE' && down[e.name]) {
    // Key pressed
    mainWindow.webContents.send('ptt-start');
  } else if (e.name === 'SPACE' && !down[e.name]) {
    // Key released
    mainWindow.webContents.send('ptt-stop');
  }
});
```

#### 2. Добавить UI переключатель режимов

```
[ ] Auto-send (текущий режим)
[ ] Trigger word
[ ] Push-to-talk (зажать клавишу)
[ ] Toggle (нажать дважды)
```

#### 3. Улучшить визуальный feedback для PTT

```typescript
enum PTTState {
  IDLE = 'idle',           // Готов к записи
  HOLDING = 'holding',     // Клавиша зажата, идёт запись
  PROCESSING = 'processing' // Отпущено, обработка
}
```

#### 4. Обработка edge cases

```typescript
// Потеря фокуса при зажатой клавише
app.on('browser-window-blur', () => {
  if (pttState === 'holding') {
    stopRecordingAndSend();
  }
});

// Очень короткие записи (случайные нажатия)
const MIN_RECORDING_DURATION = 300; // ms
if (recordingDuration < MIN_RECORDING_DURATION) {
  discardRecording();
}
```

### Архитектурное решение

```
┌─────────────────────────────────────────────────────────────┐
│                    mcp-voice-hooks                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│  │ Auto-send   │   │ Trigger     │   │ Push-to-    │       │
│  │ Mode        │   │ Word Mode   │   │ Talk Mode   │       │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘       │
│         │                 │                 │               │
│         └────────────────┼─────────────────┘               │
│                          │                                  │
│                   ┌──────▼──────┐                          │
│                   │ Speech      │                          │
│                   │ Manager     │                          │
│                   └──────┬──────┘                          │
│                          │                                  │
│         ┌────────────────┼────────────────┐                │
│         │                │                │                │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐        │
│  │ Web Speech  │  │ Global Key  │  │ UI Button   │        │
│  │ API         │  │ Listener    │  │ (touch)     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Источники

- [JavaScript Keyboard Events](https://javascript.info/keyboard-events)
- [MDN: Element keydown event](https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event)
- [Discord Voice Input Modes 101](https://support.discord.com/hc/en-us/articles/211376518-Voice-Input-Modes-101-Push-to-Talk-Voice-Activated)
- [Telegram Push-to-Talk Shortcuts](https://telegram.tips/blog/push-to-talk-shortcuts/)
- [Web Speech API Specification](https://dvcs.w3.org/hg/speech-api/raw-file/tip/webspeechapi)
- [WCAG 2.1.4 Character Key Shortcuts](https://www.w3.org/WAI/WCAG21/Understanding/character-key-shortcuts.html)
- [WCAG 2.1.1 Keyboard](https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html)
- [Page Visibility API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [Electron globalShortcut](https://www.electronjs.org/docs/latest/api/global-shortcut)
- [iohook - Node.js global keyboard listener](https://github.com/wilix-team/iohook)
- [node-global-key-listener](https://github.com/LaunchMenu/node-global-key-listener)
- [react-speech-recognition](https://www.npmjs.com/package/react-speech-recognition)
