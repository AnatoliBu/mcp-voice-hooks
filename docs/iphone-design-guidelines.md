# iPhone Mobile Web UI/UX Design Guidelines (2025-2026)

Руководство по дизайну мобильного веб-интерфейса для iPhone, с фокусом на проект mcp-voice-hooks (messenger UI с голосовым вводом).

---

## 1. Краткое резюме ключевых принципов

### Apple Human Interface Guidelines (iOS 17-18, iOS 26 Liquid Glass)

1. **Минимум тач-таргетов 44x44pt** -- элементы меньше этого размера пропускаются 25%+ пользователей, особенно с моторными нарушениями.
2. **Одноручное использование** -- ключевые элементы управления должны быть в нижней трети экрана (зона досягаемости большого пальца). Исследования показывают рост времени использования на 18%.
3. **Ясность (Clarity)** -- минимальное количество элементов на экране, четкие инструкции, узнаваемые иконки.
4. **Типографика** -- San Francisco как системный шрифт (-apple-system), базовый размер текста 17pt, с возможностью настройки веса и цвета.
5. **Навигация** -- основные функции доступны за максимум 2 тапа, узнаваемые паттерны (tab bar снизу, кнопка "назад").
6. **Liquid Glass (2025)** -- Apple представила новый дизайн-язык с полупрозрачными элементами, динамическим преломлением света и единообразием компонентов. Это эволюция glassmorphism для веба.

### Ключевые CSS-аксиомы для iPhone

- `viewport-fit=cover` + `env(safe-area-inset-*)` -- обязательно для edge-to-edge дисплеев
- `100dvh` вместо `100vh` -- для корректной высоты с учетом тулбара Safari
- `font-size >= 16px` для input полей -- предотвращает авто-зум при фокусе
- Passive event listeners для touchstart/touchmove -- плавный скролл
- `prefers-color-scheme` + `prefers-reduced-motion` -- уважение настроек пользователя

---

## 2. Safe Areas и Viewport

### 2.1. Viewport Meta Tag

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

`viewport-fit=cover` позволяет контенту занимать всю площадь экрана, включая области за notch/Dynamic Island и home indicator. Без этого тега `env(safe-area-inset-*)` вернет 0.

### 2.2. Safe Area Insets

```css
/* Базовый подход -- отступы для body */
body {
    padding-top: env(safe-area-inset-top);
    padding-right: env(safe-area-inset-right);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
}

/* Фиксированный footer -- комбинация через calc() */
.bottom-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
}

/* Умный подход -- max() гарантирует минимальный отступ */
.content {
    padding-left: max(16px, env(safe-area-inset-left));
    padding-right: max(16px, env(safe-area-inset-right));
}

/* Header в PWA standalone режиме */
.app-header {
    padding-top: max(20px, env(safe-area-inset-top));
}
```

**Важно:** `env(safe-area-inset-top)` в обычном Safari (не PWA) будет 0, потому что адресная строка уже покрывает эту зону. В standalone PWA режиме -- будет ненулевым значением.

### 2.3. Viewport Height Units

```css
/* Проблема: 100vh на iOS включает скрытый тулбар Safari */
.full-height {
    height: 100vh;                    /* Fallback */
    height: 100dvh;                   /* Dynamic -- подстраивается при скролле */
}

/* Для стабильных layout без дергания: */
.stable-height {
    height: 100vh;
    height: 100svh;                   /* Small viewport -- с видимым тулбаром */
}

/* Прогрессивное улучшение */
.app-container {
    height: 100vh;
}
@supports (height: 100dvh) {
    .app-container {
        height: 100dvh;
    }
}
```

**Рекомендации по выбору единиц:**
| Единица | Когда использовать | Поведение |
|---------|-------------------|-----------|
| `100svh` | Hero-секции, фиксированные layout | Стабильно, без дерганья, самый консервативный |
| `100dvh` | Модальные окна, полноэкранные оверлеи | Динамически подстраивается при показе/скрытии тулбара |
| `100lvh` | Редко, аналог старого 100vh | Максимальная высота (тулбар скрыт) |

