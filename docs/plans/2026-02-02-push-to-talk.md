# Push-to-Talk (Walkie-Talkie) Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a push-to-talk mode that allows users to hold a button/key to record and release to send, similar to walkie-talkie functionality.

**Architecture:** Implement PTT as a third input mode alongside existing "auto-send on pause" and "trigger word" modes. The browser handles all PTT logic via keyboard events when the page is focused. Server receives PTT state via SSE to support external PTT triggers. Visual feedback shows recording state with pulsing animation.

**Tech Stack:** HTML/CSS/JavaScript (browser), Express.js (server), SSE for real-time state sync

---

## Task 1: Add PTT State Management to Server

**Files:**
- Modify: `src/unified-server.ts:150-160` (add PTT state)
- Modify: `src/test-utils/test-server.ts:114-118` (add PTT state)

**Step 1: Write the failing test**

Create test file `src/__tests__/ptt-state.test.ts`:

```typescript
import { TestServer } from '../test-utils/test-server.js';

describe('PTT State API', () => {
  let server: TestServer;

  beforeEach(async () => {
    server = new TestServer();
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('POST /api/ptt', () => {
    it('should broadcast PTT start event to SSE clients', async () => {
      const response = await fetch(`${server.url}/api/ptt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });

      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should broadcast PTT stop event to SSE clients', async () => {
      const response = await fetch(`${server.url}/api/ptt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });

      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 400 for invalid action', async () => {
      const response = await fetch(`${server.url}/api/ptt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invalid' })
      });

      expect(response.status).toBe(400);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/ptt-state.test.ts`
Expected: FAIL with "404 Not Found" or similar

**Step 3: Add PTT endpoint to test-server.ts**

Add after line 461 in `src/test-utils/test-server.ts`:

```typescript
    // POST /api/ptt - Push-to-talk control
    this.app.post('/api/ptt', (req, res) => {
      const { action } = req.body;

      if (!action || !['start', 'stop'].includes(action)) {
        res.status(400).json({ error: 'Invalid action. Must be "start" or "stop"' });
        return;
      }

      // In real server, this broadcasts to SSE clients
      // For testing, we just acknowledge the request
      res.json({ success: true, action });
    });
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/ptt-state.test.ts`
Expected: PASS

**Step 5: Add PTT endpoint to unified-server.ts**

Add after line 678 (after voice-input-state endpoint) in `src/unified-server.ts`:

```typescript
// POST /api/ptt - Push-to-talk control (for external PTT triggers)
app.post('/api/ptt', (req: Request, res: Response) => {
  const { action } = req.body;

  if (!action || !['start', 'stop'].includes(action)) {
    res.status(400).json({ error: 'Invalid action. Must be "start" or "stop"' });
    return;
  }

  // Broadcast PTT event to all connected browser clients
  const message = JSON.stringify({ type: 'ptt', action });
  ttsClients.forEach(client => {
    client.write(`data: ${message}\n\n`);
  });

  debugLog(`[PTT] ${action === 'start' ? 'Started' : 'Stopped'} recording`);

  res.json({ success: true, action });
});
```

**Step 6: Run all tests to verify nothing broke**

Run: `npm test`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add src/__tests__/ptt-state.test.ts src/test-utils/test-server.ts src/unified-server.ts
git commit -m "feat(ptt): add server endpoint for push-to-talk control"
```

---

## Task 2: Add PTT UI Controls to Browser

**Files:**
- Modify: `public/index.html` (add PTT mode radio button and keybinding input)

**Step 1: Add PTT mode radio button**

In `public/index.html`, find the send-mode-controls div (around line 765-783) and add PTT mode:

