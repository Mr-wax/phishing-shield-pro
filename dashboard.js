class PhishingDetectorDashboard {
    constructor() {
        this.stats = {
            totalScanned: 0,
            threatsDetected: 0,
            emailsBlocked: 0,
            emailsDeleted: 0
        };
        this.threats = [];
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.renderDashboard();
        this.setupAutoRefresh();
    }

    async loadData() {
        await this.loadStats();
        await this.loadThreats();
    }

    async loadStats() {
        try {
            const result = await chrome.runtime.sendMessage({ action: 'getStats' });
            if (result && !result.error) {
                this.stats = result;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadThreats() {
        try {
            const data = await chrome.storage.sync.get('phishingThreats');
            this.threats = data.phishingThreats || [];
        } catch (error) {
            console.error('Error loading threats:', error);
        }
    }

    setupEventListeners() {
        const refreshBtn = document.getElementById('refreshBtn');
        const settingsBtn = document.getElementById('settingsBtn');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettings();
            });
        }
    }

    async refreshData() {
        await this.loadData();
        this.renderDashboard();
        this.showNotification('Dashboard refreshed');
    }

    renderDashboard() {
        this.renderStats();
        this.renderThreats();
        this.renderCharts();
        this.updateFooter();
    }

    renderStats() {
        this.setElementText('statTotal', this.stats.totalScanned.toLocaleString());
        this.setElementText('statThreats', this.stats.threatsDetected.toLocaleString());
        this.setElementText('statBlocked', this.stats.emailsBlocked.toLocaleString());
        this.setElementText('statDeleted', this.stats.emailsDeleted.toLocaleString());
    }

    renderThreats() {
        const threatsList = document.getElementById('threatsList');
        const threatsCount = document.getElementById('threatsCount');
        
        if (threatsCount) {
            threatsCount.textContent = `${this.threats.length} threat${this.threats.length !== 1 ? 's' : ''}`;
        }

        if (!threatsList) return;

        if (this.threats.length === 0) {
            threatsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎉</div>
                    <h3>No threats detected</h3>
                    <p>Your emails appear to be safe</p>
                </div>
            `;
            return;
        }

        threatsList.innerHTML = this.threats.slice().reverse().map(threat => `
            <div class="threat-item">
                <div class="threat-header">
                    <div>
                        <div class="threat-subject">${this.escapeHtml(threat.subject)}</div>
                        <div class="threat-sender">From: ${this.escapeHtml(threat.sender)}</div>
                    </div>
                    <div class="threat-confidence">${Math.round(threat.confidence * 100)}% confidence</div>
                </div>
                <div class="threat-reasons">
                    ${threat.reasons.map(reason => 
                        `<span class="reason-tag">${this.escapeHtml(reason)}</span>`
                    ).join('')}
                </div>
                <div class="threat-meta">
                    <small>Detected: ${new Date(threat.timestamp).toLocaleString()}</small>
                </div>
            </div>
        `).join('');
    }

    renderCharts() {
        this.renderAccuracyChart();
        this.renderThreatChart();
    }

    renderAccuracyChart() {
        const accuracy = this.calculateAccuracy();
        const chartBar = document.querySelector('#accuracyChart .chart-bar');
        const accuracyValue = document.getElementById('accuracyValue');
        
        if (chartBar) {
            chartBar.style.width = `${accuracy}%`;
        }
        
        if (accuracyValue) {
            accuracyValue.textContent = `${accuracy}%`;
        }
    }

    renderThreatChart() {
        const threatInfo = document.getElementById('threatInfo');
        if (!threatInfo) return;

        if (this.threats.length === 0) {
            threatInfo.textContent = 'No threats detected yet';
            return;
        }

        const patterns = this.analyzeThreatPatterns();
        const total = Object.values(patterns).reduce((sum, val) => sum + val, 0);
        
        if (total === 0) {
            threatInfo.textContent = 'No threat patterns found';
            return;
        }

        threatInfo.innerHTML = `
            <div style="font-size: 12px; line-height: 1.6;">
                <div>🔗 Links: ${patterns.suspiciousLinks} (${Math.round(patterns.suspiciousLinks/total*100)}%)</div>
                <div>⏰ Urgency: ${patterns.urgencyLanguage} (${Math.round(patterns.urgencyLanguage/total*100)}%)</div>
                <div>📧 Sender: ${patterns.senderIssues} (${Math.round(patterns.senderIssues/total*100)}%)</div>
                <div>📝 Other: ${patterns.other} (${Math.round(patterns.other/total*100)}%)</div>
            </div>
        `;
    }

    analyzeThreatPatterns() {
        const patterns = {
            suspiciousLinks: 0,
            urgencyLanguage: 0,
            senderIssues: 0,
            other: 0
        };

        this.threats.forEach(threat => {
            threat.reasons.forEach(reason => {
                if (reason.includes('link')) patterns.suspiciousLinks++;
                else if (reason.includes('urgency') || reason.includes('Urgency')) patterns.urgencyLanguage++;
                else if (reason.includes('sender') || reason.includes('domain')) patterns.senderIssues++;
                else patterns.other++;
            });
        });

        return patterns;
    }

    calculateAccuracy() {
        if (this.stats.totalScanned === 0) return 0;
        return Math.round((this.stats.threatsDetected / this.stats.totalScanned) * 100);
    }

    updateFooter() {
        this.setElementText('footerTime', new Date().toLocaleString());
    }

    setupAutoRefresh() {
        setInterval(async () => {
            await this.loadData();
            this.renderDashboard();
        }, 30000);
    }

    showNotification(message, type = 'success') {
        // Create simple notification
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
        `;

        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    showSettings() {
        this.showNotification('Settings feature coming soon!', 'info');
    }

    setElementText(id, text) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = text;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    new PhishingDetectorDashboard();
});