**Внимание:** `100dvh` может вызвать перерасчет стилей при скролле, что влияет на производительность. Для основного layout предпочтительнее `100svh`.

---

## 3. Типографика и предотвращение зума

### 3.1. Предотвращение авто-зума на input

iOS Safari автоматически зумит страницу при фокусе на input с `font-size < 16px`. Это поведение нельзя отключить через viewport meta tag без нарушения WCAG (accessibility).

```css
/* Решение 1: Просто 16px (рекомендуется) */
input, select, textarea {
    font-size: 16px;
}

/* Решение 2: Через rem (если html font-size = 16px) */
input, select, textarea {
    font-size: 1rem;
}

/* Решение 3: Pixel-perfect трюк для мелкого текста */
/* Визуально 13px, но iOS видит 16px */
.small-input {
    font-size: 16px;
    transform: scale(0.8125);          /* 13/16 = 0.8125 */
    transform-origin: left top;
    width: 123.077%;                   /* 16/13 * 100% */
    margin-bottom: -3px;              /* Компенсация высоты */
}
```

**Для проекта mcp-voice-hooks:** Textarea `.message-input` уже использует `font-size: 16px` в мобильном media query -- это правильно. Но другие input-ы в настройках (trigger word, PTT keybinding, delays) имеют `font-size: 12-13px` и будут вызывать зум.

### 3.2. Типографические рекомендации

```css
body {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
    -webkit-text-size-adjust: 100%;   /* Предотвращает увеличение текста при повороте */
    text-rendering: optimizeLegibility;
}

/* Иерархия размеров текста (Apple HIG) */
:root {
    --font-size-title1: 28px;
    --font-size-title2: 22px;
    --font-size-title3: 20px;
    --font-size-headline: 17px;       /* Основной размер */
    --font-size-body: 17px;
    --font-size-callout: 16px;
    --font-size-subhead: 15px;
    --font-size-footnote: 13px;
    --font-size-caption1: 12px;
    --font-size-caption2: 11px;
}
```

---

## 4. Touch Targets и взаимодействие

### 4.1. Минимальные размеры

```css
/* Apple HIG: 44x44pt минимум для WCAG AAA */
/* WCAG 2.5.8 Level AA: 24x24px минимум */
.touch-target {
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Если визуально элемент должен быть меньше -- расширяем через padding */
.small-visual-button {
    width: 24px;
    height: 24px;
    padding: 10px;                    /* Итого 44px тач-зона */
    margin: -10px;                    /* Компенсация визуального сдвига */
}
```

### 4.2. Устранение задержки и артефактов касания

```css
/* Убираем подсветку при тапе */
button, a, label, .interactive {
    -webkit-tap-highlight-color: transparent;
}

/* Предотвращаем double-tap zoom */
.interactive {
    touch-action: manipulation;
}

/* Предотвращаем выделение текста при длительном нажатии */
.no-select {
    -webkit-user-select: none;
    user-select: none;
}

/* Предотвращаем вызов контекстного меню при длительном нажатии */
.no-callout {
    -webkit-touch-callout: none;
}
```

### 4.3. Расстояние между элементами

```css
/* WCAG рекомендует минимум 8px между тачабельными элементами */
.button-group {
    gap: 8px;
}

/* Для маленьких кнопок -- лучше 12px */
.icon-buttons {
    gap: 12px;
}
```

### 4.4. Haptic Feedback (вибрация)

`navigator.vibrate()` НЕ работает в Safari на iOS (по состоянию на 2025). Есть хак через iOS 18+:

```javascript
// Создаем скрытый checkbox switch и кликаем по label для тактильного отклика
function triggerHaptic() {
    if (!('vibrate' in navigator)) {
        // iOS Safari workaround через <input type="checkbox" switch>
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.setAttribute('switch', '');
        input.style.cssText = 'position:fixed;left:-9999px;opacity:0';
        const label = document.createElement('label');
        document.body.appendChild(input);
        label.htmlFor = input.id = '_haptic_' + Date.now();
        document.body.appendChild(label);
        label.click();
        setTimeout(() => {
            input.remove();
            label.remove();
        }, 100);
    } else {
        navigator.vibrate(10);
    }
}
```

**Для проекта:** Haptic feedback при PTT record start/stop может значительно улучшить UX.

---

## 5. Dark Mode

### 5.1. Реализация через CSS Variables

```css
/* Светлая тема (по умолчанию) */
:root {
    --bg-primary: #FFFFFF;
    --bg-secondary: #F5F5F5;
    --bg-tertiary: #E5E5EA;
    --text-primary: #000000;
    --text-secondary: #666666;
    --text-tertiary: #999999;
    --accent: #007AFF;
    --accent-hover: #0051D5;
    --border: #E0E0E0;
    --bubble-user: #007AFF;
    --bubble-user-text: #FFFFFF;
    --bubble-assistant: #E5E5EA;
    --bubble-assistant-text: #000000;
    --input-bg: #F8F9FA;
    --danger: #EF5350;
    --shadow: rgba(0, 0, 0, 0.1);
}

/* Темная тема */
@media (prefers-color-scheme: dark) {
    :root {
        --bg-primary: #1C1C1E;
        --bg-secondary: #2C2C2E;
        --bg-tertiary: #3A3A3C;
        --text-primary: #FFFFFF;
        --text-secondary: #EBEBF5;
        --text-tertiary: #8E8E93;
        --accent: #0A84FF;
        --accent-hover: #409CFF;
        --border: #38383A;
        --bubble-user: #0A84FF;
        --bubble-user-text: #FFFFFF;
        --bubble-assistant: #3A3A3C;
        --bubble-assistant-text: #FFFFFF;
        --input-bg: #2C2C2E;
        --danger: #FF453A;
        --shadow: rgba(0, 0, 0, 0.3);
    }
}

/* Применение */
body {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
}

.message-bubble.user {
    background: var(--bubble-user);
    color: var(--bubble-user-text);
}

.message-bubble.assistant {
    background: var(--bubble-assistant);
    color: var(--bubble-assistant-text);
}
```

### 5.2. Ручной переключатель темы

```javascript
// Проверяем сохраненную тему или системные настройки
function getPreferredTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

// Если нужен ручной переключатель:
document.documentElement.setAttribute('data-theme', getPreferredTheme());
```

```css
/* Для ручного переключателя (вместо @media): */
[data-theme="dark"] {
    --bg-primary: #1C1C1E;
    /* ... все dark переменные */
}
```

### 5.3. Reduced Motion

```css
/* Уважаем настройки пользователя */
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }
}

/* Безопасная альтернатива: указывать анимации только для тех, кто их хочет */
@media (prefers-reduced-motion: no-preference) {
    .message-bubble {
        animation: messageSlideIn 0.2s ease-out;
    }

    .mic-button.listening {
        animation: micPulse 1.5s ease-in-out infinite;
    }
}
```

---

## 6. Glassmorphism / Liquid Glass для веба

### 6.1. Базовая реализация

```css
.glass-panel {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* Progressive enhancement */
@supports not (backdrop-filter: blur(10px)) {
    .glass-panel {
        background: rgba(255, 255, 255, 0.92);
    }
}

/* Для темной темы */
@media (prefers-color-scheme: dark) {
    .glass-panel {
        background: rgba(30, 30, 30, 0.6);
        border-color: rgba(255, 255, 255, 0.08);
    }
}
```

### 6.2. Производительность на мобильных

**Критически важные ограничения:**