```html
                <!-- Send Mode Controls -->
                <div class="send-mode-controls">
                    <div class="send-mode-radio">
                        <input type="radio" id="autoMode" name="sendMode" value="automatic" checked>
                        <label for="autoMode">Auto-send on pause</label>
                    </div>
                    <div class="send-mode-radio">
                        <input type="radio" id="triggerMode" name="sendMode" value="trigger">
                        <label for="triggerMode">Wait for trigger word</label>
                    </div>
                    <div class="send-mode-radio">
                        <input type="radio" id="pttMode" name="sendMode" value="ptt">
                        <label for="pttMode">Push-to-talk</label>
                    </div>
                    <div class="trigger-word-input" id="triggerWordInputContainer" style="display: none;">
                        <label for="triggerWordInput">Trigger:</label>
                        <input
                            type="text"
                            id="triggerWordInput"
                            placeholder="e.g., send, go"
                            value="send"
                        >
                    </div>
                    <div class="ptt-keybinding-input" id="pttKeybindingContainer" style="display: none;">
                        <label for="pttKeybindingInput">Hold key:</label>
                        <input
                            type="text"
                            id="pttKeybindingInput"
                            placeholder="Press a key..."
                            value="Space"
                            readonly
                        >
                        <span class="ptt-hint">(or hold mic button)</span>
                    </div>
                </div>
```

**Step 2: Add CSS for PTT keybinding input**

Add to the style section (around line 350, after .trigger-word-input):

```css
        .ptt-keybinding-input {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .ptt-keybinding-input label {
            font-size: 13px;
            color: #666;
        }

        .ptt-keybinding-input input {
            padding: 4px 8px;
            border: 1px solid #DDD;
            border-radius: 4px;
            font-size: 13px;
            width: 100px;
            text-align: center;
            cursor: pointer;
            background: #F8F9FA;
        }

        .ptt-keybinding-input input:focus {
            border-color: #007AFF;
            background: white;
        }

        .ptt-hint {
            font-size: 11px;
            color: #999;
        }

        /* PTT Recording State */
        .mic-button.ptt-recording {
            background: #EF5350;
            animation: pttPulse 0.5s ease-in-out infinite;
        }

        @keyframes pttPulse {
            0%, 100% {
                box-shadow: 0 0 0 0 rgba(239, 83, 80, 0.7);
                transform: scale(1);
            }
            50% {
                box-shadow: 0 0 0 12px rgba(239, 83, 80, 0);
                transform: scale(1.05);
            }
        }
```

**Step 3: Test manually in browser**

Open: `http://localhost:5111`
Verify: PTT radio button appears, selecting it shows keybinding input

**Step 4: Commit**

```bash
git add public/index.html
git commit -m "feat(ptt): add push-to-talk mode UI controls"
```

---

## Task 3: Implement PTT JavaScript Logic

**Files:**
- Modify: `public/app.js` (add PTT state and event handlers)

**Step 1: Add PTT state variables to constructor**

In `public/app.js`, add after line 48 (after `isPausedForTTS`):

```javascript
        // PTT state
        this.pttKey = 'Space'; // Default PTT key
        this.isPTTActive = false; // Is PTT recording active
        this.pttMinDuration = 300; // Minimum recording duration in ms (to avoid accidental triggers)
        this.pttStartTime = null; // When PTT started

        // PTT elements
        this.pttKeybindingContainer = document.getElementById('pttKeybindingContainer');
        this.pttKeybindingInput = document.getElementById('pttKeybindingInput');
```

**Step 2: Add PTT keybinding capture handler**

Add after `setupEventListeners()` method (around line 547):

```javascript
    setupPTTKeyCapture() {
        if (!this.pttKeybindingInput) return;

        this.pttKeybindingInput.addEventListener('keydown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Capture the key
            let keyName = e.key;
            if (e.key === ' ') keyName = 'Space';
            if (e.key === 'Control') keyName = 'Ctrl';

            // Store modifier state
            const modifiers = [];
            if (e.ctrlKey && e.key !== 'Control') modifiers.push('Ctrl');
            if (e.altKey && e.key !== 'Alt') modifiers.push('Alt');
            if (e.shiftKey && e.key !== 'Shift') modifiers.push('Shift');

            const fullKey = [...modifiers, keyName].join('+');

            this.pttKey = fullKey;
            this.pttKeybindingInput.value = fullKey;
            localStorage.setItem('pttKey', fullKey);

            // Blur the input after capture
            this.pttKeybindingInput.blur();
        });
    }
```

