// Microphone permissions handling

export class MicrophonePermissions {
  async request(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Останавливаем stream сразу после получения разрешения
      stream.getTracks().forEach((track) => track.stop());

      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  async check(): Promise<PermissionState> {
    try {
      const result = await navigator.permissions.query({
        name: 'microphone' as PermissionName
      });
      return result.state;
    } catch (error) {
      // Fallback для браузеров без Permissions API
      return 'prompt';
    }
  }

  showPermissionDialog(): void {
    // Показать диалог с инструкциями по предоставлению разрешений
    const dialog = document.createElement('div');
    dialog.className = 'permission-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <h3>Microphone Access Required</h3>
        <p>Voice Hooks needs access to your microphone to recognize speech.</p>
        <p>Click "Allow" when prompted by your browser.</p>
        <button id="requestPermissionBtn">Request Permission</button>
      </div>
    `;

    document.body.appendChild(dialog);

    document.getElementById('requestPermissionBtn')?.addEventListener('click', async () => {
      const granted = await this.request();

      if (granted) {
        dialog.remove();
      } else {
        alert('Microphone permission is required for voice recognition to work.');
      }
    });
  }
}
