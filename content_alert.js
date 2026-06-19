chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SHOW_ALERT") {
        createAlertModal();
    }
});

function createAlertModal() {
    const modal = document.createElement('div');
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