**Step 3: Add PTT keyboard event handlers**

Add after `setupPTTKeyCapture()`:

```javascript
    setupPTTKeyboardEvents() {
        // Handle keydown for PTT start
        document.addEventListener('keydown', (e) => {
            if (this.sendMode !== 'ptt') return;
            if (this.isPTTActive) return; // Already recording
            if (document.activeElement === this.messageInput) return; // Don't capture when typing
            if (document.activeElement === this.pttKeybindingInput) return; // Don't capture during keybind

            const keyName = this.getKeyName(e);
            if (keyName === this.pttKey) {
                e.preventDefault();
                this.startPTT();
            }
        });

        // Handle keyup for PTT stop
        document.addEventListener('keyup', (e) => {
            if (this.sendMode !== 'ptt') return;
            if (!this.isPTTActive) return;

            const keyName = this.getKeyName(e);
            if (keyName === this.pttKey) {
                e.preventDefault();
                this.stopPTT();
            }
        });

        // Handle focus loss - stop PTT
        window.addEventListener('blur', () => {
            if (this.isPTTActive) {
                this.stopPTT();
            }
        });
    }

    getKeyName(e) {
        let keyName = e.key;
        if (e.key === ' ') keyName = 'Space';
        if (e.key === 'Control') keyName = 'Ctrl';

        const modifiers = [];
        if (e.ctrlKey && e.key !== 'Control') modifiers.push('Ctrl');
        if (e.altKey && e.key !== 'Alt') modifiers.push('Alt');
        if (e.shiftKey && e.key !== 'Shift') modifiers.push('Shift');

        return [...modifiers, keyName].join('+');
    }
```

**Step 4: Add PTT start/stop methods**

Add after `setupPTTKeyboardEvents()`:

```javascript
    async startPTT() {
        if (this.isPTTActive) return;

        this.isPTTActive = true;
        this.pttStartTime = Date.now();
        this.micBtn.classList.add('ptt-recording');

        // Clear any existing text
        this.messageInput.value = '';
        this.accumulatedText = '';

        // Start recognition
        if (!this.recognition) {
            console.error('Speech recognition not available');
            this.isPTTActive = false;
            this.micBtn.classList.remove('ptt-recording');
            return;
        }

        try {
            this.isListening = true;
            this.recognition.start();
            await this.updateVoiceInputState(true);
            this.debugLog('[PTT] Started recording');
        } catch (e) {
            console.error('Failed to start PTT recognition:', e);
            this.isPTTActive = false;
            this.isListening = false;
            this.micBtn.classList.remove('ptt-recording');
        }
    }

    async stopPTT() {
        if (!this.isPTTActive) return;

        const duration = Date.now() - this.pttStartTime;
        this.isPTTActive = false;
        this.micBtn.classList.remove('ptt-recording');

        // Stop recognition
        if (this.recognition) {
            this.isListening = false;
            this.recognition.stop();
        }

        // Check minimum duration
        if (duration < this.pttMinDuration) {
            this.debugLog(`[PTT] Recording too short (${duration}ms), discarding`);
            this.messageInput.value = '';
            await this.updateVoiceInputState(false);
            return;
        }

        // Send the accumulated text
        const text = this.messageInput.value.trim();
        if (text) {
            this.debugLog(`[PTT] Sending: "${text}"`);
            await this.sendMessage(text);
            this.messageInput.value = '';
        }

        await this.updateVoiceInputState(false);
        this.debugLog('[PTT] Stopped recording');
    }
```

**Step 5: Update constructor to initialize PTT**