- Лимит: **2-3 glass-элемента на экран** одновременно
- Blur значение: **8-12px на мобильных** (больше -- экспоненциально дороже)
- Никогда не анимировать `backdrop-filter`
- Использовать `will-change: backdrop-filter` для элементов, которые будут появляться/исчезать
- Тестировать на реальных устройствах (DevTools не показывает реальную производительность blur)

```css
/* Снижаем нагрузку на слабых устройствах */
@media (max-width: 768px) {
    .glass-panel {
        backdrop-filter: blur(8px);            /* Снижаем blur */
        -webkit-backdrop-filter: blur(8px);
    }
}
```

### 6.3. Liquid Glass -- Apple-стиль

```css
.liquid-glass {
    position: relative;
    background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.25) 0%,
        rgba(255, 255, 255, 0.05) 50%,
        rgba(255, 255, 255, 0.15) 100%
    );
    backdrop-filter: blur(12px) saturate(180%);
    -webkit-backdrop-filter: blur(12px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 20px;
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.4),    /* Внутренний блик сверху */
        inset 0 -1px 0 rgba(0, 0, 0, 0.05),         /* Тень снизу */
        0 4px 16px rgba(0, 0, 0, 0.08);
    overflow: hidden;
}

/* Блик (highlight layer) */
.liquid-glass::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.3) 0%,
        rgba(255, 255, 255, 0) 100%
    );
    border-radius: 20px 20px 0 0;
    pointer-events: none;
}
```

---

## 7. Chat UI: Паттерны дизайна мессенджеров

### 7.1. Спецификации пузырей сообщений

Рекомендации на основе iMessage и WhatsApp:

```css
.message-bubble {
    max-width: 75%;                           /* 70-85% ширины экрана */
    padding: 10px 14px;                       /* Apple: ~10px vertical, ~14px horizontal */
    border-radius: 18px;                      /* iMessage стиль */
    word-wrap: break-word;
    line-height: 1.4;
}

/* iMessage-стиль: скругление "хвоста" */
.message-bubble.user {
    align-self: flex-end;
    background: var(--bubble-user);
    color: var(--bubble-user-text);
    border-bottom-right-radius: 4px;          /* "Хвост" справа */
}

.message-bubble.assistant {
    align-self: flex-start;
    background: var(--bubble-assistant);
    color: var(--bubble-assistant-text);
    border-bottom-left-radius: 4px;           /* "Хвост" слева */
}

/* Группировка последовательных сообщений от одного отправителя */
.message-bubble.user + .message-bubble.user {
    border-top-right-radius: 4px;
    margin-top: 2px;
}

.message-bubble.assistant + .message-bubble.assistant {
    border-top-left-radius: 4px;
    margin-top: 2px;
}
```

### 7.2. Анимация появления сообщений

```css
@media (prefers-reduced-motion: no-preference) {
    .message-bubble {
        animation: messageAppear 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
}

@keyframes messageAppear {
    from {
        opacity: 0;
        transform: translateY(8px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}
```

### 7.3. Typing Indicator

```css
.typing-indicator {
    display: flex;
    gap: 4px;
    padding: 12px 16px;
    background: var(--bubble-assistant);
    border-radius: 18px;
    border-bottom-left-radius: 4px;
    align-self: flex-start;
}

.typing-dot {
    width: 8px;
    height: 8px;
    background: var(--text-tertiary);
    border-radius: 50%;
    animation: typingBounce 1.4s ease-in-out infinite;
}

.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typingBounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-4px); }
}
```

### 7.4. Input Area (паттерн WhatsApp/iMessage)

```css
.chat-input-area {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 8px 12px;
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
    background: var(--bg-primary);
    border-top: 0.5px solid var(--border);   /* 0.5px на Retina = 1 пиксель */
}

.chat-input-wrapper {
    flex: 1;
    display: flex;
    align-items: flex-end;
    background: var(--input-bg);
    border: 1px solid var(--border);
    border-radius: 22px;
    padding: 6px 12px;
    min-height: 44px;
}

.chat-input-wrapper textarea {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 16px;                         /* >= 16px для iOS! */
    line-height: 1.4;
    max-height: 120px;
    resize: none;
    outline: none;
    padding: 6px 0;
}

.mic-button {
    width: 44px;
    height: 44px;                            /* Минимум 44px для touch target */
    border-radius: 50%;
    flex-shrink: 0;
}
```

