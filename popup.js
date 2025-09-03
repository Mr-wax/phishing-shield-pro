document.addEventListener('DOMContentLoaded', function() {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const emailsScanned = document.getElementById('emailsScanned');
    const threatsDetected = document.getElementById('threatsDetected');
    const scanNowButton = document.getElementById('scanNow');
    const openDashboard = document.getElementById('openDashboard');
    const lastUpdated = document.getElementById('lastUpdated');
    
    let stats = {
        totalScanned: 0,
        threatsDetected: 0,
        emailsBlocked: 0,
        emailsDeleted: 0
    };

    let isScanning = false;

    
    updateUI();
    updateStatus();

    
    if (scanNowButton) {
        scanNowButton.addEventListener('click', toggleScanning);
    }

    if (openDashboard) {
        openDashboard.addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
        });
    }

    
    loadStats();

   
    setInterval(loadStats, 5000);

    async function loadStats() {
        try {
            const result = await chrome.runtime.sendMessage({ action: 'getStats' });
            if (result) {
                stats = result;
                updateUI();
            }
        } catch (error) {
            console.log('Error loading stats:', error);
        }
    }

    function updateUI() {
        if (emailsScanned) emailsScanned.textContent = stats.totalScanned.toLocaleString();
        if (threatsDetected) threatsDetected.textContent = stats.threatsDetected.toLocaleString();
        if (lastUpdated) lastUpdated.textContent = new Date().toLocaleTimeString();
        
        // Update scan button text and state
        if (scanNowButton) {
            scanNowButton.textContent = isScanning ? 'Stop Scanning' : 'Start Scanning';
            scanNowButton.className = isScanning ? 'scan-button scanning' : 'scan-button';
        }
    }

    async function updateStatus() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.url.includes('mail.google.com')) {
            setStatus('Open Gmail to scan emails', 'warning');
            return;
        }

        
        setStatus('Ready to scan emails', 'active');

        
        try {
            chrome.tabs.sendMessage(tab.id, { action: 'checkEmailOpen' }, (response) => {
                if (chrome.runtime.lastError) {
                    
                    return;
                }
                
                if (response && response.isEmailOpen) {
                    setStatus('Ready to scan emails', 'active');
                }
            });
        } catch (error) {
           
        }
    }

    function setStatus(message, status) {
        if (statusText) statusText.textContent = message;
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator';
            if (status === 'warning') {
                statusIndicator.classList.add('warning');
            } else if (status === 'active') {
                statusIndicator.classList.add('active');
            }
        }
    }

    async function toggleScanning() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.url.includes('mail.google.com')) {
            showNotification('Please open Gmail first', 'error');
            return;
        }

        if (isScanning) {
            
            try {
                await chrome.tabs.sendMessage(tab.id, { action: 'stopScanning' });
                isScanning = false;
                showNotification('Scanning stopped', 'success');
                updateUI();
            } catch (error) {
                showNotification('Failed to stop scanning', 'error');
            }
        } else {
            
            try {
                const response = await chrome.tabs.sendMessage(tab.id, { action: 'startScanning' });
                if (response && response.success) {
                    isScanning = true;
                    showNotification('Scanning started - emails will be automatically analyzed', 'success');
                    updateUI();
                } else {
                    showNotification('Failed to start scanning', 'error');
                }
            } catch (error) {
                showNotification('Failed to start scanning', 'error');
            }
        }
    }

    function showNotification(message, type = 'success') {
        // Remove any existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => notif.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 10px 15px;
            background: ${type === 'success' ? '#4CAF50' : '#F44336'};
            color: white;
            border-radius: 4px;
            font-size: 12px;
            z-index: 10000;
            max-width: 250px;
        `;

        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
});