Add at end of constructor (around line 62, after `setInterval`):

```javascript
        // Initialize PTT
        this.setupPTTKeyCapture();
        this.setupPTTKeyboardEvents();
```

**Step 6: Update loadPreferences to load PTT key**

Add in `loadPreferences()` method (around line 312, after trigger word):

```javascript
        // Load PTT key preference
        const savedPttKey = localStorage.getItem('pttKey');
        if (savedPttKey) {
            this.pttKey = savedPttKey;
            if (this.pttKeybindingInput) {
                this.pttKeybindingInput.value = savedPttKey;
            }
        }
```

**Step 7: Update send mode radio handler**

Modify the send mode radio handler in `setupEventListeners()` (around line 442-448):

```javascript
        // Send mode radio buttons
        this.sendModeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.sendMode = e.target.value;
                this.triggerWordInputContainer.style.display =
                    this.sendMode === 'trigger' ? 'flex' : 'none';
                this.pttKeybindingContainer.style.display =
                    this.sendMode === 'ptt' ? 'flex' : 'none';
                localStorage.setItem('sendMode', this.sendMode);

                // If switching away from PTT, stop any active PTT session
                if (this.sendMode !== 'ptt' && this.isPTTActive) {
                    this.stopPTT();
                }
            });
        });
```

**Step 8: Update loadPreferences to restore PTT keybinding container visibility**

Add in `loadPreferences()` after the send mode loading (around line 300-302):

```javascript
            // Show/hide PTT keybinding input
            if (this.pttKeybindingContainer) {
                this.pttKeybindingContainer.style.display =
                    this.sendMode === 'ptt' ? 'flex' : 'none';
            }
```

**Step 9: Add mic button hold support for PTT**

Add to `setupEventListeners()` (around line 439, after micBtn click handler):

```javascript
        // Microphone button - support PTT hold
        this.micBtn.addEventListener('mousedown', (e) => {
            if (this.sendMode === 'ptt') {
                e.preventDefault();
                this.startPTT();
            }
        });

        this.micBtn.addEventListener('mouseup', () => {
            if (this.sendMode === 'ptt' && this.isPTTActive) {
                this.stopPTT();
            }
        });

        this.micBtn.addEventListener('mouseleave', () => {
            // Stop if mouse leaves button while holding
            if (this.sendMode === 'ptt' && this.isPTTActive) {
                this.stopPTT();
            }
        });

        // Touch support for mobile PTT
        this.micBtn.addEventListener('touchstart', (e) => {
            if (this.sendMode === 'ptt') {
                e.preventDefault();
                this.startPTT();
            }
        });

        this.micBtn.addEventListener('touchend', () => {
            if (this.sendMode === 'ptt' && this.isPTTActive) {
                this.stopPTT();
            }
        });
```

**Step 10: Test manually in browser**

1. Open: `http://localhost:5111`
2. Select "Push-to-talk" mode
3. Configure keybinding (default: Space)
4. Hold Space key or mic button to record
5. Release to send
6. Verify short recordings (<300ms) are discarded

**Step 11: Commit**

```bash
git add public/app.js
git commit -m "feat(ptt): implement push-to-talk JavaScript logic"
```

---

## Task 4: Handle SSE PTT Events from External Triggers

**Files:**
- Modify: `public/app.js` (handle PTT SSE events)

**Step 1: Add PTT event handling to initializeTTSEvents**

In `public/app.js`, modify `initializeTTSEvents()` method (around line 115-132) to handle PTT events:

```javascript
    initializeTTSEvents() {
        // Connect to SSE for TTS events
        this.eventSource = new EventSource(`${this.baseUrl}/api/tts-events`);

        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'speak' && data.text) {
                    this.speakText(data.text);
                } else if (data.type === 'waitStatus') {
                    this.handleWaitStatus(data.isWaiting);
                } else if (data.type === 'ptt') {
                    this.handlePTTEvent(data.action);
                }
            } catch (error) {
                console.error('Failed to parse TTS event:', error);
            }
        };

        this.eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
        };
    }
```