---

## 8. Scroll и жесты

### 8.1. Плавный скролл

```css
.scrollable-area {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;        /* Инерционный скролл */
    overscroll-behavior-y: contain;           /* Предотвращаем pull-to-refresh */
    scroll-behavior: smooth;
}

/* Автоскролл к последнему сообщению */
.conversation-messages {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    justify-content: flex-end;                /* Прижимаем контент вниз */
}
```

### 8.2. Passive Event Listeners

```javascript
// ОБЯЗАТЕЛЬНО для touchstart/touchmove -- иначе тормозит скролл
document.addEventListener('touchstart', handler, { passive: true });
document.addEventListener('touchmove', handler, { passive: true });
document.addEventListener('wheel', handler, { passive: true });

// Если нужен preventDefault -- явно указываем passive: false
element.addEventListener('touchmove', (e) => {
    e.preventDefault();  // Только если реально нужно!
}, { passive: false });
```

### 8.3. Предотвращение bounce-эффекта

```css
/* На body -- предотвращаем overscroll всей страницы */
body {
    overscroll-behavior: none;
    overflow: hidden;
}

/* На scrollable контейнере -- содержим bounce внутри */
.conversation-container {
    overscroll-behavior-y: contain;
}
```

---

## 9. Производительность на Mobile Safari

### 9.1. Анимации

```css
/* GPU-ускоренные свойства (дешевые): */
.animate-cheap {
    transform: translateX(0);
    opacity: 1;
    transition: transform 0.3s, opacity 0.3s;
}

/* CPU-дорогие свойства (избегать анимации): */
/* width, height, top, left, padding, margin, border-radius,
   box-shadow, backdrop-filter, background */
```

```css
/* Подсказка GPU о предстоящей анимации */
.will-animate {
    will-change: transform, opacity;
}

/* Убираем will-change после анимации (экономим память) */
.animation-done {
    will-change: auto;
}
```

### 9.2. Audio/Speech API на iOS Safari

**Критические ограничения:**

1. **Автоплей запрещен** -- звук можно воспроизвести только в обработчике пользовательского действия (click/tap):
```javascript
// НЕ сработает:
window.onload = () => audio.play();

// Сработает:
button.onclick = () => audio.play();
```

2. **Web Audio API глушится переключателем беззвучного режима** (но `<audio>` элемент -- нет).

3. **Speech Recognition в PWA НЕ работает** -- API доступен, feature detection проходит, но ничего не происходит. Только в Safari.

4. **Дубли транскриптов в Safari** -- `isFinal` может быть `false` всегда, транскрипт может дублироваться.

5. **Аудио не предзагружается** -- в отличие от desktop, `preload` атрибут игнорируется.

**Workaround для предзагрузки аудио:**
```javascript
// Разблокировка AudioContext при первом тапе
document.addEventListener('click', () => {
    const ctx = new AudioContext();
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
}, { once: true });
```

---

## 10. PWA (Progressive Web App)

### 10.1. Необходимые мета-теги

```html
<head>
    <!-- Viewport -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">

    <!-- PWA Meta Tags -->
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Voice Mode">
    <meta name="theme-color" content="#007AFF" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#1C1C1E" media="(prefers-color-scheme: dark)">

    <!-- Иконки -->
    <link rel="apple-touch-icon" href="/icons/icon-180x180.png" sizes="180x180">
    <link rel="apple-touch-icon" href="/icons/icon-167x167.png" sizes="167x167">

    <!-- Manifest -->
    <link rel="manifest" href="/manifest.json">
</head>
```

