class MessengerClient {
    constructor() {
        this.baseUrl = window.location.origin;

        // Conversation elements
        this.conversationMessages = document.getElementById('conversationMessages');
        this.conversationContainer = document.getElementById('conversationContainer');

        // Text input elements
        this.messageInput = document.getElementById('messageInput');
        this.micBtn = document.getElementById('micBtn');

        // Send mode controls
        this.sendModeRadios = document.querySelectorAll('input[name="sendMode"]');
        this.triggerWordInputContainer = document.getElementById('triggerWordInputContainer');
        this.triggerWordInput = document.getElementById('triggerWordInput');

        // Settings
        this.settingsToggleHeader = document.getElementById('settingsToggleHeader');
        this.settingsContent = document.getElementById('settingsContent');
        this.voiceResponsesToggle = document.getElementById('voiceResponsesToggle');
        this.voiceOptions = document.getElementById('voiceOptions');
        this.languageSelect = document.getElementById('languageSelect');
        this.voiceSelect = document.getElementById('voiceSelect');
        this.localVoicesGroup = document.getElementById('localVoicesGroup');
        this.cloudVoicesGroup = document.getElementById('cloudVoicesGroup');
        this.speechRateSlider = document.getElementById('speechRate');
        this.speechRateInput = document.getElementById('speechRateInput');
        this.testTTSBtn = document.getElementById('testTTSBtn');
        this.rateWarning = document.getElementById('rateWarning');
        this.systemVoiceInfo = document.getElementById('systemVoiceInfo');
        this.sttLanguageSelect = document.getElementById('sttLanguageSelect');
        this.pauseMicCheckbox = document.getElementById('pauseMicDuringTTS');

        // State
        this.sendMode = 'automatic'; // 'automatic' or 'trigger'
        this.triggerWord = 'send';
        this.isListening = false;
        this.isInterimText = false;
        this.accumulatedText = ''; // For trigger word mode
        this.debug = localStorage.getItem('voiceHooksDebug') === 'true';
        this.sttLanguage = 'en-US'; // Speech recognition language

        // TTS state
        this.voices = [];
        this.selectedVoice = 'system';
        this.speechRate = 1.0;
        this.speechPitch = 1.0;
        this.pauseMicDuringTTS = true; // Pause mic during speech to avoid echo
        this.isPausedForTTS = false; // Flag to prevent auto-restart during TTS pause

        // PTT state
        this.pttKey = 'Ctrl+Space'; // Default PTT key (uses Ctrl+Space to avoid WCAG conflicts)
        this.isPTTActive = false; // Is PTT recording active
        this.isPTTStopping = false; // Flag to prevent race condition in stopPTT
        this.pttMinDuration = 300; // Minimum recording duration in ms (to avoid accidental triggers)
        this.pttStartTime = null; // When PTT started
        this.pttKeyParts = []; // Parts of PTT key combination for keyup detection
        this.pttToggleMode = false; // Toggle mode: tap to start/stop instead of hold
        this.pttStartDelay = 100; // Delay before starting recognition (ms)
        this.pttStopDelay = 500; // Delay before stopping recognition (ms)

        // Dedup state for speech recognition
        this.lastSentText = '';
        this.lastSentTime = 0;

        // PTT elements
        this.pttKeybindingContainer = document.getElementById('pttKeybindingContainer');
        this.pttKeybindingInput = document.getElementById('pttKeybindingInput');
        this.pttDelaysContainer = document.getElementById('pttDelaysContainer');
        this.pttStartDelayInput = document.getElementById('pttStartDelay');
        this.pttStopDelayInput = document.getElementById('pttStopDelay');
        this.pttToggleModeContainer = document.getElementById('pttToggleModeContainer');
        this.pttToggleModeCheckbox = document.getElementById('pttToggleMode');
        this.pttKeybindingLabel = document.getElementById('pttKeybindingLabel');
        this.pttKeybindingHint = document.getElementById('pttKeybindingHint');
        this.pttStatus = document.getElementById('pttStatus');
        this.pttStatusText = this.pttStatus?.querySelector('.ptt-status-text');

        // Wait settings elements
        this.waitForInputToggle = document.getElementById('waitForInputToggle');
        this.waitTimeoutInput = document.getElementById('waitTimeout');
        this.waitTimeoutContainer = document.getElementById('waitTimeoutContainer');
        this.waitForInput = true;
        this.waitTimeout = 60;

        // Audio unlock overlay elements
        this.audioUnlockOverlay = document.getElementById('audioUnlockOverlay');
        this.audioUnlockBtn = document.getElementById('audioUnlockBtn');
        this.audioUnlocked = false;

        // Initialize
        this.setupViewportHeight();
        this.setupAudioUnlock();
        this.initializeSpeechRecognition();
        this.initializeSpeechSynthesis();
        this.initializeTTSEvents();
        this.setupEventListeners();
        this.setupWaitSettings();
        this.loadPreferences();
        this.loadData();

        // Auto-refresh every 2 seconds
        setInterval(() => this.loadData(), 2000);

        // Initialize PTT
        this.setupPTTKeyCapture();
        this.setupPTTKeyboardEvents();
    }

    debugLog(...args) {
        if (this.debug) {
            console.log(...args);
        }
    }

    setupViewportHeight() {
        const update = () => {
            const h = window.visualViewport
                ? window.visualViewport.height
                : window.innerHeight;
            document.documentElement.style.setProperty('--app-height', `${h}px`);
            this.scrollToBottom();
        };

        update();

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', update);
            window.visualViewport.addEventListener('scroll', update);
        } else {
            window.addEventListener('resize', update);
        }

