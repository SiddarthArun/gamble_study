// Initialize storage state on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["timerState", "tasks", "difficultyMode", "endTime", "studyMinutes", "breakMinutes", "rainPlaying", "rainVolume"], (data) => {
    const updates = {};
    if (data.timerState === undefined) updates.timerState = "IDLE";
    if (data.tasks === undefined) updates.tasks = [];
    if (data.difficultyMode === undefined) updates.difficultyMode = "safe";
    if (data.endTime === undefined) updates.endTime = 0;
    if (data.studyMinutes === undefined) updates.studyMinutes = 0;
    if (data.breakMinutes === undefined) updates.breakMinutes = 0;
    if (data.rainPlaying === undefined) updates.rainPlaying = false;
    if (data.rainVolume === undefined) updates.rainVolume = 0.5;
    
    if (Object.keys(updates).length > 0) {
      chrome.storage.local.set(updates);
    }
  });
});

// Manage offscreen document
async function manageOffscreenDocument(playing, alarmEnabled) {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });

  const shouldBeOpen = playing || alarmEnabled;

  if (existingContexts.length > 0) {
    if (!shouldBeOpen) {
      await chrome.offscreen.closeDocument();
    }
  } else if (shouldBeOpen) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'play audio alerts or rain ambient sound'
    });
  }
}

// Manage offscreen lifecycle and updates on storage change
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.rainPlaying || changes.enableAudioAlert) {
        chrome.storage.local.get(['rainPlaying', 'enableAudioAlert'], (data) => {
            manageOffscreenDocument(!!data.rainPlaying, !!data.enableAudioAlert);
        });
    }
    
    if (changes.rainPlaying) {
      chrome.runtime.sendMessage({
        type: 'UPDATE_PLAYING',
        playing: changes.rainPlaying.newValue
      }).catch(() => {});
    }
    if (changes.rainVolume) {
      chrome.runtime.sendMessage({
        type: 'UPDATE_VOLUME',
        volume: changes.rainVolume.newValue
      }).catch(() => {});
    }
  }
});


  if (existingContexts.length > 0) {
    if (!playing) {
      await chrome.offscreen.closeDocument();
    }
  } else if (playing) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'play rain ambient sound'
    });
  }
}

// Handle messages from offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'READY') {
    chrome.storage.local.get(['rainPlaying', 'rainVolume'], (data) => {
      chrome.runtime.sendMessage({
        type: 'INIT',
        playing: !!data.rainPlaying,
        volume: data.rainVolume !== undefined ? data.rainVolume : 0.5
      });
    });
  }
});

// Manage offscreen lifecycle and updates on storage change
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.rainPlaying) {
      manageOffscreenDocument(changes.rainPlaying.newValue);
      chrome.runtime.sendMessage({
        type: 'UPDATE_PLAYING',
        playing: changes.rainPlaying.newValue
      }).catch(() => {});
    }
    if (changes.rainVolume) {
      chrome.runtime.sendMessage({
        type: 'UPDATE_VOLUME',
        volume: changes.rainVolume.newValue
      }).catch(() => {});
    }
  }
});

// Helper function to display casino notifications
function showNotification(title, message) {
  const id = "studyRouletteNotification-" + Date.now();
  chrome.notifications.create(id, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("casino.png"),
    title: title,
    message: message,
    priority: 2
  });
}

// Handle Alarm Expiration
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "studyRouletteAlarm") {
    chrome.storage.local.get(["timerState", "studyMinutes", "breakMinutes", "enableAudioAlert", "enablePopupAlert"], (data) => {
      const currentState = data.timerState || "IDLE";
      const breakMins = data.breakMinutes || 1;

      // Trigger audio alarm
      if (data.enableAudioAlert) {
        chrome.runtime.sendMessage({ type: 'PLAY_ALARM' }).catch(() => {});
      }

      // Trigger visual popup
      if (data.enablePopupAlert) {
        chrome.tabs.query({ url: "*://*/*" }, (tabs) => {
          // Find the active tab in the current window first
          let targetTab = tabs.find(t => t.active && t.windowId === chrome.windows.WINDOW_ID_CURRENT);
          
          // Fallback to any tab if no active one found
          if (!targetTab && tabs.length > 0) {
            targetTab = tabs[0];
          }

          if (targetTab && targetTab.id) {
            chrome.scripting.executeScript({
              target: { tabId: targetTab.id },
              func: () => {
                if (document.getElementById('study-roulette-modal')) return;
                
                const modal = document.createElement('div');
                modal.id = 'study-roulette-modal';
                modal.style.position = 'fixed';
                modal.style.top = '0';
                modal.style.left = '0';
                modal.style.width = '100%';
                modal.style.height = '100%';
                modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                modal.style.zIndex = '999999';
                modal.style.display = 'flex';
                modal.style.alignItems = 'center';
                modal.style.justifyContent = 'center';
                modal.style.flexDirection = 'column';
                modal.style.color = 'white';
                modal.style.fontFamily = 'sans-serif';
                
                const title = document.createElement('h1');
                title.textContent = 'SESSION ENDED';
                title.style.marginBottom = '20px';
                
                const dismissBtn = document.createElement('button');
                dismissBtn.textContent = 'DISMISS';
                dismissBtn.style.padding = '15px 30px';
                dismissBtn.style.fontSize = '20px';
                dismissBtn.style.cursor = 'pointer';
                dismissBtn.style.backgroundColor = '#238636';
                dismissBtn.style.color = 'white';
                dismissBtn.style.border = 'none';
                dismissBtn.style.borderRadius = '5px';
                
                dismissBtn.addEventListener('click', () => {
                    document.body.removeChild(modal);
                });
                
                modal.appendChild(title);
                modal.appendChild(dismissBtn);
                document.body.appendChild(modal);
              }
            }).catch(err => console.error("Failed to inject modal:", err));
          }
        });
      }

      if (currentState === "STUDYING") {
        const breakDurationMs = breakMins * 60 * 1000;
        const endTime = Date.now() + breakDurationMs;

        chrome.storage.local.set({
          timerState: "BREAKING",
          endTime: endTime
        }, () => {
          chrome.alarms.create("studyRouletteAlarm", { when: endTime });
          showNotification(
            "STUDY SESSION OVER! 💸",
            "TIME IS UP! CASH OUT OR DOUBLE DOWN! STARTING BREAK NOW!"
          );
        });
      } else if (currentState === "BREAKING") {
        chrome.storage.local.set({
          timerState: "IDLE",
          endTime: 0
        }, () => {
          showNotification(
            "BREAK OVER! 🎰",
            "BREAK TIME EXPIRED! NO MORE SLACKING. SPIN AGAIN TO DOUBLE DOWN!"
          );
        });
      }
    });
  }
});

// Alarm Listener for triggering initial study alarm
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.timerState && changes.timerState.newValue === "STUDYING") {
    chrome.storage.local.get(["endTime"], (data) => {
      if (data.endTime) {
        chrome.alarms.create("studyRouletteAlarm", { when: data.endTime });
      }
    });
  }
});
