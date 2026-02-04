# Анализ конкурентов и референсных проектов

Дата: 2026-02-02

## Обзор рынка

Голосовое управление для Claude Code — активно развивающаяся ниша. Найдено несколько проектов с разными подходами к решению проблемы.

---

## Голосовые проекты

### 1. VoiceMode
**URL:** https://github.com/mbailey/voicemode

**Описание:** Python-based CLI tool для голосовых разговоров с Claude Code через MCP сервер.

**Технологии:**
- Python 3.10-3.14
- STT: Whisper (cloud) или Whisper.cpp (локально)
- TTS: OpenAI API или Kokoro (локально)
- MCP Protocol
- tmux для headless режима

**Ключевые особенности:**
- Полностью локальная работа без интернета
- Умное определение пауз в речи (smart silence detection)
- Headless Claude Code в tmux для удалённого управления
- iOS приложение для мобильного доступа
- Установка через Claude Code plugin marketplace
- Низкая задержка в разговорах

**Интеграция:** MCP сервер, плагин или `claude mcp add`

**Сильные стороны:**
- Приватность (локальные модели)
- Зрелый проект с iOS приложением
- Гибкость cloud/local

**Слабые стороны:**
- Требует Python окружения
- Сложнее установка локальных моделей

---

### 2. Claude Phone
**URL:** https://github.com/theNetworkChuck/claude-phone

**Описание:** Телефонный интерфейс для Claude Code через SIP/3CX. Можно звонить Claude и Claude может звонить вам!

**Технологии:**
- Docker
- 3CX Cloud PBX
- REST API (порт 3333)
- SIP протокол

**Архитектура:**
- **All-in-One:** Mac/Linux сервер с Docker и Claude API
- **Split Mode:** Raspberry Pi (голос) + Mac/Linux (Claude Code)

**Ключевые особенности:**
- Входящие звонки на Claude
- **Исходящие звонки** — Claude может вам перезвонить!
- Разные личности/голоса для разных номеров
- REST API для автоматизации (`POST /api/outbound-call`)
- Автоопределение конфликтов портов

**Сильные стороны:**
- Уникальный UX — телефонные звонки
- Claude может инициировать контакт
- Работает с любого телефона

**Слабые стороны:**
- Требует 3CX аккаунт
- Сложная настройка SIP
- Зависимость от внешнего сервиса

---

### 3. AgentVibes
**URL:** https://github.com/paulpreibisch/AgentVibes

**Описание:** Голосовая озвучка сессий Claude AI с профессиональными голосами.

**Технологии:**
- Piper TTS (50+ бесплатных голосов)
- macOS Say (100+ встроенных голосов)

**Ключевые особенности:**
- Работает с Claude Code, Claude Desktop, Warp Terminal, Clawdbot
- Множество голосов и личностей
- Multi-provider поддержка

---

### 4. Claudet
**URL:** https://github.com/unclecode/claudet

**Описание:** Голосовой ввод для Claude.ai через браузер.

**Технологии:**
- Transformers.js
- Groq API

---

## Веб-интерфейсы

### 5. CloudCLI (Claude Code UI)
**URL:** https://github.com/siteboon/claudecodeui

**Описание:** Мобильный и веб клиент для Claude Code, Cursor CLI, Codex.

**Статистика:** ~10k звёзд на GitHub

**Ключевые особенности:**
- Responsive дизайн (desktop, tablet, mobile)
- Интерактивный чат
- Встроенный shell терминал
- File explorer
- Git explorer
- Шифрование
- Realtime взаимодействие

---

### 6. claude-code-webui
**URL:** https://github.com/sugyan/claude-code-webui

**Описание:** Веб-интерфейс для Claude Code CLI со стриминговыми ответами.

**Интересный факт:** Проект почти полностью написан самим Claude Code.

---

### 7. claude-code-web
**URL:** https://github.com/lennardv2/claude-code-web-ui

**Описание:** Browser-based WebUI на Nuxt 4.

**Ключевые особенности:**
- Голосовой ввод
- Text-to-speech
- Drag-and-drop изображений
- Горячие клавиши
- Todo sidebar

---

## SDK и инструменты

### 8. claude-code-js
**URL:** https://github.com/s-soroosh/claude-code-js

**Описание:** TypeScript SDK обёртка над Claude Code CLI.

**Возможности:**
- Управление сессиями
- Программная отправка промптов
- Стриминг stdout/stderr
- Форк сессий для параллельных экспериментов
- Полная TypeScript поддержка

---

### 9. claude-code-sdk-ts
**URL:** https://github.com/instantlyeasy/claude-code-sdk-ts

**Описание:** Fluent, chainable TypeScript SDK.

**Возможности:**
- Конфигурация моделей
- Включение инструментов
- Стриминг событий
- Multi-level logging
- onMessage/onToolUse callbacks

---

### 10. Официальные ресурсы Anthropic

- **claude-agent-sdk-demos:** https://github.com/anthropics/claude-agent-sdk-demos
- **claude-agent-sdk-python:** https://github.com/anthropics/claude-agent-sdk-python
- **claude-code-action:** https://github.com/anthropics/claude-code-action
- **awesome-claude-code:** https://github.com/hesreallyhim/awesome-claude-code

---

## Сравнительная таблица голосовых решений

| Проект | Язык | STT | TTS | Интеграция | Уникальность |
|--------|------|-----|-----|------------|--------------|
| **mcp-voice-hooks** (наш) | TypeScript | Browser Web Speech API | Browser + System | MCP + Hooks | Бесплатно, без API ключей, PTT |
| **VoiceMode** | Python | Whisper/Whisper.cpp | OpenAI/Kokoro | MCP | Локальные модели, iOS app |
| **Claude Phone** | Docker | 3CX | 3CX | REST API | Телефонные звонки, callback |
| **AgentVibes** | - | - | Piper/macOS Say | Overlay | 50+ голосов |

---

## Технические лимиты

### Claude Code Hooks
- **Дефолтный таймаут:** 600 секунд (10 минут) для command hooks
- **Максимальный таймаут:** 600 секунд (нельзя увеличить)
- Prompt hooks: 30 сек дефолт
- Agent hooks: 60 сек дефолт

### Наше решение
- Ограничение в UI: 30-600 секунд
- Совпадает с лимитами Claude Code

---

## Возможности для развития

1. **Локальные модели** — добавить Whisper.cpp/Kokoro как у VoiceMode
2. **Callback функционал** — уведомления когда Claude ждёт ввода (частично есть)
3. **iOS/Android приложение** — как у VoiceMode
4. **Телефонная интеграция** — опционально через SIP
5. **SDK обёртка** — использовать claude-code-js для обхода таймаутов

---

## Выводы

1. **VoiceMode** — главный прямой конкурент, но на Python. Мы на TypeScript с браузерным подходом.

2. **Наше преимущество:** Zero-config, работает в браузере, не нужны API ключи, бесплатно.

3. **Их преимущество:** Локальные модели для приватности, iOS приложение.

4. **Рыночная ниша:** Простое решение для быстрого старта vs. продвинутое решение с локальными моделями.

5. **Claude Phone** — уникальный проект, не прямой конкурент, но интересная идея callback звонков.