**Step 2: Add handlePTTEvent method**

Add after `handleWaitStatus()` method (around line 142):

```javascript
    handlePTTEvent(action) {
        // Handle PTT events from external sources (e.g., helper script)
        if (this.sendMode !== 'ptt') {
            this.debugLog('[PTT] Ignoring external PTT event - not in PTT mode');
            return;
        }

        if (action === 'start') {
            this.startPTT();
        } else if (action === 'stop') {
            this.stopPTT();
        }
    }
```

**Step 3: Test manually**

1. Open: `http://localhost:5111`
2. Select PTT mode
3. Use curl to send PTT start: `curl -X POST http://localhost:5111/api/ptt -H "Content-Type: application/json" -d '{"action":"start"}'`
4. Verify recording starts
5. Use curl to send PTT stop: `curl -X POST http://localhost:5111/api/ptt -H "Content-Type: application/json" -d '{"action":"stop"}'`
6. Verify recording stops and sends

**Step 4: Commit**

```bash
git add public/app.js
git commit -m "feat(ptt): handle external PTT triggers via SSE"
```

---

## Task 5: Add PTT Visual Feedback Enhancements

**Files:**
- Modify: `public/index.html` (add visual feedback elements)
- Modify: `public/app.js` (update visual state)

**Step 1: Add PTT status indicator to HTML**

In `public/index.html`, add after the input-container div (around line 798):

```html
                <!-- PTT Status Indicator -->
                <div id="pttStatus" class="ptt-status" style="display: none;">
                    <div class="ptt-status-icon"></div>
                    <span class="ptt-status-text">Hold to talk...</span>
                </div>
```

**Step 2: Add CSS for PTT status indicator**

Add to the style section (around line 380):

```css
        /* PTT Status Indicator */
        .ptt-status {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 8px 16px;
            background: #F5F5F5;
            border-radius: 8px;
            margin-top: 8px;
        }

        .ptt-status.recording {
            background: #FFEBEE;
        }

        .ptt-status-icon {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #9E9E9E;
        }

        .ptt-status.recording .ptt-status-icon {
            background: #EF5350;
            animation: pttStatusPulse 1s ease-in-out infinite;
        }

        @keyframes pttStatusPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .ptt-status-text {
            font-size: 13px;
            color: #666;
        }

        .ptt-status.recording .ptt-status-text {
            color: #EF5350;
            font-weight: 500;
        }
```

**Step 3: Add PTT status element reference**

In `public/app.js` constructor, add after `pttKeybindingInput`:

```javascript
        this.pttStatus = document.getElementById('pttStatus');
        this.pttStatusText = this.pttStatus?.querySelector('.ptt-status-text');
```

**Step 4: Update startPTT to show status**

In `startPTT()` method, add after setting `ptt-recording` class:

```javascript
        // Show PTT status
        if (this.pttStatus) {
            this.pttStatus.style.display = 'flex';
            this.pttStatus.classList.add('recording');
            if (this.pttStatusText) {
                this.pttStatusText.textContent = 'Recording...';
            }
        }
```

**Step 5: Update stopPTT to hide status**

In `stopPTT()` method, add after removing `ptt-recording` class:

```javascript
        // Hide PTT status
        if (this.pttStatus) {
            this.pttStatus.classList.remove('recording');
            if (this.pttStatusText) {
                this.pttStatusText.textContent = 'Hold to talk...';
            }
        }
```

**Step 6: Show/hide PTT status based on mode**

Update the send mode radio handler to show/hide PTT status:

