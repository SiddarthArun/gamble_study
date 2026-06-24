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
let gameMode = "slots"; // "slots" | "blackjack" | "roulette"
let selectedBet = null;
let timerState = "IDLE";
let endTime = 0;
let studyMinutes = 0;
let breakMinutes = 0;
let tasks = [];
let blockedList = [];
let blockMode = false;
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
  
  const blockToggle = document.getElementById("block-toggle");
  const blockForm = document.getElementById("block-form");
  const blockInput = document.getElementById("block-input");
  const blockList = document.getElementById("block-list");
  
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
  const rainFloatingBtn = document.getElementById("floating-rain-btn");
  const rainCloseBtn = document.getElementById("sidebar-close-btn");
  const rainToggle = document.getElementById("rain-toggle");
  const rainStatusText = document.getElementById("rain-status-text");
  const rainVolume = document.getElementById("rain-volume");
  const volumePct = document.getElementById("volume-pct");

  // Sidebar logic
  function toggleRainSidebar(open) {
    rainSidebar.classList.toggle("open", open);
    sidebarOverlay.classList.toggle("open", open);
  }

  rainFloatingBtn.addEventListener("click", () => toggleRainSidebar(true));
  rainCloseBtn.addEventListener("click", () => toggleRainSidebar(false));

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

  // Sidebar Trigger elements
  const openTasksBtn = document.getElementById("open-tasks-btn");
  const openBlocksBtn = document.getElementById("open-blocks-btn");
  const tasksSidebar = document.getElementById("tasks-sidebar");
  const blockSidebar = document.getElementById("block-sidebar");
  const tasksCloseBtn = document.getElementById("tasks-close-btn");
  const blockCloseBtn = document.getElementById("block-close-btn");
  const sidebarOverlay = document.getElementById("sidebar-overlay");
  const taskCount = document.getElementById("task-count");
  const blockStatus = document.getElementById("block-status");

  // Sidebar toggling logic
  function toggleSidebar(sidebar, open) {
    sidebar.classList.toggle("open", open);
    sidebarOverlay.classList.toggle("open", open);
  }

  openTasksBtn.addEventListener("click", () => toggleSidebar(tasksSidebar, true));
  tasksCloseBtn.addEventListener("click", () => toggleSidebar(tasksSidebar, false));
  openBlocksBtn.addEventListener("click", () => toggleSidebar(blockSidebar, true));
  blockCloseBtn.addEventListener("click", () => toggleSidebar(blockSidebar, false));
  sidebarOverlay.addEventListener("click", () => {
    toggleSidebar(rainSidebar, false);
    toggleSidebar(tasksSidebar, false);
    toggleSidebar(blockSidebar, false);
  });

  function updateStatusUI() {
    taskCount.textContent = tasks.length;
    blockStatus.textContent = blockMode ? "ON" : "OFF";
    blockStatus.style.color = blockMode ? "var(--accent-green)" : "var(--text-secondary)";
  }

  // Settings elements
  const settingsSidebar = document.getElementById("settings-sidebar");
  const openSettingsBtn = document.getElementById("open-settings-btn");
  const settingsCloseBtn = document.getElementById("settings-close-btn");
  const audioAlertToggle = document.getElementById("audio-alert-toggle");
  const popupAlertToggle = document.getElementById("popup-alert-toggle");

  // Load Initial State
  chrome.storage.local.get(["timerState", "endTime", "studyMinutes", "breakMinutes", "tasks", "rainPlaying", "rainVolume", "isWorkSessionActive", "sessionLogs", "blockMode", "blockedList", "enableAudioAlert", "enablePopupAlert"], (data) => {
    if (data.timerState) timerState = data.timerState;
    if (data.endTime) endTime = data.endTime;
    if (data.studyMinutes) studyMinutes = data.studyMinutes;
    if (data.breakMinutes) breakMinutes = data.breakMinutes;
    if (data.tasks) tasks = data.tasks;
    if (data.blockedList) blockedList = data.blockedList;
    if (data.blockMode !== undefined) blockMode = data.blockMode;
    if (data.isWorkSessionActive !== undefined) isWorkSessionActive = data.isWorkSessionActive;
    if (data.sessionLogs) sessionLogs = data.sessionLogs;
    
    // Set settings
    audioAlertToggle.checked = !!data.enableAudioAlert;
    popupAlertToggle.checked = !!data.enablePopupAlert;
    
    updateTimerUI(spinBtn, reel1, reel2, reel3, tickerMsg, timerSection, timerClock);
    renderTasks(todoList);
    renderBlocks(blockList);
    blockToggle.checked = blockMode;
    updateStatusUI();
    updateBlockRules();
    updateRainUI(!!data.rainPlaying, data.rainVolume !== undefined ? data.rainVolume : 0.5);
    updateSessionUI();
  });

  // Settings Logic
  audioAlertToggle.addEventListener("change", (e) => {
    chrome.storage.local.set({ enableAudioAlert: e.target.checked });
  });

  popupAlertToggle.addEventListener("change", (e) => {
    chrome.storage.local.set({ enablePopupAlert: e.target.checked });
  });

  // Sidebar Toggling
  openTasksBtn.addEventListener("click", () => toggleSidebar(tasksSidebar, true));
  tasksCloseBtn.addEventListener("click", () => toggleSidebar(tasksSidebar, false));
  openBlocksBtn.addEventListener("click", () => toggleSidebar(blockSidebar, true));
  blockCloseBtn.addEventListener("click", () => toggleSidebar(blockSidebar, false));
  openSettingsBtn.addEventListener("click", () => toggleSidebar(settingsSidebar, true));
  settingsCloseBtn.addEventListener("click", () => toggleSidebar(settingsSidebar, false));
  
  sidebarOverlay.addEventListener("click", () => {
    toggleSidebar(rainSidebar, false);
    toggleSidebar(tasksSidebar, false);
    toggleSidebar(blockSidebar, false);
    toggleSidebar(settingsSidebar, false);
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
    
    if (gameMode === "slots") gameMode = "blackjack";
    else if (gameMode === "blackjack") gameMode = "roulette";
    else gameMode = "slots";

    modeSwitchBtn.textContent = `MODE: ${gameMode.toUpperCase()}`;
    slotsContainer.style.display = gameMode === "slots" ? "block" : "none";
    blackjackContainer.style.display = gameMode === "blackjack" ? "block" : "none";
    document.getElementById("roulette-container").style.display = gameMode === "roulette" ? "block" : "none";
    
    if (gameMode === "blackjack") startBlackjack();
  });

  resetBtn.addEventListener("click", () => {
    console.log("Reset button clicked");
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
    console.log("Start session button clicked");
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
    console.log("Updating Timer UI, state:", timerState);
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
      if (changes.blockedList) { blockedList = changes.blockedList.newValue; renderBlocks(blockList); }
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
      li.innerHTML = `
        <span class="todo-text">${task.text}</span>
        <button class="small-action-btn edit-btn">EDIT</button>
        <button class="small-action-btn del-btn">DEL</button>
      `;
      li.querySelector(".todo-text").addEventListener("click", () => {
        task.completed = !task.completed;
        saveTasks(todoList);
        logAction("TASK", `Task "${task.text}" marked as ${task.completed ? 'completed' : 'incomplete'}`);
      });
      li.querySelector(".edit-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        const textSpan = li.querySelector(".todo-text");
        const editBtn = li.querySelector(".edit-btn");
        const input = document.createElement("input");
        input.value = task.text;
        input.className = "todo-input";
        input.style.padding = "2px 4px";
        textSpan.replaceWith(input);
        editBtn.textContent = "SAVE";
        const saveAction = () => {
            task.text = input.value.trim();
            saveTasks(todoList);
            logAction("TASK", `Task edited: "${task.text}"`);
        };
        input.addEventListener("blur", saveAction);
        input.addEventListener("keypress", (e) => { if (e.key === 'Enter') saveAction(); });
        input.focus();
      });
      li.querySelector(".del-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        tasks = tasks.filter(t => t.id !== task.id);
        saveTasks(todoList);
        logAction("TASK", `Task "${task.text}" deleted`);
      });
      todoList.appendChild(li);
    });
    updateStatusUI();
  }


  // ROULETTE LOGIC
  const rouletteWheel = document.getElementById("roulette-wheel");
  const rouletteMsg = document.getElementById("roulette-msg");
  const spinRouletteBtn = document.getElementById("spin-roulette-btn");
  const betBtns = document.querySelectorAll(".bet-btn");

  betBtns.forEach(btn => {
      btn.addEventListener("click", () => {
          betBtns.forEach(b => b.classList.remove("selected"));
          btn.classList.add("selected");
          selectedBet = btn.dataset.bet;
          rouletteMsg.textContent = `BET: ${btn.textContent}`;
      });
  });

  spinRouletteBtn.addEventListener("click", () => {
      if (!selectedBet) {
          rouletteMsg.textContent = "SELECT A BET!";
          return;
      }
      spinRouletteBtn.disabled = true;
      
      // Reset wheel
      rouletteWheel.classList.remove("red", "black", "green");
      rouletteWheel.textContent = "...";
      
      // Animate wheel
      const rotation = 360 * 5 + Math.floor(Math.random() * 360);
      rouletteWheel.style.transform = `rotate(${rotation}deg)`;

      setTimeout(() => {
          const result = Math.floor(Math.random() * 37);
          rouletteWheel.textContent = result;
          
          // Set color class
          const color = result === 0 ? "green" : (result % 2 === 0 ? "red" : "black");
          rouletteWheel.classList.add(color);
          
          processRouletteResult(result, color);
          spinRouletteBtn.disabled = false;
      }, 1500);
  });

  function processRouletteResult(result, color) {
      let isWin = false;
      
      // Determine Win/Loss based on bet type
      if (selectedBet === "red") isWin = color === "red";
      else if (selectedBet === "black") isWin = color === "black";
      else if (selectedBet === "odd") isWin = result !== 0 && result % 2 !== 0;
      else if (selectedBet === "even") isWin = result !== 0 && result % 2 === 0;
      else if (selectedBet === "low") isWin = result >= 1 && result <= 18;
      else if (selectedBet === "high") isWin = result >= 19 && result <= 36;
      else if (selectedBet === "dozen1") isWin = result >= 1 && result <= 12;
      else if (selectedBet === "dozen2") isWin = result >= 13 && result <= 24;
      else if (selectedBet === "dozen3") isWin = result >= 25 && result <= 36;

      let study = 30, breakTime = 5;
      
      if (result === 0) {
          // Green Zero Penalty
          study = 90; breakTime = 0;
          rouletteMsg.textContent = `HOUSE! 0 (Green)`;
      } else if (isWin) {
          // Win Payouts
          if (["dozen1", "dozen2", "dozen3"].includes(selectedBet)) {
            study = 20; breakTime = 15;
          } else {
            study = 25; breakTime = 10;
          }
          rouletteMsg.textContent = `WIN! ${result} (${color.toUpperCase()})`;
      } else {
          // Loss Penalties
          if (["dozen1", "dozen2", "dozen3"].includes(selectedBet)) {
            study = 60; breakTime = 0;
          } else {
            study = 45; breakTime = 0;
          }
          rouletteMsg.textContent = `LOSS! ${result} (${color.toUpperCase()})`;
      }
      
      chrome.storage.local.set({
        timerState: "STUDYING",
        studyMinutes: study,
        breakMinutes: breakTime,
        endTime: Date.now() + (study * 60 * 1000)
      });
      logAction("GAMBLE", `Roulette: ${result} (${color}). Bet: ${selectedBet}. Result: ${isWin ? 'WIN' : 'LOSS'}`);
  }

  blockForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = blockInput.value.trim().toLowerCase();
    if (text) {
      blockedList.push({ id: Date.now(), text });
      saveBlocks(blockList);
      blockInput.value = "";
    }
  });

  function saveBlocks(blockList) {
    chrome.storage.local.set({ blockedList }, () => {
      renderBlocks(blockList);
      updateBlockRules();
    });
  }

  function updateBlockRules() {
    chrome.storage.local.get(["blockMode", "blockedList"], (data) => {
      console.log("Updating block rules. Mode:", data.blockMode, "List:", data.blockedList);
      const rules = [];
      if (data.blockMode && data.blockedList) {
        data.blockedList.forEach((item, index) => {
          rules.push({
            id: index + 1,
            priority: 1,
            action: { 
              type: "redirect", 
              redirect: { url: chrome.runtime.getURL("blocked.html") } 
            },
            condition: {
              urlFilter: `*${item.text}*`,
              resourceTypes: ["main_frame"]
            }
          });
        });
      }
      console.log("New rules to add:", rules);
      
      chrome.declarativeNetRequest.getDynamicRules((oldRules) => {
        const oldRuleIds = oldRules.map(r => r.id);
        console.log("Removing old rule IDs:", oldRuleIds);
        chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: oldRuleIds,
          addRules: rules
        }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error updating rules:", chrome.runtime.lastError);
          } else {
            console.log("Rules updated successfully.");
          }
        });
      });
    });
  }

  function renderBlocks(blockList) {
    blockList.innerHTML = "";
    blockedList.forEach((item) => {
      const li = document.createElement("li");
      li.className = "todo-item";
      li.innerHTML = `
        <span class="todo-text">${item.text}</span>
        <button class="small-action-btn edit-btn">EDIT</button>
        <button class="small-action-btn del-btn">DEL</button>
      `;
      li.querySelector(".edit-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        const textSpan = li.querySelector(".todo-text");
        const editBtn = li.querySelector(".edit-btn");
        const input = document.createElement("input");
        input.value = item.text;
        input.className = "todo-input";
        input.style.padding = "2px 4px";
        textSpan.replaceWith(input);
        editBtn.textContent = "SAVE";
        const saveAction = () => {
          item.text = input.value.trim();
          saveBlocks(blockList);
        };
        input.addEventListener("blur", saveAction);
        input.addEventListener("keypress", (e) => { if (e.key === 'Enter') saveAction(); });
        input.focus();
      });
      li.querySelector(".del-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        blockedList = blockedList.filter(t => t.id !== item.id);
        saveBlocks(blockList);
      });
      blockList.appendChild(li);
    });
    updateStatusUI();
  }
});