# Study Roulette: Gamified High-Volatility Productivity

Study Roulette is a Chrome Extension that transforms the standard Pomodoro technique into a high-stakes, gamified productivity experience. Instead of just setting a timer, you bet your productivity on casino games, where the outcome dictates your focus intervals and break durations.

## Core Features

### 🚀 High-Stakes Productivity
*   **Gamified Intervals**: Replace manual timers with high-stakes casino games.
*   **Game Modes**:
    *   **Slots**: Spin for your focus time.
    *   **Blackjack**: Play against the dealer; your hand determines your next study/break block.
    *   **Focus Roulette**: Bet on Red/Black, Odd/Even, Low/High, or Dozens. Features a realistic, physics-animated wheel and tiered risk/reward payouts.
*   **Rigged Payout Engine**: Designed to keep you focused. Winners earn balanced study/break ratios, while losses result in intense, "overtime" focus blocks.

### 🛡️ Distraction & Ambient Control
*   **Distraction Blocker**: A dynamic URL keyword blocker. Instantly block distracting websites (e.g., "youtube") by adding them to your block list.
*   **Ambient Control**: Integrated rain ambient sound generator to keep you in the flow, powered by browser offscreen audio capabilities.

### 📊 Telemetry & Reporting
*   **Task Management**: Integrated "Loot List" to track your study goals.
*   **Session Summaries**: Automatically generates a detailed log of your work sessions, gambling outcomes, and time distribution upon cashing out.

## Tech Stack
*   **Platform**: Chrome Extension Manifest V3.
*   **Architecture**: Built using a Service Worker for background processes, Offscreen Documents for persistent audio, and `chrome.declarativeNetRequest` for performant website blocking.
*   **UI**: Modern, dark-themed interface using GitHub-inspired CSS variables and custom typography.

## Installation Instructions

1.  **Download**: Clone or download this repository as a `.zip` file.
2.  **Extract**: Unzip the files into a dedicated folder on your machine.
3.  **Load in Chrome**:
    - Open `chrome://extensions/` in your browser.
    - Enable **Developer mode** in the top right corner.
    - Click **"Load Unpacked"** in the top left.
    - Select the folder containing the extracted files.
4.  **Finish**: The extension will appear in your toolbar. Click the update icon if prompted.