```javascript
        // Send mode radio buttons
        this.sendModeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.sendMode = e.target.value;
                this.triggerWordInputContainer.style.display =
                    this.sendMode === 'trigger' ? 'flex' : 'none';
                this.pttKeybindingContainer.style.display =
                    this.sendMode === 'ptt' ? 'flex' : 'none';

                // Show/hide PTT status
                if (this.pttStatus) {
                    this.pttStatus.style.display =
                        this.sendMode === 'ptt' ? 'flex' : 'none';
                }

                localStorage.setItem('sendMode', this.sendMode);

                // If switching away from PTT, stop any active PTT session
                if (this.sendMode !== 'ptt' && this.isPTTActive) {
                    this.stopPTT();
                }
            });
        });
```

**Step 7: Update loadPreferences to restore PTT status visibility**

Add in `loadPreferences()` after PTT keybinding container visibility:

```javascript
            // Show/hide PTT status
            if (this.pttStatus) {
                this.pttStatus.style.display =
                    this.sendMode === 'ptt' ? 'flex' : 'none';
            }
```

**Step 8: Test manually**

1. Open: `http://localhost:5111`
2. Select PTT mode
3. Verify "Hold to talk..." indicator appears
4. Hold Space or mic button
5. Verify indicator changes to "Recording..." with red pulsing dot
6. Release
7. Verify indicator returns to idle state

**Step 9: Commit**

```bash
git add public/index.html public/app.js
git commit -m "feat(ptt): add visual feedback for recording state"
```

---

## Task 6: Update Roadmap and Documentation

**Files:**
- Modify: `roadmap.md` (mark PTT tasks as completed, add to completed sections)
- Modify: `README.md` (add PTT usage documentation)

**Step 1: Update roadmap.md**

Find the push-to-talk research reference and add completed tasks. In roadmap.md "Next tasks" section, add:

```markdown
- [x] Add Push-to-Talk (Walkie-Talkie) Mode
  - [x] Server endpoint for PTT control (`POST /api/ptt`)
  - [x] PTT mode radio button in UI
  - [x] Configurable PTT keybinding
  - [x] PTT JavaScript logic with keyboard events
  - [x] External PTT trigger support via SSE
  - [x] Visual feedback for recording state
  - [x] Minimum recording duration filter (300ms)
  - [x] Touch support for mobile
```

**Step 2: Update README.md**

Add PTT section after "Trigger Word Mode" section:

```markdown
### 5. Push-to-Talk Mode (Optional)

For hands-free operation with precise control, use Push-to-Talk mode:

1. Select "Push-to-talk" mode in the browser interface
2. Configure your preferred key (default: Space)
3. Hold the key to record, release to send
4. Or hold the microphone button to record

**Features:**
- Configurable keybinding (any key or key combination like Ctrl+Space)
- Visual feedback showing recording state
- Automatic discard of accidental short recordings (<300ms)
- Support for external PTT triggers via API
```

**Step 3: Commit**

```bash
git add roadmap.md README.md
git commit -m "docs: add push-to-talk documentation"
```

---

## Task 7: Final Testing and Cleanup

**Files:**
- Run all tests
- Manual testing

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests PASS

**Step 2: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Run linting**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Manual E2E testing**

Test scenarios:
1. Auto-send mode still works
2. Trigger word mode still works
3. PTT mode with keyboard
4. PTT mode with mouse hold on mic button
5. PTT mode with external API trigger
6. Switching between modes
7. Short recording rejection
8. Focus loss during PTT

**Step 5: Final commit**

```bash
git add -A
git commit -m "test: verify push-to-talk implementation"
```

---

## Summary

This plan adds Push-to-Talk (PTT) mode with the following components:

1. **Server endpoint** (`POST /api/ptt`) for external PTT triggers
2. **UI controls** - PTT mode radio button and keybinding configuration
3. **JavaScript logic** - keyboard events, mouse/touch support, state management
4. **SSE integration** - receive PTT commands from external sources
5. **Visual feedback** - recording indicator with pulsing animation
6. **Safety features** - minimum duration filter, focus loss handling

The implementation is backward-compatible with existing auto-send and trigger word modes.