### 10.2. Web App Manifest

```json
{
    "name": "Voice Mode for Claude Code",
    "short_name": "Voice Mode",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#FFFFFF",
    "theme_color": "#007AFF",
    "icons": [
        { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
        { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
    ]
}
```

### 10.3. Status Bar стили

| Значение | Поведение |
|----------|-----------|
| `default` | Черный текст на белом фоне, контент под статусбаром |
| `black` | Белый текст на черном фоне, контент под статусбаром |
| `black-translucent` | Белый текст, прозрачный фон, контент ЗА статусбаром |

Для `black-translucent` необходимо компенсировать safe area:
```css
.app-header {
    padding-top: max(20px, env(safe-area-inset-top));
}
```

### 10.4. Определение standalone режима

```javascript
// Проверяем, запущено ли как PWA
const isStandalone = window.navigator.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;

if (!isStandalone) {
    // Показываем подсказку "Добавить на главный экран"
    showInstallPrompt();
}
```

**Критичное ограничение:** Speech Recognition API не работает в PWA standalone на iOS. Для проекта mcp-voice-hooks это означает, что PWA-режим не подходит -- нужно оставаться в Safari.

---

## 11. Accessibility (Доступность)

### 11.1. VoiceOver совместимость

```html
<!-- Семантическая разметка для screen readers -->
<main role="main" aria-label="Conversation">
    <div role="log" aria-live="polite" aria-label="Messages">
        <div role="article" aria-label="Your message">
            <p>Текст сообщения</p>
            <time datetime="2025-01-01T12:00:00">12:00</time>
        </div>
    </div>
</main>

<!-- Кнопки с описанием -->
<button aria-label="Start voice recording" aria-pressed="false">
    <svg aria-hidden="true">...</svg>
</button>

<!-- Live regions для динамического контента -->
<div aria-live="polite" aria-atomic="true" id="statusAnnouncer" class="sr-only">
    <!-- JavaScript обновляет текст для VoiceOver -->
</div>
```

```css
/* Скрытый текст только для screen readers */
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}
```

### 11.2. Контрастность

```css
/* WCAG AA: контраст 4.5:1 для обычного текста, 3:1 для крупного */
/* WCAG AAA: контраст 7:1 для обычного текста, 4.5:1 для крупного */

/* Примеры хороших комбинаций: */
/* Темный текст на светлом: #333 на #FFF = 12.63:1 */
/* Светлый текст на синем: #FFF на #007AFF = 4.58:1 (AA pass) */
/* Мета-текст на бабле: rgba(255,255,255,0.8) на #007AFF -- нужно проверить! */
```

### 11.3. Focus Management

```css
/* Видимый focus для клавиатурной навигации */
:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
}

/* Убираем outline только для мыши/тача */
:focus:not(:focus-visible) {
    outline: none;
}
```

---

## 12. Рекомендации для проекта mcp-voice-hooks

### 12.1. Анализ текущего состояния (index.html)

**Что уже сделано хорошо:**
- `viewport-fit=cover` в meta viewport
- `env(safe-area-inset-top)` для header
- `env(safe-area-inset-bottom)` для input section
- `100dvh` с fallback на `100vh`
- `font-size: 16px` для message-input на мобильных
- `-webkit-overflow-scrolling: touch` для скролла
- `overscroll-behavior` для предотвращения bounce
- `touch-action: manipulation` и `-webkit-tap-highlight-color` для кнопок
- Responsive media queries для 768px и 480px

**Что нужно улучшить:**

### 12.2. Конкретные улучшения

#### A. Критические (влияют на юзабилити)

1. **Input-ы в настройках вызывают авто-зум:**
```css
/* Проблема: trigger word, keybinding, delays имеют font-size: 12-13px */
/* Решение: */
.trigger-word-input input,
.ptt-keybinding-input input,
.delay-row input,
.wait-timeout-row input,
.tts-control select,
.tts-control input[type="number"],
#sttLanguageSelect {
    font-size: 16px;   /* Предотвращает зум на iOS */
}
```

