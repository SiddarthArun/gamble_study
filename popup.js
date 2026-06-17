// 3-Reel Configuration
const SYMBOLS = {
  COMMON: ["📚", "✏️", "☕"],
  UNCOMMON: ["💡", "🧠", "🍎"],
  RARE: ["🚀", "💎", "🔥"],
  JACKPOT: ["🎰", "🏆", "⭐"]
};
const WEIGHTS = [60, 25, 10, 5]; // Common, Uncommon, Rare, Jackpot

// Cheesy Casino Slogans
const TICKER_MESSAGES = [
  "NO WHAMMIES!", "BIG MONEY!", "LET IT RIDE!", "JACKPOT COMING!",
  "FEELING LUCKY?", "SPIN IT TO WIN IT!", "DOUBLE DOWN!", "CASH OUT!"
];

// Game State
let gameMode = "slots"; // "slots" | "blackjack"
let timerState = "IDLE";
let endTime = 0;
let studyMinutes = 0;
let breakMinutes = 0;
let tasks = [];
let countdownInterval = null;
let isWorkSessionActive = false;
let sessionLogs = [];

// Blackjack State
let deck = [];
let playerHand = [];
let dealerHand = [];

document.addEventListener("DOMContentLoaded", () => {
  const modeSwitchBtn = document.getElementById("mode-switch");
  const slotsContainer = document.getElementById("slots-container");
  const blackjackContainer = document.getElementById("blackjack-container");
  
  // Slot elements
  const reel1 = document.getElementById("reel-1");
  const reel2 = document.getElementById("reel-2");
  const reel3 = document.getElementById("reel-3");
  const tickerMsg = document.getElementById("ticker-msg");
  const spinBtn = document.getElementById("spin-btn");
  
  // Blackjack elements
  const dealerHandEl = document.getElementById("dealer-hand");
  const playerHandEl = document.getElementById("player-hand");
  const hitBtn = document.getElementById("hit-btn");
  const stayBtn = document.getElementById("stay-btn");
  const blackjackMsg = document.getElementById("blackjack-msg");

  const timerSection = document.getElementById("timer-section");
  const timerPhase = document.getElementById("timer-phase");
  const timerClock = document.getElementById("timer-clock");
  const resetBtn = document.getElementById("reset-btn");
  const todoForm = document.getElementById("todo-form");
  const todoInput = document.getElementById("todo-input");
  const todoList = document.getElementById("todo-list");
  
  // Session elements
  const startSessionBtn = document.getElementById("start-session-btn");
  const endSessionBtn = document.getElementById("end-session-btn");
  const sessionSummaryContainer = document.getElementById("session-summary-container");
  const sessionSummaryText = document.getElementById("session-summary-text");
  const copySummaryBtn = document.getElementById("copy-summary-btn");
  const exportSummaryBtn = document.getElementById("export-summary-btn");
  const dismissSummaryBtn = document.getElementById("dismiss-summary-btn");

  // Rain Sidebar elements
  const rainSidebar = document.getElementById("rain-sidebar");
  const rainSidebarOverlay = document.getElementById("rain-sidebar-overlay");
  const rainFloatingBtn = document.getElementById("floating-rain-btn");
  const rainCloseBtn = document.getElementById("sidebar-close-btn");
  const rainToggle = document.getElementById("rain-toggle");
  const rainStatusText = document.getElementById("rain-status-text");
  const rainVolume = document.getElementById("rain-volume");
  const volumePct = document.getElementById("volume-pct");

  // Sidebar logic
  function toggleRainSidebar(open) {
    rainSidebar.classList.toggle("open", open);
    rainSidebarOverlay.classList.toggle("open", open);
  }

  rainFloatingBtn.addEventListener("click", () => toggleRainSidebar(true));
  rainCloseBtn.addEventListener("click", () => toggleRainSidebar(false));
  rainSidebarOverlay.addEventListener("click", () => toggleRainSidebar(false));

  function updateRainUI(playing, volume) {
    rainToggle.checked = playing;
    rainStatusText.textContent = playing ? "ON" : "OFF";
    rainStatusText.classList.toggle("active", playing);
    rainVolume.value = volume * 100;
    volumePct.textContent = `${Math.round(volume * 100)}%`;
  }

  rainToggle.addEventListener("change", (e) => {
    console.log('Toggling rain:', e.target.checked);
    chrome.storage.local.set({ rainPlaying: e.target.checked });
  });

  rainVolume.addEventListener("input", (e) => {
    console.log('Changing volume:', e.target.value);
    const volume = e.target.value / 100;
    chrome.storage.local.set({ rainVolume: volume });
    volumePct.textContent = `${Math.round(volume * 100)}%`;
  });

  // Load Initial State
  chrome.storage.local.get(["timerState", "endTime", "studyMinutes", "breakMinutes", "tasks", "rainPlaying", "rainVolume", "isWorkSessionActive", "sessionLogs"], (data) => {
    if (data.timerState) timerState = data.timerState;
    if (data.endTime) endTime = data.endTime;
    if (data.studyMinutes) studyMinutes = data.studyMinutes;
    if (data.breakMinutes) breakMinutes = data.breakMinutes;
    if (data.tasks) tasks = data.tasks;
    if (data.isWorkSessionActive !== undefined) isWorkSessionActive = data.isWorkSessionActive;
    if (data.sessionLogs) sessionLogs = data.sessionLogs;
    
    updateTimerUI(spinBtn, reel1, reel2, reel3, tickerMsg, timerSection, timerClock);
    renderTasks(todoList);
    updateRainUI(!!data.rainPlaying, data.rainVolume !== undefined ? data.rainVolume : 0.5);
    updateSessionUI();
  });

  // Sync UI on storage change
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      if (changes.rainPlaying || changes.rainVolume) {
        chrome.storage.local.get(['rainPlaying', 'rainVolume'], (data) => {
          updateRainUI(!!data.rainPlaying, data.rainVolume !== undefined ? data.rainVolume : 0.5);
        });
      }
      
      if (changes.isWorkSessionActive) {
          isWorkSessionActive = changes.isWorkSessionActive.newValue;
          updateSessionUI();
      }
      if (changes.timerState) {
          timerState = changes.timerState.newValue;
          logAction("TIME", timerState);
      }

      if (changes.endTime) endTime = changes.endTime.newValue;
      if (changes.studyMinutes) studyMinutes = changes.studyMinutes.newValue;
      if (changes.breakMinutes) breakMinutes = changes.breakMinutes.newValue;
      if (changes.tasks) { tasks = changes.tasks.newValue; renderTasks(todoList); }
      updateTimerUI(spinBtn, reel1, reel2, reel3, tickerMsg, timerSection, timerClock);
    }
  });

  spinBtn.addEventListener("click", () => {
    if (timerState !== "IDLE") return;
    triggerSpin(spinBtn, tickerMsg, reel1, reel2, reel3);
  });

  modeSwitchBtn.addEventListener("click", () => {
    if (timerState !== "IDLE") return;
    gameMode = gameMode === "slots" ? "blackjack" : "slots";
    modeSwitchBtn.textContent = `MODE: ${gameMode.toUpperCase()}`;
    slotsContainer.style.display = gameMode === "slots" ? "block" : "none";
    blackjackContainer.style.display = gameMode === "blackjack" ? "block" : "none";
    if (gameMode === "blackjack") startBlackjack();
  });

  resetBtn.addEventListener("click", () => {
    chrome.alarms.clear("studyRouletteAlarm", () => {
      chrome.storage.local.set({ timerState: "IDLE", endTime: 0 }, () => {
        timerState = "IDLE";
        updateTimerUI(spinBtn, reel1, reel2, reel3, tickerMsg, timerSection, timerClock);
        logAction("TIME", "CASHED_OUT");
      });
    });
  });

  // --- SESSION LOGIC ---
  function logAction(type, description) {
    if (!isWorkSessionActive) return;
    const log = { timestamp: Date.now(), type, description };
    sessionLogs.push(log);
    chrome.storage.local.set({ sessionLogs });
  }

  function updateSessionUI() {
    startSessionBtn.style.display = isWorkSessionActive ? "none" : "block";
    endSessionBtn.style.display = isWorkSessionActive ? "block" : "none";
  }

  startSessionBtn.addEventListener("click", () => {
    isWorkSessionActive = true;
    sessionLogs = [];
    chrome.storage.local.set({ isWorkSessionActive: true, sessionLogs: [], sessionStartTime: Date.now() });
    updateSessionUI();
    logAction("TIME", timerState); // Record initial state
  });

  endSessionBtn.addEventListener("click", () => {
    isWorkSessionActive = false;
    chrome.storage.local.set({ isWorkSessionActive: false });
    updateSessionUI();
    logAction("TIME", "SESSION_ENDED");
    
    // Allow a small delay for the final log to be recorded before generating the summary
    setTimeout(() => {
        chrome.storage.local.get('sessionLogs', (data) => {
            const logs = data.sessionLogs;
            let summary = "=== WORK SESSION SUMMARY ===\n\n";
            
            const taskActions = logs.filter(l => l.type === 'TASK');
            const gambleActions = logs.filter(l => l.type === 'GAMBLE');
            const timeActions = logs.filter(l => l.type === 'TIME');

            summary += "--- TASKS ---\n";
            if (taskActions.length === 0) summary += "No tasks interacted with.\n";
            else taskActions.forEach(a => summary += `- ${a.description}\n`);
            
            summary += "\n--- TIME DURATIONS ---\n";
            if (timeActions.length <= 1) summary += "No time data recorded.\n";
            else {
                for (let i = 0; i < timeActions.length - 1; i++) {
                    const startLog = timeActions[i];
                    const endLog = timeActions[i+1];
                    const durationMins = Math.round((endLog.timestamp - startLog.timestamp) / 60000);
                    
                    if (startLog.description === "STUDYING") {
                        summary += `- Worked for ${durationMins} mins\n`;
                    } else if (startLog.description === "BREAKING") {
                        summary += `- Break for ${durationMins} mins\n`;
                    } else if (startLog.description === "CASHED_OUT") {
                         // Session ended at cash out
                         break;
                    }
                }
            }
            
            summary += "\n--- GAMBLING OUTCOMES ---\n";
            if (gambleActions.length === 0) summary += "No gambles taken.\n";
            else gambleActions.forEach(a => summary += `- ${a.description}\n`);
            
            sessionSummaryText.textContent = summary;
            sessionSummaryContainer.style.display = "block";
        });
    }, 100);
  });

  copySummaryBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(sessionSummaryText.textContent);
      // Removed alert as requested to reduce popup window visibility
  });

  exportSummaryBtn.addEventListener("click", () => {
      const blob = new Blob([sessionSummaryText.textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session_summary_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
  });

  dismissSummaryBtn.addEventListener("click", () => {
      sessionSummaryContainer.style.display = "none";
      chrome.storage.local.set({ sessionLogs: [] });
  });

  todoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = todoInput.value.trim();
    if (text) {
      tasks.push({ id: Date.now(), text, completed: false });
      saveTasks(todoList);
      logAction("TASK", `Added task: "${text}"`);
      todoInput.value = "";
    }
  });

  // BLACKJACK LOGIC
  function startBlackjack() {
    deck = Array.from({ length: 52 }, (_, i) => ({
      val: (i % 13) + 1,
      suit: ["♥", "♦", "♣", "♠"][Math.floor(i / 13)]
    }));
    playerHand = [drawCard(), drawCard()];
    dealerHand = [drawCard(), drawCard()];
    hitBtn.disabled = false;
    stayBtn.disabled = false;
    updateBlackjackUI();
  }

  function drawCard() {
    return deck.splice(Math.floor(Math.random() * deck.length), 1)[0];
  }

  function getRank(val) {
    if (val === 1) return 'A';
    if (val === 11) return 'J';
    if (val === 12) return 'Q';
    if (val === 13) return 'K';
    return val.toString();
  }

  function getCardValue(val) {
    return val > 10 ? 10 : val;
  }

  function getHandValue(hand) {
    let value = 0;
    hand.forEach(card => value += getCardValue(card.val));
    return value;
  }

  function createCardElement(card) {
    const el = document.createElement("div");
    el.className = `card ${['♥', '♦'].includes(card.suit) ? 'red' : ''}`;
    el.innerHTML = `<span class="rank">${getRank(card.val)}</span><span class="suit">${card.suit}</span>`;
    return el;
  }

  function updateBlackjackUI() {
    playerHandEl.innerHTML = "";
    playerHand.forEach(c => playerHandEl.appendChild(createCardElement(c)));
    
    dealerHandEl.innerHTML = "";
    dealerHandEl.appendChild(createCardElement(dealerHand[0]));
    const backEl = document.createElement("div");
    backEl.className = "card";
    backEl.textContent = "?";
    dealerHandEl.appendChild(backEl);
  }

  hitBtn.addEventListener("click", () => {
    playerHand.push(drawCard());
    updateBlackjackUI();
    if (getHandValue(playerHand) > 21) endBlackjack("BUST");
  });

  stayBtn.addEventListener("click", () => {
    while (getHandValue(dealerHand) < 17) dealerHand.push(drawCard());
    const pValue = getHandValue(playerHand);
    const dValue = getHandValue(dealerHand);
    if (dValue > 21 || pValue > dValue) endBlackjack("WIN");
    else if (pValue === dValue) endBlackjack("PUSH");
    else endBlackjack("LOSS");
  });

  function endBlackjack(result) {
    let study = 30, breakTime = 5;
    if (result === "BUST") { study = 90; breakTime = 2; }
    else if (result === "LOSS") { study = 45; breakTime = 5; }
    else if (result === "PUSH") { study = 30; breakTime = 5; }
    else if (result === "WIN") { study = 25; breakTime = 10; }
    
    // Check Blackjack (21 in 2 cards)
    if (result === "WIN" && playerHand.length === 2 && getHandValue(playerHand) === 21) {
        study = 15; breakTime = 10;
    }

    dealerHandEl.innerHTML = "";
    dealerHand.forEach(c => dealerHandEl.appendChild(createCardElement(c)));
    
    hitBtn.disabled = true;
    stayBtn.disabled = true;
    
    blackjackMsg.textContent = `RESULT: ${result}!`;
    chrome.storage.local.set({
      timerState: "STUDYING",
      studyMinutes: study,
      breakMinutes: breakTime,
      endTime: Date.now() + (study * 60 * 1000)
    });
    logAction("GAMBLE", `Blackjack: ${result}. Hand: ${getHandValue(playerHand)} vs ${getHandValue(dealerHand)}`);
  }

  // SLOT LOGIC
  function updateTimerUI(spinBtn, r1, r2, r3, tickerMsg, timerSection, timerClock) {
    if (timerState === "IDLE") {
      spinBtn.disabled = false;
      [r1, r2, r3].forEach(r => {
        Array.from(r.children).forEach(child => child.textContent = "?");
      });
      tickerMsg.textContent = "LET IT RIDE!";
      tickerMsg.classList.remove("spinning");
      timerSection.classList.add("disabled");
      if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
    } else {
      spinBtn.disabled = true;
      timerSection.classList.remove("disabled");
      runLiveTimer(timerClock, timerPhase);
    }
  }

  function getWeightedSymbol() {
    const rand = Math.random() * 100;
    let sum = 0;
    for (let i = 0; i < WEIGHTS.length; i++) {
      sum += WEIGHTS[i];
      if (rand < sum) {
        const tier = Object.keys(SYMBOLS)[i];
        return SYMBOLS[tier][Math.floor(Math.random() * SYMBOLS[tier].length)];
      }
    }
  }

  function triggerSpin(spinBtn, tickerMsg, r1, r2, r3) {
    spinBtn.disabled = true;
    tickerMsg.classList.add("spinning");
    
    const interval = setInterval(() => {
        [r1, r2, r3].forEach(r => {
            Array.from(r.children).forEach(c => c.textContent = getWeightedSymbol());
        });
    }, 100);

    setTimeout(() => {
        clearInterval(interval);
        const finalSymbols = [getWeightedSymbol(), getWeightedSymbol(), getWeightedSymbol()];
        [r1, r2, r3].forEach((r, i) => {
            Array.from(r.children)[1].textContent = finalSymbols[i];
        });
        
        tickerMsg.classList.remove("spinning");
        calculateAndSettle(finalSymbols);
    }, 2000);
  }

  function calculateAndSettle(symbols) {
    let study = 30; // Base
    let breakTime = 5;

    // Logic based on symbols
    const [s1, s2, s3] = symbols;
    
    if (s1 === s2 && s2 === s3) {
        // Jackpot-ish
        if (SYMBOLS.JACKPOT.includes(s1)) { study = 5; breakTime = 20; }
        else { study = 15; breakTime = 10; }
    } else {
        // Common mix
        study = 30 + Math.floor(Math.random() * 20);
    }

    chrome.storage.local.set({
      timerState: "STUDYING",
      studyMinutes: Math.round(study),
      breakMinutes: Math.round(breakTime),
      endTime: Date.now() + (Math.round(study) * 60 * 1000)
    });
    logAction("GAMBLE", `Slots: ${symbols.join("-")}`);
  }

  function runLiveTimer(timerClock, timerPhase) {
    if (countdownInterval) clearInterval(countdownInterval);
    const updateClock = () => {
      const diff = endTime - Date.now();
      if (diff <= 0) {
        timerClock.textContent = "00:00";
        clearInterval(countdownInterval);
        return;
      }
      timerPhase.textContent = timerState === "STUDYING" ? "WORK MODE 💸" : "BREAK MODE 🎰";
      timerPhase.style.color = timerState === "STUDYING" ? "#ff007f" : "#00f5d4";
      const totalSeconds = Math.ceil(diff / 1000);
      timerClock.textContent = `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
    };
    updateClock();
    countdownInterval = setInterval(updateClock, 250);
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      if (changes.timerState) timerState = changes.timerState.newValue;
      if (changes.endTime) endTime = changes.endTime.newValue;
      if (changes.studyMinutes) studyMinutes = changes.studyMinutes.newValue;
      if (changes.breakMinutes) breakMinutes = changes.breakMinutes.newValue;
      if (changes.tasks) { tasks = changes.tasks.newValue; renderTasks(todoList); }
      updateTimerUI(spinBtn, reel1, reel2, reel3, tickerMsg, timerSection, timerClock);
    }
  });

  function saveTasks(todoList) {
    chrome.storage.local.set({ tasks }, () => renderTasks(todoList));
  }

  function renderTasks(todoList) {
    todoList.innerHTML = "";
    tasks.forEach((task) => {
      const li = document.createElement("li");
      li.className = `todo-item ${task.completed ? "completed" : ""}`;
      li.innerHTML = `<span class="todo-text">${task.text}</span><span class="todo-edit">[EDIT]</span><span class="todo-del">[X]</span>`;
      li.querySelector(".todo-text").addEventListener("click", () => {
        task.completed = !task.completed;
        saveTasks(todoList);
        logAction("TASK", `Task "${task.text}" marked as ${task.completed ? 'completed' : 'incomplete'}`);
      });
      li.querySelector(".todo-edit").addEventListener("click", (e) => {
        e.stopPropagation();
        const textSpan = li.querySelector(".todo-text");
        const editSpan = li.querySelector(".todo-edit");
        const input = document.createElement("input");
        input.value = task.text;
        input.className = "todo-input";
        input.style.padding = "2px 4px";
        textSpan.replaceWith(input);
        editSpan.textContent = "[SAVE]";
        const saveAction = () => {
            task.text = input.value.trim();
            saveTasks(todoList);
            logAction("TASK", `Task edited: "${task.text}"`);
        };
        input.addEventListener("blur", saveAction);
        input.addEventListener("keypress", (e) => { if (e.key === 'Enter') saveAction(); });
        input.focus();
      });
      li.querySelector(".todo-del").addEventListener("click", (e) => {
        e.stopPropagation();
        tasks = tasks.filter(t => t.id !== task.id);
        saveTasks(todoList);
        logAction("TASK", `Task "${task.text}" deleted`);
      });
      todoList.appendChild(li);
    });
  }
});