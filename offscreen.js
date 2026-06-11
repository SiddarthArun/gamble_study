const audio = new Audio(chrome.runtime.getURL('rain.mp3'));
audio.loop = true;

console.log('Offscreen audio initialized');

// Listen for commands from background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Offscreen received message:', message);
  if (message.type === 'INIT' || message.type === 'UPDATE_PLAYING') {
    if (message.playing) {
      audio.play().catch(err => console.error('Audio play error:', err));
    } else {
      audio.pause();
    }
  }
  if (message.type === 'INIT' || message.type === 'UPDATE_VOLUME') {
    audio.volume = message.volume;
  }
});

// Notify background that we are ready to receive state
chrome.runtime.sendMessage({ type: 'READY' });