2. **Кнопка микрофона мала на мобильных:**
```css
/* Текущее: 36x36px на mobile -- ниже минимума 44px */
@media (max-width: 768px) {
    .mic-button {
        width: 44px;       /* Было: 36px */
        height: 44px;      /* Было: 36px */
    }
}
```

3. **Icon buttons малы:**
```css
/* Текущее: 6px padding на mobile, итого ~30px */
@media (max-width: 768px) {
    .icon-button {
        min-width: 44px;
        min-height: 44px;
        padding: 10px;    /* Было: 6px */
    }
}
```

#### B. Важные (улучшают UX)

4. **Dark mode поддержка** -- см. секцию 5 выше. Добавить CSS переменные и `@media (prefers-color-scheme: dark)`.

5. **Reduced motion** -- обернуть анимации в `@media (prefers-reduced-motion: no-preference)`:
```css
/* Текущее: анимации всегда активны */
/* micPulse, pttPulse, messageSlideIn -- нужно условное применение */
@media (prefers-reduced-motion: no-preference) {
    .message-bubble { animation: messageSlideIn 0.2s ease-out; }
    .mic-button.listening { animation: micPulse 1.5s ease-in-out infinite; }
}
```

6. **Группировка последовательных сообщений:**
```css
.message-bubble.user + .message-bubble.user {
    border-top-right-radius: 4px;
    margin-top: 2px;
}
.message-bubble.assistant + .message-bubble.assistant {
    border-top-left-radius: 4px;
    margin-top: 2px;
}
```

7. **0.5px borders на Retina** вместо 1px для более тонкого вида:
```css
.conversation-header {
    border-bottom: 0.5px solid var(--border);
}
.input-section {
    border-top: 0.5px solid var(--border);
}
```

#### C. Улучшения (polish)

8. **Glassmorphism для header:**
```css
.app-header {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
    /* Убрать box-shadow: 8px 8px 0 #666 -- neo-brutalist стиль не iPhone-native */
}
```

9. **Glassmorphism для input area:**
```css
.input-section {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
}
```

10. **Scroll-to-bottom кнопка:**
```css
.scroll-to-bottom {
    position: absolute;
    bottom: 16px;
    right: 16px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--bg-primary);
    box-shadow: 0 2px 8px var(--shadow);
    border: 0.5px solid var(--border);
    display: none;   /* Показывать когда прокручено вверх */
    z-index: 10;
}
```

11. **Timestamp разделители между группами сообщений:**
```css
.date-separator {
    text-align: center;
    font-size: 12px;
    color: var(--text-tertiary);
    padding: 8px 0;
}
```

12. **aria-live для waiting indicator:**
```html
<div id="waitingIndicator" class="waiting-indicator"
     role="status" aria-live="polite" style="display: none;">
    Claude is waiting...
</div>
```

### 12.3. Приоритизированный список задач

| # | Улучшение | Приоритет | Сложность |
|---|-----------|-----------|-----------|
| 1 | Все input font-size >= 16px на мобильных | Критический | Низкая |
| 2 | Touch targets >= 44px для всех интерактивных элементов | Критический | Низкая |
| 3 | `prefers-reduced-motion` для всех анимаций | Важный | Низкая |
| 4 | Dark mode (CSS variables + media query) | Важный | Средняя |
| 5 | ARIA атрибуты для VoiceOver | Важный | Средняя |
| 6 | Группировка последовательных сообщений | Полезный | Низкая |
| 7 | Glassmorphism для header/input (опционально) | Полезный | Низкая |
| 8 | 0.5px borders на Retina | Полезный | Минимальная |
| 9 | Scroll-to-bottom кнопка | Полезный | Средняя |
| 10 | PWA meta tags (с учетом ограничений Speech API) | Низкий | Низкая |
| 11 | Haptic feedback для PTT | Экспериментальный | Средняя |
| 12 | Полная Liquid Glass тема | Косметический | Высокая |

