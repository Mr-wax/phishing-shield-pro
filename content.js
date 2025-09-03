// Content script for Gmail phishing detection
class GmailPhishingDetector {
	constructor() {
		this.currentEmailId = null;
		this.isExtensionActive = true;
		this.isScanning = false;
		this.retryCount = 0;
		this.maxRetries = 3;
		this.debounceTimer = null;
		this.emailCheckInterval = null;
		this.init();
	}

	init() {
		console.log('Phishing Detector initialized for Gmail');
		this.setupObservers();
		this.setupHeartbeat();
		
		setTimeout(() => this.checkExtensionStatus(), 1000);
	}

	startScanning() {
		this.isScanning = true;
		
		if (this.isEmailOpen()) {
			this.analyzeCurrentEmail(true);
		}
		console.log('Phishing detection scanning started - analyzed current email');
		return true;
	}

	stopScanning() {
		this.isScanning = false;
		console.log('Phishing detection scanning stopped');
		return true;
	}

	isEmailOpen() {
		const emailContentSelectors = [
			
			'[aria-label="Email content"]',
			'[data-message-id]',
			'[role="listitem"][aria-expanded="true"]',
			'[data-test-id="message-body"]',
			
			
			'.a3s.aiL',
			'.ii.gt',
			'.nH > .no',
			'.adn.ads',
			
			
			'[aria-label="Message body"]',
			'.aHU',
			'.msg',
			'.email-content',
			
			
			'[data-test-id="message-header"]',
			'.hq',
			'.gD',
			'.go'
		];

		for (const selector of emailContentSelectors) {
			const element = document.querySelector(selector);
			if (element && element.textContent && element.textContent.trim().length > 50) {
				return true;
			}
		}

		const text = document.body.textContent || '';
		const patterns = [
			/dear\s+.+/i,
			/hello\s+.+/i,
			/thank you/i,
			/best regards/i,
			/sincerely/i,
			/@\w+\.\w+/, 
			/http:\/\/|https:\/\// 
		];
		if (patterns.some(pattern => pattern.test(text))) {
			return true;
		}

		return false;
	}
	setupObservers() {
		
		let lastUrl = location.href;
		const urlObserver = new MutationObserver(() => {
			const url = location.href;
			if (url !== lastUrl) {
				lastUrl = url;
				
			}
		});
		
		try {
			urlObserver.observe(document, { subtree: true, childList: true });
		} catch (error) {
			console.log('URL observer setup failed:', error);
		}

		
		this.observeEmailContent();
	}

	setupHeartbeat() {
		setInterval(() => {
			this.checkExtensionStatus();
		}, 30000);
	}

	async checkExtensionStatus() {
		try {
			const response = await new Promise((resolve, reject) => {
				chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
					if (chrome.runtime.lastError) {
						reject(chrome.runtime.lastError);
					} else {
						resolve(response);
					}
				});
			});
			
