# Plan: TTS Queue Mode, Read Aloud Button, Edit/Delete Pending Messages

Date: 2026-02-04

---

## Feature 1: TTS Queue Mode (interrupt vs wait)

### Current behavior

`speakText()` in `app.js:342` calls `speechSynthesis.cancel()` before every new utterance — always interrupts.
For system voice (Mac `say`), the server fires `say` via child process — if previous `say` is still running, they overlap.

### Goal

Add a toggle: **Interrupt** (current) vs **Queue** (wait for current speech to finish).

### Design

**Frontend (app.js):**
- New state: `this.ttsQueueMode = false` (false = interrupt, true = queue)
- New setting in Settings spoiler: checkbox "Queue voice responses (don't interrupt)"
- Save to localStorage: `ttsQueueMode`

**Browser TTS path (`speakText`, browser voice branch):**
- Interrupt mode: keep `speechSynthesis.cancel()` before `speak()`
- Queue mode: skip `cancel()`, just call `speechSynthesis.speak()` — browser API queues natively

**System voice path (`speakText`, system voice branch):**
- Interrupt mode: current behavior (fire and forget `/api/speak-system`)
- Queue mode: server needs to serialize `say` commands — wait for previous `say` to exit before starting next

### Files to change

| File | Change |
|------|--------|
| `public/index.html` | Add checkbox in Settings spoiler (after "Pause mic during speech") |
| `public/app.js` | Add `ttsQueueMode` state, load/save preference, conditional `cancel()` |
| `src/unified-server.ts` | Queue system voice commands (serialize child_process `say`) |

### Open questions

1. **System voice queuing**: The server currently spawns `say` and returns immediately. For queue mode, should the server:
   - (a) Wait for `say` to finish before returning response? (simpler, but blocks the SSE speak event)
   - (b) Queue internally and process sequentially? (more complex, but non-blocking)
   - (c) Only support queue mode for browser voices, not system voice?

2. **Should the "stop speaking" button exist?** If we add queue mode, users might queue up multiple messages. Should there be a way to cancel the queue? A "stop" button in the UI?

3. **Mic pause behavior in queue mode**: Currently mic pauses during TTS. In queue mode with multiple queued utterances, should mic stay paused for the entire queue, or pause/unpause between each utterance?

4. **Default mode**: Should queue mode be the default? Interrupt seems more natural for real-time conversation, but queue is better for listening to long responses.

---

## Feature 2: Read Aloud Button on Messages

### Goal

Add a speaker icon button on message bubbles to manually read them aloud.

### Design

**UI:**
- Small speaker icon (🔊) on each message bubble
- Appears on hover (desktop) or always visible (mobile) — similar to delete button behavior
- Position: in `message-meta` row, next to timestamp

**Behavior on click:**
- Calls `speakText(message.text)` with current voice settings
- Respects queue/interrupt mode from Feature 1
- Works regardless of whether voice responses toggle is on/off (manual action = always works)

### Files to change

| File | Change |
|------|--------|
| `public/index.html` | CSS for `.read-aloud-btn` (similar to `.delete-message-btn`) |
| `public/app.js` | Add speaker button in `createMessageBubble()`, bind click to `speakText()` |

### Open questions

1. **Which messages get the button?**
   - (a) All messages (user + assistant) — user can re-listen to anything
   - (b) Only assistant messages — user already knows what they said
   - (c) All messages — seems most useful

2. **Voice responses disabled**: Should the read-aloud button still work even when voice responses toggle is off? I think yes — the toggle controls automatic responses, not manual playback.

3. **Visual feedback during playback**: Should the button animate/change color while that specific message is being spoken? Would need to track which message is currently being read.

4. **Long messages**: For very long assistant messages, should there be a way to stop reading mid-message? Perhaps clicking the button again stops it?

---

## Feature 3: Edit Pending Messages

### Current state

- Delete button already exists for pending messages (`deleteMessage()` → `DELETE /api/utterances/:id`)
- Delete only works for `pending` status (server enforces this)
- No edit functionality

### Goal

Allow editing the text of pending messages before Claude reads them.

### Design

**Frontend:**
- Add edit icon button (pencil ✏️) next to delete button for pending messages
- Click → message text becomes an editable `<textarea>` inline
- Show Save/Cancel buttons below the textarea
- Save → `PUT /api/utterances/:id` with new text
- Cancel → revert to original text display
- If message status changes from `pending` during editing → show warning and cancel edit

**Backend:**
- New endpoint: `PUT /api/utterances/:id` with `{ text: "new text" }`
- Only works for `pending` status (same restriction as delete)
- Updates utterance text and timestamp

### Files to change

| File | Change |
|------|--------|
| `public/index.html` | CSS for edit mode (inline textarea, save/cancel buttons, edit icon) |
| `public/app.js` | `createMessageBubble()`: add edit button; new methods: `startEditMessage()`, `saveEditMessage()`, `cancelEditMessage()` |
| `src/unified-server.ts` | New `PUT /api/utterances/:id` endpoint |
| `src/test-utils/test-server.ts` | Mirror new endpoint for tests |
| Tests | Add tests for PUT endpoint |

### Open questions

1. **Race condition**: What if Claude dequeues the message while user is editing?
   - (a) Silently lose the edit (current message was already delivered)
   - (b) Poll status during edit, warn user if status changed
   - (c) Optimistic lock: server rejects PUT if status != pending
   Option (c) seems safest — server already does this for delete.

2. **Mobile UX for inline edit**: On small screens, inline textarea inside a chat bubble might be cramped. Alternatives:
   - (a) Inline edit in bubble (simpler)
   - (b) Move text to bottom input field for editing, with a "save edit" button replacing "send"
   - (c) Full-screen modal textarea
   Option (b) feels most natural on mobile — reuse existing input field.

3. **Edit history**: Should we keep track of edit history? Probably not for MVP — just update the text.

4. **Edit + delete together**: Both buttons visible for pending messages. Delete is already implemented. Edit is new. Do we need a combined "actions" menu to avoid cluttering the bubble? Or two small icons are fine?

---

## Implementation Order

1. **Feature 3 (Edit pending)** — smallest scope, backend + frontend, testable independently
2. **Feature 2 (Read aloud)** — frontend only, depends on `speakText()` already working
3. **Feature 1 (TTS queue)** — touches `speakText()` core logic, affects Feature 2 behavior

## Estimated complexity

- Feature 1: Medium (browser easy, system voice queuing harder)
- Feature 2: Small (frontend only, reuse `speakText()`)
- Feature 3: Medium (new API endpoint + inline edit UI)