---

## Источники

### Apple Documentation
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Designing for iOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios)
- [Layout Guidelines](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [Supported Meta Tags](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html)

### CSS и Web Standards
- [MDN: env() CSS function](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env)
- [MDN: prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
- [MDN: backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter)
- [MDN: Navigator.vibrate()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate)
- [New Viewport Units (Ahmad Shadeed)](https://ishadeed.com/article/new-viewport-units/)
- [16px Prevents iOS Form Zoom (CSS-Tricks)](https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/)
- [Designing Websites for iPhone X (WebKit)](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)

### Glassmorphism и Liquid Glass
- [Getting Clarity on Apple's Liquid Glass (CSS-Tricks)](https://css-tricks.com/getting-clarity-on-apples-liquid-glass/)
- [Recreating Apple's Liquid Glass with Pure CSS (DEV.to)](https://dev.to/kevinbism/recreating-apples-liquid-glass-effect-with-pure-css-3gpl)
- [Apple's Liquid Glass CSS Guide (DEV.to)](https://dev.to/gruszdev/apples-liquid-glass-revolution-how-glassmorphism-is-shaping-ui-design-in-2025-with-css-code-1221)
- [Glassmorphism Implementation Guide 2025](https://playground.halfaccessible.com/blog/glassmorphism-design-trend-implementation-guide)

### Performance
- [Passive Event Listeners (Chrome Developers)](https://developer.chrome.com/docs/lighthouse/best-practices/uses-passive-event-listeners)
- [Handling iOS Safari Toolbar (sabhya.dev)](https://www.sabhya.dev/handling-ios-safari-toolbar-for-full-height-web-content)
- [Dark Mode Done Right (DEV.to)](https://dev.to/javascriptwizzard/dark-mode-done-right-performance-accessibility-considerations-43b1)

### Chat UI Patterns
- [16 Chat UI Design Patterns 2025 (BricxLabs)](https://bricxlabs.com/blogs/message-screen-ui-deisgn)
- [iOS CSS Chat Bubbles (Samuel Kraft)](https://samuelkraft.com/blog/ios-chat-bubbles-css)
- [Chat Bubble Components (Flowbite)](https://flowbite.com/docs/components/chat-bubble/)

### PWA на iOS
- [PWA on iOS 2025 (Brainhub)](https://brainhub.eu/library/pwa-on-ios)
- [iOS PWA Compatibility (firt.dev)](https://firt.dev/notes/pwa-ios/)
- [Safari iOS PWA Limitations (Vinova)](https://vinova.sg/navigating-safari-ios-pwa-limitations/)
- [6 Tips for Native-Feel iOS PWA (Netguru)](https://www.netguru.com/blog/pwa-ios)

### Accessibility
- [Mobile Accessibility Testing WCAG (BrowserStack)](https://www.browserstack.com/guide/accessibility-testing-for-mobile-apps)
- [Web Accessibility on Mobile Devices (greeden.me)](https://blog.greeden.me/en/2025/04/08/the-importance-and-practical-tips-for-web-accessibility-on-mobile-devices/)

### iOS Safari Quirks
- [Taming the Web Speech API (Medium)](https://webreflection.medium.com/taming-the-web-speech-api-ef64f5a245e1)
- [SpeechRecognition Issues in Safari](https://discussions.apple.com/thread/255492924)
- [iOS Haptics Library (GitHub)](https://github.com/tijnjh/ios-haptics)
- [Preventing iOS Input Auto-Zoom (Defensive CSS)](https://defensivecss.dev/tip/input-zoom-safari/)
- [No Input Zoom Pixel-Perfect Way](https://thingsthemselves.com/no-input-zoom-in-safari-on-iphone-the-pixel-perfect-way/)