			this.isExtensionActive = true;
			this.retryCount = 0;
			return true;
			
		} catch (error) {
			console.log('Extension context invalidated');
			this.isExtensionActive = false;
			return false;
		}
	}

	debounce(func, delay) {
		clearTimeout(this.debounceTimer);
		this.debounceTimer = setTimeout(() => func(), delay);
	}

	async analyzeCurrentEmail(force = false) {
		if (!this.isExtensionActive) {
			return;
		}
		if (!force && !this.isEmailOpen()) {
			return;
		}

		const emailData = this.extractEmailData();
		if (!emailData) return;

		this.currentEmailId = emailData.id;
		
		try {
			const result = await this.sendMessageWithRetry('analyzeEmail', { emailData });
			
			if (result && !result.error) {
				this.displayResults(result);
			}
		} catch (error) {
			console.log('Email analysis failed:', error.message);
		}
	}

	async sendMessageWithRetry(action, data = {}) {
		for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
			try {
				const response = await new Promise((resolve, reject) => {
					chrome.runtime.sendMessage({ action, ...data }, (response) => {
						if (chrome.runtime.lastError) {
							reject(new Error(chrome.runtime.lastError.message));
						} else {
							resolve(response);
						}
					});
				});

				this.retryCount = 0;
				return response;

			} catch (error) {
				if (attempt === this.maxRetries) {
					throw error;
				}
				await this.delay(1000 * attempt);
			}
		}
	}

	delay(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	extractEmailData() {
		try {
			// Only extract the currently visible/expanded email
			const emailContent = this.getCurrentEmailText();
			if (!emailContent || emailContent.length < 10) return null;

			return {
				id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				subject: this.getCurrentEmailSubject(),
				sender: this.getCurrentEmailSender(),
				text: emailContent,
				links: this.getCurrentEmailLinks(),
				timestamp: new Date().toISOString()
			};
		} catch (error) {
			console.log('Error extracting email data:', error);
			return null;
		}
	}

	getCurrentEmailSubject() {
		const currentEmailSelectors = [
			'[role="listitem"][aria-expanded="true"] [data-test-id="message-subject"]',
			'[role="listitem"][aria-expanded="true"] [data-thread-perm-id]',
			'[role="listitem"][aria-expanded="true"] .hP',
			'[role="listitem"][aria-expanded="true"] .ha > .h7',
			
			'[data-test-id="message-subject"]',
			'[data-thread-perm-id]',
			'.hP',
			'.ha > .h7'
		];
		
		
		for (const selector of currentEmailSelectors) {
			const element = document.querySelector(selector);
			if (element?.textContent?.trim()) {
				
				const parentEmail = element.closest('[role="listitem"]');
				if (!parentEmail || parentEmail === element.closest('[role="listitem"] [role="listitem"]')) {
					return element.textContent.trim();
				}
			}
		}
		
		
		const allSubjects = document.querySelectorAll('[data-test-id="message-subject"], [data-thread-perm-id], .hP, .ha > .h7');
		if (allSubjects.length > 0) {
			const lastSubject = allSubjects[allSubjects.length - 1];
			const isNested = lastSubject.closest('[role="listitem"] [role="listitem"]');
			if (!isNested && lastSubject.textContent?.trim()) {
				return lastSubject.textContent.trim();
			}
		}
		
		return 'No subject';
	}

	getCurrentEmailSender() {
		
		const currentEmailSelectors = [
			
			'[role="listitem"][aria-expanded="true"] [data-test-id="message-from"]',
			'[role="listitem"][aria-expanded="true"] .gD',
			'[role="listitem"][aria-expanded="true"] .go',
			'[role="listitem"][aria-expanded="true"] .g2',
			
			
			'[data-test-id="message-from"]',
			'.gD',
			'.go',
			'.g2'
		];
		
		
		for (const selector of currentEmailSelectors) {
			const element = document.querySelector(selector);
			if (element?.textContent?.trim()) {
				
				const parentEmail = element.closest('[role="listitem"]');
				if (!parentEmail || parentEmail === element.closest('[role="listitem"] [role="listitem"]')) {
					const text = element.textContent.trim();
					return text.replace(/^From:\s*/i, '');
				}
			}
		}
		
		
		const allSenders = document.querySelectorAll('[data-test-id="message-from"], .gD, .go, .g2');
		if (allSenders.length > 0) {
			const lastSender = allSenders[allSenders.length - 1];
			const isNested = lastSender.closest('[role="listitem"] [role="listitem"]');
			if (!isNested && lastSender.textContent?.trim()) {
				const text = lastSender.textContent.trim();
				return text.replace(/^From:\s*/i, '');
			}
		}
		
		return 'Unknown sender';
	}

	getCurrentEmailText() {
		
		const contentSelectors = [
			'[role="main"] [aria-label="Email content"]',
			'.a3s.aiL',
			'.ii.gt',
			'[data-message-id]',
			'[role="listitem"][aria-expanded="true"]',
			'.nH > .no',
			'.adn.ads',
			'[aria-label="Message body"]',
			'.aHU',
			'.msg'
		];
		
		
		for (const selector of contentSelectors) {
			const elements = document.querySelectorAll(selector);
			if (elements.length > 0) {
				
				const element = elements[elements.length - 1];
				if (element?.textContent?.trim()) {
					return element.textContent.trim();
				}
			}
		}
		
		
		const potentialElements = document.querySelectorAll('div, p, span');
		let bestElement = null;
		let maxLength = 0;
		
		for (const element of potentialElements) {
			if (element.textContent && element.textContent.length > maxLength) {
				maxLength = element.textContent.length;
				bestElement = element;
			}
		}
		
		return bestElement ? bestElement.textContent.trim() : '';
	}

	getCurrentEmailLinks() {
		try {
			
			const contentArea = document.querySelector('[role="main"]') || document.body;
			return Array.from(contentArea.querySelectorAll('a[href]'))
				.map(link => link.href)
				.filter(href => href && 
					href !== '#' && 
					!href.startsWith('javascript:') &&
					!href.includes('mail.google.com') &&
					!href.includes('accounts.google.com')
				)
				.slice(0, 20);
		} catch (error) {
			return [];
		}
	}

	displayResults(analysis) {
		this.removeExistingWarnings();
		
		if (analysis.isPhishing) {
			this.showThreatWarning(analysis);
		} else {
			this.showSafeIndicator();
		}
	}

	showThreatWarning(analysis) {
		const warning = this.createElement('div', ['phishing-warning', 'threat-detected']);
		
		warning.innerHTML = `
			<div class=\"warning-header\">
				<span class=\"warning-icon\">⚠️</span>
				<span class=\"warning-title\">Phishing Threat Detected!</span>
			</div>
			<div class=\"warning-content\">
				<p>Confidence: ${Math.round(analysis.confidence * 100)}%</p>
				${analysis.reasons.length > 0 ? `
					<ul class=\"reasons-list\">
						${analysis.reasons.map(reason => `<li>${reason}</li>`).join('')}
					</ul>
				` : ''}
			</div>
			<div class=\"warning-actions\">
				<button class=\"action-btn block-btn\">Block Sender</button>
				<button class=\"action-btn delete-btn\">Delete Email</button>
				<button class=\"action-btn ignore-btn\">Ignore</button>
			</div>
		`;

		this.addWarningToUI(warning);
		this.setupActionHandlers(warning, analysis);
	}

	showSafeIndicator() {
		const indicator = this.createElement('div', ['phishing-warning', 'safe-email']);
		indicator.innerHTML = `
			<div class=\"warning-header safe\">
				<span class=\"warning-icon\">✅</span>
				<span class=\"warning-title\">Email appears safe</span>
			</div>
		`;
		this.addWarningToUI(indicator);
	}

	addWarningToUI(warningElement) {
		// Try multiple insertion points
		const insertionPoints = [
			document.querySelector('[role=\"main\"] > div:first-child'),
			document.querySelector('.ha > .h7'),
			document.querySelector('.iH > .nH > .no'),
			document.querySelector('.adn.ads'),
			document.querySelector('[data-test-id=\"message-header\"]'),
			document.querySelector('.aHS-wn') // Gmail header area
		];

		for (const point of insertionPoints) {
			if (point && point.parentNode) {
				point.parentNode.insertBefore(warningElement, point.nextSibling);
				return;
			}
		}

		// Fallback to top of main content
		const main = document.querySelector('[role="main"]');
		if (main) {
			main.insertBefore(warningElement, main.firstChild);
		}
	}

	setupActionHandlers(warningElement, analysis) {
		const blockBtn = warningElement.querySelector('.block-btn');
		const deleteBtn = warningElement.querySelector('.delete-btn');
		const ignoreBtn = warningElement.querySelector('.ignore-btn');

		if (blockBtn) {
			blockBtn.addEventListener('click', () => this.handleBlockAction(analysis));
		}
		if (deleteBtn) {
			deleteBtn.addEventListener('click', () => this.handleDeleteAction(analysis));
		}
		if (ignoreBtn) {
			ignoreBtn.addEventListener('click', () => warningElement.remove());
		}
	}

	async handleBlockAction(analysis) {
		try {
			await this.sendMessageWithRetry('blockEmail', { emailId: this.currentEmailId });
			this.showActionFeedback('Sender blocked successfully');
		} catch (error) {
			this.showActionFeedback('Failed to block sender', 'error');
		}
	}

	async handleDeleteAction(analysis) {
		try {
			await this.sendMessageWithRetry('deleteEmail', { emailId: this.currentEmailId });
			this.showActionFeedback('Email deleted successfully');
		} catch (error) {
			this.showActionFeedback('Failed to delete email', 'error');
		}
	}

	showActionFeedback(message, type = 'success') {
		const feedback = this.createElement('div', ['action-feedback', type]);
		feedback.textContent = message;
		document.body.appendChild(feedback);
		
		setTimeout(() => feedback.remove(), 3000);
	}

	removeExistingWarnings() {
		document.querySelectorAll('.phishing-warning').forEach(warning => warning.remove());
	}

	observeEmailContent() {
		const observer = new MutationObserver((mutations) => {
			// Don't auto-scan on content changes
		});

		try {
			observer.observe(document.body, {
				childList: true,
				subtree: true,
				attributes: true,
				characterData: true
			});
		} catch (error) {
			console.log('Content observer setup failed:', error);
		}
	}

	createElement(tag, classes = [], attributes = {}) {
		const element = document.createElement(tag);
		if (classes.length) element.classList.add(...classes);
		Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
		return element;
	}

	
	destroy() {
		this.removeExistingWarnings();
	}
}


