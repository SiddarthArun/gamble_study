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
async function manageOffscreenDocument(playing) {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
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
      }).catch(() => {}); // Catch error if offscreen isn't ready yet
    }
    if (changes.rainVolume) {
      chrome.runtime.sendMessage({
        type: 'UPDATE_VOLUME',
        volume: changes.rainVolume.newValue
      }).catch(() => {}); // Catch error if offscreen isn't ready yet
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
    chrome.storage.local.get(["timerState", "studyMinutes", "breakMinutes"], (data) => {
      const currentState = data.timerState || "IDLE";
      const breakMins = data.breakMinutes || 1;

      if (currentState === "STUDYING") {
        // Transition from STUDYING to BREAKING phase
        const breakDurationMs = breakMins * 60 * 1000;
        const endTime = Date.now() + breakDurationMs;

        chrome.storage.local.set({
          timerState: "BREAKING",
          endTime: endTime
        }, () => {
          // Schedule the break alarm
          chrome.alarms.create("studyRouletteAlarm", { when: endTime });
          
          showNotification(
            "STUDY SESSION OVER! 💸",
            "TIME IS UP! CASH OUT OR DOUBLE DOWN! STARTING BREAK NOW!"
          );
        });
      } else if (currentState === "BREAKING") {
        // Transition from BREAKING to IDLE phase (cycle completes)
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