        window.addEventListener('orientationchange', () => {
            setTimeout(update, 100);
        });
    }

    setupAudioUnlock() {
        // Show overlay only if voice responses are enabled
        const voiceEnabled = localStorage.getItem('voiceResponsesEnabled') === 'true';
        if (!voiceEnabled || !this.audioUnlockOverlay || !this.audioUnlockBtn) {
            this.audioUnlocked = true;
            return;
        }

        this.audioUnlockOverlay.classList.remove('hidden');

        this.audioUnlockBtn.addEventListener('click', () => {
            // Unlock speechSynthesis with a silent utterance
            if (window.speechSynthesis) {
                const silentUtterance = new SpeechSynthesisUtterance('');
                silentUtterance.volume = 0;
                window.speechSynthesis.speak(silentUtterance);
            }

            // Unlock AudioContext
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const buffer = ctx.createBuffer(1, 1, 22050);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                source.start(0);
                ctx.resume();
            } catch (e) {
                this.debugLog('AudioContext unlock failed:', e);
            }

            this.audioUnlocked = true;
            this.audioUnlockOverlay.classList.add('hidden');
        });
    }

    initializeSpeechSynthesis() {
        // Check for browser support
        if (!window.speechSynthesis) {
            console.warn('Speech synthesis not supported in this browser');
            return;
        }

        // Get available voices
        this.voices = [];

        // Enhanced voice loading with deduplication
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();

            // Deduplicate voices - keep the first occurrence of each unique voice
            const deduplicatedVoices = [];
            const seen = new Set();

            voices.forEach(voice => {
                // Create a unique key based on name, language, and URI
                const key = `${voice.name}-${voice.lang}-${voice.voiceURI}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    deduplicatedVoices.push(voice);
                }
            });

            this.voices = deduplicatedVoices;
            this.populateVoiceList();
        };

        // Load voices initially and with a delayed retry for reliability
        loadVoices();
        setTimeout(loadVoices, 100);

        // Set up voice change listener
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }

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

    handleWaitStatus(isWaiting) {
        const waitingIndicator = document.getElementById('waitingIndicator');
        if (waitingIndicator) {
            waitingIndicator.style.display = isWaiting ? 'block' : 'none';
            if (isWaiting) {
                this.scrollToBottom();
            }
        }
    }

    handlePTTEvent(action) {
        // Handle PTT events from external sources (e.g., helper script)
        if (this.sendMode !== 'ptt') {
            this.debugLog('[PTT] Ignoring external PTT event - not in PTT mode');
            return;
        }

        if (this.pttToggleMode) {
            // Toggle mode: helper sends start+stop pairs for each key press/release.
            // First pair (start+stop) = begin recording, second pair = stop recording.
            // We act on the 'start' of each pair, ignore the 'stop'.
            if (action === 'start') {
                if (this.isPTTActive) {
                    this.stopPTT();
                } else {
                    this.startPTT();
                }
            }
            // 'stop' is just the key release — ignore in toggle mode
        } else {
            if (action === 'start') {
                this.startPTT();
            } else if (action === 'stop') {
                this.stopPTT();
            }
        }
    }

    async speakText(text) {
        // Pause recognition to avoid echo (mic picking up TTS)
        const wasListening = this.isListening && this.pauseMicDuringTTS;
        if (wasListening && this.recognition) {
            this.isPausedForTTS = true; // Prevent auto-restart in onend
            this.recognition.stop();
            this.debugLog('Paused recognition during TTS');
            // Wait for recognition to actually stop before starting TTS
            await new Promise(resolve => {
                const originalOnEnd = this.recognition.onend;
                let resolved = false;
                const done = () => {
                    if (resolved) return;
                    resolved = true;
                    this.recognition.onend = originalOnEnd;
                    resolve();
                };
                this.recognition.onend = done;
                // Fallback timeout in case onend doesn't fire
                setTimeout(done, 500);
            });
            this.debugLog('Recognition fully stopped, starting TTS');
        }

        // Check if we should use system voice
        if (this.selectedVoice === 'system') {
            // Use Mac system voice via server
            try {
                const response = await fetch(`${this.baseUrl}/api/speak-system`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: text,
                        rate: Math.round(this.speechRate * 150) // Convert rate to words per minute
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    console.error('Failed to speak via system voice:', error);
                }
            } catch (error) {
                console.error('Failed to call speak-system API:', error);
            }

            // Resume recognition after system voice finishes
            if (wasListening && this.recognition) {
                try {
                    this.isPausedForTTS = false;
                    this.recognition.start();
                    this.debugLog('Resumed recognition after system TTS');
                } catch (e) {
                    console.error('Failed to resume recognition:', e);
                }
            }
        } else {
            // Use browser voice
            if (!window.speechSynthesis) {
                console.error('Speech synthesis not available');
                return;
            }

            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            // Create utterance
            const utterance = new SpeechSynthesisUtterance(text);

            // Set voice if using browser voice
            if (this.selectedVoice && this.selectedVoice.startsWith('browser:')) {
                const voiceIndex = parseInt(this.selectedVoice.substring(8));
                if (this.voices[voiceIndex]) {
                    utterance.voice = this.voices[voiceIndex];
                }
            }

            // Set speech properties
            utterance.rate = this.speechRate;
            utterance.pitch = this.speechPitch;

            // Event handlers
            utterance.onstart = () => {
                this.debugLog('Started speaking:', text);
            };

            utterance.onend = () => {
                this.debugLog('Finished speaking');
                // Resume recognition after browser TTS finishes
                if (wasListening && this.recognition) {
                    try {
                        this.isPausedForTTS = false;
                        this.recognition.start();
                        this.debugLog('Resumed recognition after browser TTS');
                    } catch (e) {
                        console.error('Failed to resume recognition:', e);
                    }
                }
            };

            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event);
                // Resume recognition even on error
                if (wasListening && this.recognition) {
                    try {
                        this.isPausedForTTS = false;
                        this.recognition.start();
                    } catch (e) {
                        console.error('Failed to resume recognition:', e);
                    }
                }
            };

            // Speak the text
            window.speechSynthesis.speak(utterance);
        }
    }

    loadPreferences() {
        // Load STT language preference
        const savedSttLanguage = localStorage.getItem('sttLanguage');
        if (savedSttLanguage) {
            this.sttLanguage = savedSttLanguage;
            if (this.sttLanguageSelect) {
                this.sttLanguageSelect.value = savedSttLanguage;
            }
            if (this.recognition) {
                this.recognition.lang = this.sttLanguage;
            }
        }

        // Load voice responses preference from localStorage
        const savedVoiceResponses = localStorage.getItem('voiceResponsesEnabled');
        if (savedVoiceResponses !== null) {
            const enabled = savedVoiceResponses === 'true';
            this.voiceResponsesToggle.checked = enabled;
            this.voiceOptions.style.display = enabled ? 'block' : 'none';
            this.updateVoiceResponses(enabled);
        }

        // Load TTS language filter
        const savedTtsLanguageFilter = localStorage.getItem('ttsLanguageFilter');
        if (savedTtsLanguageFilter) {
            this.ttsLanguageFilter = savedTtsLanguageFilter;
        }

        // Load voice selection
        const savedVoice = localStorage.getItem('selectedVoice');
        if (savedVoice) {
            this.selectedVoice = savedVoice;
        }

        // Load speech rate
        const savedRate = localStorage.getItem('speechRate');
        if (savedRate) {
            this.speechRate = parseFloat(savedRate);
            if (this.speechRateSlider) this.speechRateSlider.value = this.speechRate.toString();
            if (this.speechRateInput) this.speechRateInput.value = this.speechRate.toFixed(1);
        }

        // Load pause mic during TTS preference
        const savedPauseMic = localStorage.getItem('pauseMicDuringTTS');
        if (savedPauseMic !== null) {
            this.pauseMicDuringTTS = savedPauseMic === 'true';
            if (this.pauseMicCheckbox) this.pauseMicCheckbox.checked = this.pauseMicDuringTTS;
        }

        // Load send mode preference
        const savedSendMode = localStorage.getItem('sendMode');
        if (savedSendMode) {
            this.sendMode = savedSendMode;
            // Update radio button
            this.sendModeRadios.forEach(radio => {
                if (radio.value === this.sendMode) {
                    radio.checked = true;
                }
            });
            // Show/hide trigger word input
            this.triggerWordInputContainer.style.display =
                this.sendMode === 'trigger' ? 'flex' : 'none';
            // Show/hide PTT keybinding input
            if (this.pttKeybindingContainer) {
                this.pttKeybindingContainer.style.display =
                    this.sendMode === 'ptt' ? 'flex' : 'none';
            }
            // Show/hide PTT toggle mode
            if (this.pttToggleModeContainer) {
                this.pttToggleModeContainer.style.display =
                    this.sendMode === 'ptt' ? 'flex' : 'none';
            }
            // Show/hide PTT delays input
            if (this.pttDelaysContainer) {
                this.pttDelaysContainer.style.display =
                    this.sendMode === 'ptt' ? 'flex' : 'none';
            }
        }

        // Load trigger word preference
        const savedTriggerWord = localStorage.getItem('triggerWord');
        if (savedTriggerWord) {
            this.triggerWord = savedTriggerWord;
            if (this.triggerWordInput) {
                this.triggerWordInput.value = savedTriggerWord;
            }
        }

        // Load PTT key preference
        const savedPttKey = localStorage.getItem('pttKey');
        if (savedPttKey) {
            this.pttKey = savedPttKey;
            this.pttKeyParts = savedPttKey.split('+');
            if (this.pttKeybindingInput) {
                this.pttKeybindingInput.value = savedPttKey;
            }
        } else {
            // Initialize pttKeyParts from default pttKey
            this.pttKeyParts = this.pttKey.split('+');
        }

        // Load PTT delay preferences
        const savedStartDelay = localStorage.getItem('pttStartDelay');
        if (savedStartDelay) {
            this.pttStartDelay = parseInt(savedStartDelay);
            if (this.pttStartDelayInput) {
                this.pttStartDelayInput.value = this.pttStartDelay;
            }
        }
        const savedStopDelay = localStorage.getItem('pttStopDelay');
        if (savedStopDelay) {
            this.pttStopDelay = parseInt(savedStopDelay);
            if (this.pttStopDelayInput) {
                this.pttStopDelayInput.value = this.pttStopDelay;
            }
        }

        // Load PTT toggle mode preference
        const savedToggleMode = localStorage.getItem('pttToggleMode');
        if (savedToggleMode !== null) {
            this.pttToggleMode = savedToggleMode === 'true';
            if (this.pttToggleModeCheckbox) {
                this.pttToggleModeCheckbox.checked = this.pttToggleMode;
            }
        }
        this.updatePTTLabels();

        // Show/hide PTT status based on loaded send mode
        if (this.pttStatus) {
            this.pttStatus.style.display =
                this.sendMode === 'ptt' ? 'flex' : 'none';
        }
    }

    populateLanguageFilter() {
        if (!this.languageSelect || !this.voices) return;

        // Use saved preference or current selection or default
        const savedFilter = this.ttsLanguageFilter || localStorage.getItem('ttsLanguageFilter');
        const currentSelection = savedFilter || this.languageSelect.value || 'all';
        this.languageSelect.innerHTML = '';

        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All Languages';
        this.languageSelect.appendChild(allOption);

        const languageCodes = new Set();
        this.voices.forEach(voice => {
            languageCodes.add(voice.lang);
        });

        Array.from(languageCodes).sort().forEach(lang => {
            const option = document.createElement('option');
            option.value = lang;
            option.textContent = lang;
            this.languageSelect.appendChild(option);
        });

        this.languageSelect.value = currentSelection;
        // Fallback to 'all' if saved value not available
        if (this.languageSelect.value !== currentSelection) {
            this.languageSelect.value = 'all';
        }
    }

    populateVoiceList() {
        if (!this.voiceSelect || !this.localVoicesGroup || !this.cloudVoicesGroup) return;

        this.populateLanguageFilter();

        this.localVoicesGroup.innerHTML = '';
        this.cloudVoicesGroup.innerHTML = '';

        const excludedVoices = [
            'Eddy', 'Flo', 'Grandma', 'Grandpa', 'Reed', 'Rocko', 'Sandy', 'Shelley',
            'Albert', 'Bad News', 'Bahh', 'Bells', 'Boing', 'Bubbles', 'Cellos',
            'Good News', 'Jester', 'Organ', 'Superstar', 'Trinoids', 'Whisper',
            'Wobble', 'Zarvox', 'Fred', 'Junior', 'Kathy', 'Ralph'
        ];

        const selectedLanguage = this.languageSelect ? this.languageSelect.value : 'en-US';

        this.voices.forEach((voice, index) => {
            const voiceLang = voice.lang;
            let shouldInclude = selectedLanguage === 'all' || voiceLang === selectedLanguage;

            if (shouldInclude) {
                const voiceName = voice.name;
                const isExcluded = excludedVoices.some(excluded =>
                    voiceName.toLowerCase().startsWith(excluded.toLowerCase())
                );

                if (!isExcluded) {
                    const option = document.createElement('option');
                    option.value = `browser:${index}`;
                    option.textContent = `${voice.name} (${voice.lang})`;

                    if (voice.localService) {
                        this.localVoicesGroup.appendChild(option);
                    } else {
                        this.cloudVoicesGroup.appendChild(option);
                    }
                }
            }
        });

        if (this.localVoicesGroup.children.length === 0) {
            this.localVoicesGroup.style.display = 'none';
        } else {
            this.localVoicesGroup.style.display = '';
        }

        if (this.cloudVoicesGroup.children.length === 0) {
            this.cloudVoicesGroup.style.display = 'none';
        } else {
            this.cloudVoicesGroup.style.display = '';
        }

        // Restore selection or find default
        if (this.selectedVoice) {
            this.voiceSelect.value = this.selectedVoice;
        }

        this.updateVoiceWarnings();
    }

    updateVoiceWarnings() {
        if (this.selectedVoice === 'system') {
            this.systemVoiceInfo.style.display = 'flex';
            this.rateWarning.style.display = 'none';
        } else if (this.selectedVoice && this.selectedVoice.startsWith('browser:')) {
            const voiceIndex = parseInt(this.selectedVoice.substring(8));
            const voice = this.voices[voiceIndex];

            if (voice) {
                const isGoogleVoice = voice.name.toLowerCase().includes('google');
                this.rateWarning.style.display = isGoogleVoice ? 'flex' : 'none';
                this.systemVoiceInfo.style.display = voice.localService ? 'flex' : 'none';
            } else {
                this.rateWarning.style.display = 'none';
                this.systemVoiceInfo.style.display = 'none';
            }
        } else {
            this.rateWarning.style.display = 'none';
            this.systemVoiceInfo.style.display = 'none';
        }
    }

    setupEventListeners() {
        // Text input events
        this.messageInput.addEventListener('keydown', (e) => this.handleTextInputKeydown(e));
        this.messageInput.addEventListener('input', () => {
            this.autoGrowTextarea();
            // Sync accumulatedText when user manually edits the input
            // (not during interim speech recognition updates)
            if (!this.isInterimText) {
                this.accumulatedText = this.messageInput.value;
            }
        });

        // Microphone button - in PTT toggle mode: click toggles, in PTT hold mode: suppress click
        this.micBtn.addEventListener('click', (e) => {
            if (this.sendMode === 'ptt') {
                if (this.pttToggleMode) {
                    e.preventDefault();
                    if (this.isPTTActive) {
                        this.stopPTT();
                    } else {
                        this.startPTT();
                    }
                } else {
                    e.preventDefault();
                }
                return;
            }
            this.toggleVoiceDictation();
        });

        // Send mode radio buttons
        this.sendModeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.sendMode = e.target.value;
                this.triggerWordInputContainer.style.display =
                    this.sendMode === 'trigger' ? 'flex' : 'none';
                this.pttKeybindingContainer.style.display =
                    this.sendMode === 'ptt' ? 'flex' : 'none';
                if (this.pttToggleModeContainer) {
                    this.pttToggleModeContainer.style.display =
                        this.sendMode === 'ptt' ? 'flex' : 'none';
                }
                if (this.pttDelaysContainer) {
                    this.pttDelaysContainer.style.display =
                        this.sendMode === 'ptt' ? 'flex' : 'none';
                }

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

        // Trigger word input
        this.triggerWordInput.addEventListener('input', (e) => {
            this.triggerWord = e.target.value.trim().toLowerCase();
            localStorage.setItem('triggerWord', this.triggerWord);
        });

        // Settings toggle
        this.settingsToggleHeader.addEventListener('click', () => {
            const arrow = this.settingsToggleHeader.querySelector('.toggle-arrow');
            if (this.settingsContent.classList.contains('open')) {
                this.settingsContent.classList.remove('open');
                arrow.classList.remove('open');
            } else {
                this.settingsContent.classList.add('open');
                arrow.classList.add('open');
            }
        });

        // Voice responses toggle
        this.voiceResponsesToggle.addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            await this.updateVoiceResponses(enabled);
            // Show/hide voice options based on toggle
            this.voiceOptions.style.display = enabled ? 'block' : 'none';
        });

        // Voice selection
        this.voiceSelect.addEventListener('change', (e) => {
            this.selectedVoice = e.target.value;
            localStorage.setItem('selectedVoice', this.selectedVoice);
            this.updateVoiceWarnings();
        });

        // Language filter for TTS voices
        if (this.languageSelect) {
            this.languageSelect.addEventListener('change', () => {
                localStorage.setItem('ttsLanguageFilter', this.languageSelect.value);
                this.populateVoiceList();
            });
        }

        // STT language selection
        if (this.sttLanguageSelect) {
            this.sttLanguageSelect.addEventListener('change', (e) => {
                this.sttLanguage = e.target.value;
                localStorage.setItem('sttLanguage', this.sttLanguage);

                // Update recognition language
                if (this.recognition) {
                    this.recognition.lang = this.sttLanguage;

                    // If currently listening, restart with new language
                    if (this.isListening) {
                        this.recognition.stop();
                        // Will auto-restart via onend handler
                    }
                }
            });
        }

        // Speech rate slider
        if (this.speechRateSlider) {
            this.speechRateSlider.addEventListener('input', (e) => {
                this.speechRate = parseFloat(e.target.value);
                this.speechRateInput.value = this.speechRate.toFixed(1);
                localStorage.setItem('speechRate', this.speechRate.toString());
            });
        }

        // Speech rate text input
        if (this.speechRateInput) {
            this.speechRateInput.addEventListener('input', (e) => {
                let value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                    value = Math.max(0.5, Math.min(5, value));
                    this.speechRate = value;
                    this.speechRateSlider.value = value.toString();
                    this.speechRateInput.value = value.toFixed(1);
                    localStorage.setItem('speechRate', this.speechRate.toString());
                }
            });
        }

        // Test TTS button
        if (this.testTTSBtn) {
            this.testTTSBtn.addEventListener('click', () => {
                this.speakText('This is Voice Mode for Claude Code. How can I help you today?');
            });
        }

        // Pause mic during TTS checkbox
        if (this.pauseMicCheckbox) {
            this.pauseMicCheckbox.addEventListener('change', (e) => {
                this.pauseMicDuringTTS = e.target.checked;
                localStorage.setItem('pauseMicDuringTTS', this.pauseMicDuringTTS.toString());
            });
        }

        // Microphone button - support PTT hold (only in hold mode, not toggle mode)
        this.micBtn.addEventListener('mousedown', (e) => {
            if (this.sendMode === 'ptt' && !this.pttToggleMode) {
                e.preventDefault();
                this.startPTT();
            }
        });

        this.micBtn.addEventListener('mouseup', () => {
            if (this.sendMode === 'ptt' && !this.pttToggleMode && this.isPTTActive) {
                this.stopPTT();
            }
        });

        this.micBtn.addEventListener('mouseleave', () => {
            // Stop if mouse leaves button while holding (hold mode only)
            if (this.sendMode === 'ptt' && !this.pttToggleMode && this.isPTTActive) {
                this.stopPTT();
            }
        });

        // Touch support for mobile PTT (hold mode only)
        this.micBtn.addEventListener('touchstart', (e) => {
            if (this.sendMode === 'ptt' && !this.pttToggleMode) {
                e.preventDefault();
                this.startPTT();
            }
        });

        this.micBtn.addEventListener('touchend', () => {
            if (this.sendMode === 'ptt' && !this.pttToggleMode && this.isPTTActive) {
                this.stopPTT();
            }
        });
    }

    setupPTTKeyCapture() {
        if (!this.pttKeybindingInput) return;

        this.pttKeybindingInput.addEventListener('keydown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Capture the key using shared key name logic
            const fullKey = this.getKeyName(e);

            this.pttKey = fullKey;
            this.pttKeyParts = fullKey.split('+');
            this.pttKeybindingInput.value = fullKey;
            localStorage.setItem('pttKey', fullKey);

            // Blur the input after capture
            this.pttKeybindingInput.blur();
        });

        // PTT toggle mode checkbox
        if (this.pttToggleModeCheckbox) {
            this.pttToggleModeCheckbox.addEventListener('change', (e) => {
                this.pttToggleMode = e.target.checked;
                localStorage.setItem('pttToggleMode', this.pttToggleMode.toString());
                this.updatePTTLabels();
                // Stop any active PTT session when switching modes
                if (this.isPTTActive) {
                    this.stopPTT();
                }
            });
        }

        // PTT delay settings
        if (this.pttStartDelayInput) {
            this.pttStartDelayInput.addEventListener('change', (e) => {
                this.pttStartDelay = parseInt(e.target.value) || 0;
                localStorage.setItem('pttStartDelay', this.pttStartDelay.toString());
            });
        }

        if (this.pttStopDelayInput) {
            this.pttStopDelayInput.addEventListener('change', (e) => {
                this.pttStopDelay = parseInt(e.target.value) || 0;
                localStorage.setItem('pttStopDelay', this.pttStopDelay.toString());
            });
        }
    }

    setupWaitSettings() {
        // Load saved preferences
        const savedWaitForInput = localStorage.getItem('waitForInput');
        if (savedWaitForInput !== null) {
            this.waitForInput = savedWaitForInput === 'true';
        }
        const savedWaitTimeout = localStorage.getItem('waitTimeout');
        if (savedWaitTimeout) {
            this.waitTimeout = parseInt(savedWaitTimeout) || 60;
        }

        // Update UI
        if (this.waitForInputToggle) {
            this.waitForInputToggle.checked = this.waitForInput;
        }
        if (this.waitTimeoutInput) {
            this.waitTimeoutInput.value = this.waitTimeout;
        }
        if (this.waitTimeoutContainer) {
            this.waitTimeoutContainer.style.display = this.waitForInput ? 'flex' : 'none';
        }

        // Send to server
        this.updateWaitSettings();

        // Event listeners
        if (this.waitForInputToggle) {
            this.waitForInputToggle.addEventListener('change', (e) => {
                this.waitForInput = e.target.checked;
                localStorage.setItem('waitForInput', this.waitForInput.toString());
                if (this.waitTimeoutContainer) {
                    this.waitTimeoutContainer.style.display = this.waitForInput ? 'flex' : 'none';
                }
                this.updateWaitSettings();
            });
        }

        if (this.waitTimeoutInput) {
            this.waitTimeoutInput.addEventListener('change', (e) => {
                this.waitTimeout = parseInt(e.target.value) || 60;
                // Clamp to 30-600
                this.waitTimeout = Math.max(30, Math.min(600, this.waitTimeout));
                this.waitTimeoutInput.value = this.waitTimeout;
                localStorage.setItem('waitTimeout', this.waitTimeout.toString());
                this.updateWaitSettings();
            });
        }
    }

    async updateWaitSettings() {
        try {
            await fetch(`${this.baseUrl}/api/wait-settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    waitForInput: this.waitForInput,
                    waitTimeout: this.waitTimeout
                })
            });
        } catch (error) {
            console.error('Failed to update wait settings:', error);
        }
    }

    setupPTTKeyboardEvents() {
        // Interactive elements that should not trigger PTT
        const INTERACTIVE_TAGS = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'];

        // Handle keydown for PTT
        document.addEventListener('keydown', (e) => {
            if (this.sendMode !== 'ptt') return;

            // Don't capture when focused on interactive elements
            const activeTag = document.activeElement?.tagName;
            if (activeTag && INTERACTIVE_TAGS.includes(activeTag)) return;

            const keyName = this.getKeyName(e);
            if (keyName !== this.pttKey) return;

            e.preventDefault();

            if (this.pttToggleMode) {
                // Toggle mode: ignore key repeat, toggle on each press
                if (e.repeat) return;
                if (this.isPTTActive) {
                    this.stopPTT();
                } else {
                    this.startPTT();
                }
            } else {
                // Hold mode: start on keydown (if not already active)
                if (!this.isPTTActive) {
                    this.startPTT();
                }
            }
        });

        // Handle keyup for PTT stop (hold mode only)
        document.addEventListener('keyup', (e) => {
            if (this.sendMode !== 'ptt') return;
            if (!this.isPTTActive) return;
            // In toggle mode, keyup does nothing
            if (this.pttToggleMode) return;

            // Get the base key name (without checking current modifier state)
            const releasedKey = this.getBaseKeyName(e);

            // Stop PTT if the released key is part of the PTT key combination
            if (this.pttKeyParts.includes(releasedKey)) {
                e.preventDefault();
                this.stopPTT();
            }
        });

        // Handle focus loss - stop PTT (both modes)
        window.addEventListener('blur', () => {
            if (this.isPTTActive) {
                this.stopPTT();
            }
        });
    }

    // Get base key name without modifier state (for keyup detection)
    getBaseKeyName(e) {
        let keyName = e.key;
        if (e.key === ' ') keyName = 'Space';
        if (e.key === 'Control') keyName = 'Ctrl';
        if (e.key === 'Meta') keyName = 'Meta';
        return keyName;
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

    updatePTTLabels() {
        if (this.pttToggleMode) {
            if (this.pttKeybindingLabel) this.pttKeybindingLabel.textContent = 'Tap key:';
            if (this.pttKeybindingHint) this.pttKeybindingHint.textContent = '(or tap mic button)';
            if (this.pttStatusText && !this.isPTTActive) {
                this.pttStatusText.textContent = 'Tap to start...';
            }
        } else {
            if (this.pttKeybindingLabel) this.pttKeybindingLabel.textContent = 'Hold key:';
            if (this.pttKeybindingHint) this.pttKeybindingHint.textContent = '(or hold mic button)';
            if (this.pttStatusText && !this.isPTTActive) {
                this.pttStatusText.textContent = 'Hold to talk...';
            }
        }
    }

    async startPTT() {
        if (this.isPTTActive) return;

        this.isPTTActive = true;
        this.pttStartTime = Date.now();
        this.micBtn.classList.add('ptt-recording');

        // Ensure pttKeyParts is populated (in case loaded from localStorage)
        if (this.pttKeyParts.length === 0) {
            this.pttKeyParts = this.pttKey.split('+');
        }

        // Show PTT status
        if (this.pttStatus) {
            this.pttStatus.style.display = 'flex';
            this.pttStatus.classList.add('recording');
            if (this.pttStatusText) {
                this.pttStatusText.textContent = 'Starting...';
            }
        }

        // Clear any existing text
        this.messageInput.value = '';
        this.accumulatedText = '';

        const idleText = this.pttToggleMode ? 'Tap to start...' : 'Hold to talk...';

        // Start recognition with delay
        if (!this.recognition) {
            console.error('Speech recognition not available');
            this.isPTTActive = false;
            this.micBtn.classList.remove('ptt-recording');
            if (this.pttStatus) {
                this.pttStatus.classList.remove('recording');
                if (this.pttStatusText) {
                    this.pttStatusText.textContent = idleText;
                }
            }
            return;
        }

        // Delay before starting recognition to avoid picking up button press sounds
        setTimeout(async () => {
            if (!this.isPTTActive) return; // User released before delay finished

            try {
                this.isListening = true;
                this.recognition.start();
                await this.updateVoiceInputState(true);
                if (this.pttStatusText) {
                    const recordingText = this.pttToggleMode
                        ? 'Recording... (tap to stop)'
                        : 'Recording...';
                    this.pttStatusText.textContent = recordingText;
                }
                this.debugLog('[PTT] Started recording');
            } catch (e) {
                console.error('Failed to start PTT recognition:', e);
                this.isPTTActive = false;
                this.isListening = false;
                this.micBtn.classList.remove('ptt-recording');
                if (this.pttStatus) {
                    this.pttStatus.classList.remove('recording');
                    if (this.pttStatusText) {
                        this.pttStatusText.textContent = idleText;
                    }
                }
            }
        }, this.pttStartDelay);
    }

    async stopPTT() {
        if (!this.isPTTActive || this.isPTTStopping) return;

        // Set stopping flag to prevent race condition
        this.isPTTStopping = true;

        const duration = Date.now() - this.pttStartTime;
        const idleText = this.pttToggleMode ? 'Tap to start...' : 'Hold to talk...';

        // Update status to show processing
        if (this.pttStatus && this.pttStatusText) {
            this.pttStatusText.textContent = 'Processing...';
        }

        // Check minimum duration (including start delay)
        const effectiveDuration = duration - this.pttStartDelay;
        if (effectiveDuration < this.pttMinDuration) {
            this.debugLog(`[PTT] Recording too short (${effectiveDuration}ms), discarding`);
            this.micBtn.classList.remove('ptt-recording');
            if (this.pttStatus) {
                this.pttStatus.classList.remove('recording');
                if (this.pttStatusText) {
                    this.pttStatusText.textContent = idleText;
                }
            }
            if (this.recognition) {
                this.isListening = false;
                this.recognition.stop();
            }
            this.messageInput.value = '';
            await this.updateVoiceInputState(false);
            this.isPTTActive = false;
            this.isPTTStopping = false;
            return;
        }

        // Delay before stopping to capture final words
        setTimeout(async () => {
            this.micBtn.classList.remove('ptt-recording');

            // Hide PTT status recording state
            if (this.pttStatus) {
                this.pttStatus.classList.remove('recording');
                if (this.pttStatusText) {
                    this.pttStatusText.textContent = idleText;
                }
            }

            // Stop recognition
            if (this.recognition) {
                this.isListening = false;
                this.recognition.stop();
            }

            // Small delay to let final recognition results come in
            setTimeout(async () => {
                // Send the accumulated text
                const text = this.messageInput.value.trim();
                if (text) {
                    this.debugLog(`[PTT] Sending: "${text}"`);
                    await this.sendMessage(text);
                    this.messageInput.value = '';
                }

                await this.updateVoiceInputState(false);
                this.debugLog('[PTT] Stopped recording');

                // Reset flags after all async operations complete
                this.isPTTActive = false;
                this.isPTTStopping = false;
            }, 100); // Small delay for final recognition results
        }, this.pttStopDelay);
    }

    async loadData() {
        try {
            // Load full conversation
            const conversationResponse = await fetch(`${this.baseUrl}/api/conversation?limit=50`);
            if (conversationResponse.ok) {
                const data = await conversationResponse.json();
                this.updateConversation(data.messages);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }

    updateConversation(messages) {
        const container = this.conversationMessages;
        const emptyState = container.querySelector('.empty-state');

        if (messages.length === 0) {
            emptyState.style.display = 'flex';
            container.querySelectorAll('.message-bubble').forEach(el => el.remove());
            return;
        }

        emptyState.style.display = 'none';

        // Get existing message IDs to avoid duplicates
        const existingBubbles = container.querySelectorAll('.message-bubble');
        const existingIds = new Set();
        existingBubbles.forEach(bubble => {
            if (bubble.dataset.messageId) {
                existingIds.add(bubble.dataset.messageId);
            }
        });

        // Get waiting indicator to insert messages before it
        const waitingIndicator = container.querySelector('.waiting-indicator');

        // Only render new messages and update status for existing ones
        messages.forEach(message => {
            if (!existingIds.has(message.id)) {
                // New message - create bubble and insert before waiting indicator
                const bubble = this.createMessageBubble(message);
                if (waitingIndicator) {
                    container.insertBefore(bubble, waitingIndicator);
                } else {
                    container.appendChild(bubble);
                }
            } else {
                // Existing message - update status if it's a user message
                if (message.role === 'user' && message.status) {
                    const bubble = container.querySelector(`[data-message-id="${message.id}"]`);
                    if (bubble) {
                        const statusEl = bubble.querySelector('.message-status');
                        if (statusEl) {
                            // Check if status changed from pending to something else
                            const wasPending = statusEl.classList.contains('pending');
                            const isPending = message.status === 'pending';

                            if (wasPending && !isPending) {
                                // Status changed from pending - remove delete button
                                const deleteBtn = statusEl.querySelector('.delete-message-btn');
                                if (deleteBtn) {
                                    deleteBtn.remove();
                                }
                            }

                            // Update status class and text
                            statusEl.className = `message-status ${message.status}`;
                            const statusText = statusEl.querySelector('span:last-child');
                            if (statusText) {
                                statusText.textContent = message.status.toUpperCase();
                            }
                        }
                    }
                }
            }
        });

        this.scrollToBottom();
    }

    createMessageBubble(message) {
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${message.role}`;
        bubble.dataset.messageId = message.id;

        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.textContent = message.text;

        const messageMeta = document.createElement('div');
        messageMeta.className = 'message-meta';

        const timestamp = document.createElement('span');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = this.formatTimestamp(message.timestamp);
        messageMeta.appendChild(timestamp);

        // Only show status for user messages
        if (message.role === 'user' && message.status) {
            const statusContainer = document.createElement('div');
            statusContainer.className = `message-status ${message.status}`;

            // Add delete button for pending messages (shows on hover)
            if (message.status === 'pending') {
                const deleteBtn = document.createElement('span');
                deleteBtn.className = 'delete-message-btn';
                deleteBtn.innerHTML = `
                    <svg class="delete-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                `;
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.deleteMessage(message.id);
                };
                statusContainer.appendChild(deleteBtn);
            }

            const statusText = document.createElement('span');
            statusText.textContent = message.status.toUpperCase();
            statusContainer.appendChild(statusText);

            messageMeta.appendChild(statusContainer);
        }

        bubble.appendChild(messageText);
        bubble.appendChild(messageMeta);

        return bubble;
    }

    scrollToBottom() {
        this.conversationContainer.scrollTo({
            top: this.conversationContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    }

    // Text input handling
    handleTextInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendTypedMessage();
        }
        // Shift+Enter allows new line
    }

    autoGrowTextarea() {
        const textarea = this.messageInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    async sendTypedMessage() {
        const text = this.messageInput.value.trim();
        if (!text || this.isInterimText) return;

        // sendMessage will clear the input on success
        await this.sendMessage(text);
    }

    async sendMessage(text) {
        // Deduplicate: skip if same text sent within 3 seconds
        const now = Date.now();
        if (text === this.lastSentText && now - this.lastSentTime < 3000) {
            this.debugLog('[Dedup] Skipping exact duplicate:', text);
            return false;
        }
        // Also block any send within 500ms of the last one (mobile speech API double-fire)
        if (now - this.lastSentTime < 500) {
            this.debugLog('[Dedup] Skipping rapid-fire message:', text);
            return false;
        }

        // Set dedup state BEFORE async fetch to prevent race condition
        // (multiple sendMessage calls from same onresult event)
        this.lastSentText = text;
        this.lastSentTime = now;

        try {
            const response = await fetch(`${this.baseUrl}/api/potential-utterances`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, timestamp: new Date().toISOString() })
            });

            if (response.ok) {
                // Clear input after successful send
                this.messageInput.value = '';
                this.accumulatedText = '';
                this.messageInput.style.height = 'auto';
                this.loadData();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to send message:', error);
            return false;
        }
    }

    // Voice dictation
    toggleVoiceDictation() {
        if (this.isListening) {
            this.stopVoiceDictation();
        } else {
            this.startVoiceDictation();
        }
    }

    async startVoiceDictation() {
        if (!this.recognition) {
            alert('Speech recognition not supported in this browser');
            return;
        }

        try {
            if (this.isInterimText) {
                this.messageInput.value = '';
                this.isInterimText = false;
            }

            this.recognition.start();
            this.isListening = true;
            this.micBtn.classList.add('listening');

            // Activate voice input when mic is on
            await this.updateVoiceInputState(true);
        } catch (e) {
            console.error('Failed to start recognition:', e);
            alert('Failed to start speech recognition');
        }
    }

    async stopVoiceDictation() {
        if (this.recognition) {
            this.isListening = false;
            this.recognition.stop();
            this.micBtn.classList.remove('listening');

            // Send any accumulated text in the input
            const text = this.messageInput.value.trim();
            if (text) {
                // In trigger mode, check for trigger word
                if (this.sendMode === 'trigger') {
                    if (this.containsTriggerWord(text)) {
                        const textToSend = this.removeTriggerWord(text);
                        await this.sendMessage(textToSend);
                        this.messageInput.value = '';
                    }
                    // If no trigger word, keep text in input for user to continue
                } else {
                    // In automatic mode, send the text
                    await this.sendMessage(text);
                    this.messageInput.value = '';
                }
            }

            this.isInterimText = false;
            this.messageInput.style.height = 'auto';

            // Deactivate voice input when mic is turned off
            await this.updateVoiceInputState(false);
        }
    }

    initializeSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.error('Speech recognition not supported');
            this.micBtn.disabled = true;
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.sttLanguage;

        this.lastProcessedResultIndex = -1;

        this.recognition.onresult = (event) => {
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;

                if (event.results[i].isFinal) {
                    // Skip if we already processed this result index
                    if (i <= this.lastProcessedResultIndex) {
                        this.debugLog('[Speech] Skipping already-processed result index:', i);
                        continue;
                    }
                    this.lastProcessedResultIndex = i;

                    // User paused
                    this.isInterimText = false;

                    if (this.sendMode === 'automatic') {
                        // Send the final transcript directly (not messageInput.value)
                        const finalText = transcript.trim();
                        if (finalText) {
                            this.sendMessage(finalText);
                        }
                        this.messageInput.value = '';
                        this.accumulatedText = '';
                    } else {
                        // Trigger word mode: accumulate until trigger word
                        // Use the previously saved accumulated text (before interim was shown)
                        const previouslyAccumulated = this.accumulatedText || '';
                        const newUtterance = transcript.trim();

                        // Check if this new utterance contains the trigger word
                        if (this.containsTriggerWord(newUtterance)) {
                            // Send everything accumulated plus this utterance (minus trigger word)
                            const combined = previouslyAccumulated
                                ? previouslyAccumulated + ' ' + newUtterance
                                : newUtterance;
                            const textToSend = this.removeTriggerWord(combined).trim();
                            if (textToSend) {
                                this.sendMessage(textToSend);
                            }
                            this.messageInput.value = '';
                            this.accumulatedText = '';
                        } else {
                            // No trigger word - append with space (no newlines)
                            const newAccumulated = previouslyAccumulated
                                ? previouslyAccumulated + ' ' + newUtterance
                                : newUtterance;
                            this.messageInput.value = newAccumulated;
                            this.accumulatedText = newAccumulated;
                            this.autoGrowTextarea();
                        }
                    }
                } else {
                    // Still speaking
                    interimTranscript += transcript;
                }
            }

            if (interimTranscript) {
                // In trigger mode, preserve accumulated text and append interim
                if (this.sendMode === 'trigger' && this.accumulatedText) {
                    // Show accumulated + interim with single space
                    this.messageInput.value = this.accumulatedText + ' ' + interimTranscript.trim();
                } else {
                    // Show just interim
                    this.messageInput.value = interimTranscript;
                }

                this.isInterimText = true;
                this.autoGrowTextarea();
            }
        };

        this.recognition.onerror = (event) => {
            if (event.error !== 'no-speech') {
                console.error('Speech error:', event.error);
                this.stopVoiceDictation();
            }
        };

        this.recognition.onend = () => {
            // Reset result index tracker on recognition restart
            this.lastProcessedResultIndex = -1;
            // Don't auto-restart if paused for TTS
            if (this.isListening && !this.isPausedForTTS) {
                try {
                    this.recognition.start();
                } catch (e) {
                    console.error('Failed to restart recognition:', e);
                    this.stopVoiceDictation();
                }
            }
        };
    }

    containsTriggerWord(text) {
        if (!this.triggerWord) return false;
        const words = text.toLowerCase().split(/\s+/);
        return words.includes(this.triggerWord.toLowerCase());
    }

    removeTriggerWord(text) {
        if (!this.triggerWord) return text;
        const words = text.split(/\s+/);
        const filtered = words.filter(w => w.toLowerCase() !== this.triggerWord.toLowerCase());
        return filtered.join(' ');
    }

    async deleteMessage(messageId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/utterances/${messageId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Remove the message bubble from DOM immediately
                const bubble = this.conversationMessages.querySelector(`[data-message-id="${messageId}"]`);
                if (bubble) {
                    bubble.remove();
                }
                // Refresh to sync with server
                this.loadData();
            } else {
                const error = await response.json();
                console.error('Failed to delete message:', error);
                alert(`Failed to delete: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to delete message:', error);
        }
    }

    async updateVoiceInputState(active) {
        try {
            await fetch(`${this.baseUrl}/api/voice-input-state`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active })
            });
        } catch (error) {
            console.error('Failed to update voice input state:', error);
        }
    }

    async updateVoiceResponses(enabled) {
        try {
            // Save to localStorage
            localStorage.setItem('voiceResponsesEnabled', enabled.toString());

            // Update server
            await fetch(`${this.baseUrl}/api/voice-preferences`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voiceResponsesEnabled: enabled })
            });
        } catch (error) {
            console.error('Failed to update voice responses:', error);
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new MessengerClient();
});