function initializeDetector() {
	if (!window.location.hostname.includes('mail.google.com')) return;

	const initDetector = () => {
		try {
			window._phishingDetector = new GmailPhishingDetector();
		} catch (error) {
			console.error('Failed to initialize detector:', error);
		
			setTimeout(initDetector, 3000);
		}
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => setTimeout(initDetector, 2000));
	} else {
		setTimeout(initDetector, 2000);
	}
}


initializeDetector();


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	const detector = window._phishingDetector;
	switch (request.action) {
		case 'checkEmailOpen':
			sendResponse({ isEmailOpen: !!detector && detector.isEmailOpen() });
			break;
		case 'startScanning':
			if (detector) {
				const success = detector.startScanning();
				sendResponse({ success });
			} else {
				sendResponse({ success: false, error: 'Detector not initialized' });
			}
			break;
		case 'stopScanning':
			if (detector) {
				const success = detector.stopScanning();
				sendResponse({ success });
			} else {
				sendResponse({ success: false, error: 'Detector not initialized' });
			}
			break;
		case 'manualScan':
			if (detector) {
				detector.analyzeCurrentEmail(true)
					.then(() => sendResponse({ success: true }))
					.catch(error => sendResponse({ success: false, error: error.message }));
				return true;
			} else {
				sendResponse({ success: false, error: 'Detector not initialized' });
			}
			break;
		default:
			sendResponse({ error: 'Unknown action' });
	}
});
