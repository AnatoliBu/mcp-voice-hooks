// Entry point для renderer process
console.log('Renderer process started');
console.log('Platform:', window.electronAPI.platform);

// Базовая инициализация
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, overlay ready');
});
