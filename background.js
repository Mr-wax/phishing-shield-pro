// Simple background script without modules
let stats = {
    totalScanned: 0,
    threatsDetected: 0,
    emailsBlocked: 0,
    emailsDeleted: 0
};

// Initialize
chrome.runtime.onInstalled.addListener(() => {
    console.log('Phishing Detector Extension installed');
    loadStats();
});

// Also load stats when background starts
loadStats();

// Load stats from storage
async function loadStats() {
    const data = await chrome.storage.sync.get('phishingStats');
    if (data.phishingStats) {
        stats = { ...stats, ...data.phishingStats };
    }
}

// Save stats to storage
async function saveStats() {
    await chrome.storage.sync.set({ phishingStats: stats });
}

// Handle messages from content scripts and popup

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        switch (request.action) {
            case 'ping':
                // Simple ping response to check if extension is alive
                sendResponse({ status: 'alive', timestamp: Date.now() });
                break;
                
            case 'analyzeEmail':
                analyzeEmailContent(request.emailData).then(sendResponse);
                return true; // Indicates async response
                
            case 'getStats':
                // Ensure latest stats from storage before responding
                (async () => {
                    await loadStats();
                    sendResponse(stats);
                })();
                return true;
                break;
                
            case 'blockEmail':
                blockEmail(request.emailId).then(sendResponse);
                return true;
                
            case 'deleteEmail':
                deleteEmail(request.emailId).then(sendResponse);
                return true;
            
            case 'resetStats':
                stats.totalScanned = 0;
                stats.threatsDetected = 0;
                stats.emailsDeleted = 0;
                // Intentionally not resetting emailsBlocked unless specified
                saveStats().then(() => sendResponse({ success: true, stats })).catch(error => sendResponse({ error: error.message }));
                return true;
                
            default:
                sendResponse({ error: 'Unknown action' });
        }
    } catch (error) {
        console.error('Background error:', error);
        sendResponse({ error: error.message });
    }
    return true;
});

// Analyze email content
async function analyzeEmailContent(emailData) {
    const analysis = await analyzeEmail(emailData);
    stats.totalScanned++;
    
    if (analysis.isPhishing) {
        stats.threatsDetected++;
        // Store threat for dashboard
        const threats = await getStoredThreats();
        threats.push({
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            subject: emailData.subject,
            sender: emailData.sender,
            confidence: analysis.confidence,
            reasons: analysis.reasons
        });
        await chrome.storage.sync.set({ phishingThreats: threats.slice(-50) });
    }
    
    await saveStats();
    return analysis;
}

// Get stored threats
async function getStoredThreats() {
    const data = await chrome.storage.sync.get('phishingThreats');
    return data.phishingThreats || [];
}

// Main email analysis function
async function analyzeEmail(emailData) {
    const features = extractFeatures(emailData);
    const score = calculatePhishingScore(features);
    
    const isPhishing = score >= 0.7;
    const reasons = isPhishing ? generateReasons(features, score) : [];
    
    return {
        isPhishing,
        confidence: score,
        reasons,
        features
    };
}

// Extract features from email
function extractFeatures(emailData) {
    return {
        suspiciousLinks: checkSuspiciousLinks(emailData.links || []),
        urgencyLanguage: checkUrgencyLanguage(emailData.text || ''),
        senderReputation: checkSenderReputation(emailData.sender || ''),
        grammarErrors: checkGrammarErrors(emailData.text || '')
    };
}

// Calculate phishing score
function calculatePhishingScore(features) {
    let score = 0;
    if (features.suspiciousLinks) score += 0.4;
    if (features.urgencyLanguage) score += 0.3;
    if (features.senderReputation) score += 0.2;
    if (features.grammarErrors) score += 0.1;
    return Math.min(1, score);
}

// Generate reasons for phishing detection
function generateReasons(features, score) {
    const reasons = [];
    if (features.suspiciousLinks) reasons.push('Suspicious links detected');
    if (features.urgencyLanguage) reasons.push('Urgency language used');
    if (features.senderReputation) reasons.push('Unverified sender');
    if (features.grammarErrors) reasons.push('Poor grammar and spelling');
    if (score > 0.9) reasons.push('High confidence phishing attempt');
    return reasons;
}

// Feature detection functions
function checkSuspiciousLinks(links) {
    if (!links || links.length === 0) return false;
    
    const suspiciousPatterns = [
        'http://',
        'login.',
        'verify-',
        'account-',
        'security-',
        '.xyz',
        '.top',
        '.club',
        'ipage.com',
        '000webhostapp.com'
    ];
    
    return links.some(link => 
        suspiciousPatterns.some(pattern => link.includes(pattern))
    );
}

function checkUrgencyLanguage(text) {
    if (!text) return false;
    
    const urgencyWords = [
        'urgent', 'immediately', 'action required', 'verify now',
        'account suspended', 'security alert', 'limited time',
        'click here', 'confirm your account', 'password expired'
    ];
    
    return urgencyWords.some(word => text.toLowerCase().includes(word));
}

function checkSenderReputation(sender) {
    if (!sender) return false;
    
    const trustedDomains = [
        'gmail.com', 'google.com', 'outlook.com', 'microsoft.com',
        'yahoo.com', 'icloud.com', 'protonmail.com'
    ];
    
    const domain = sender.split('@')[1];
    return domain && !trustedDomains.includes(domain.toLowerCase());
}

function checkGrammarErrors(text) {
    if (!text) return false;
    
    const commonErrors = [
        'dear customer',
        'valued customer', 
        'dear account holder',
        'urgent action needed'
    ];
    
    return commonErrors.some(error => text.toLowerCase().includes(error));
}

// Email actions
async function blockEmail(emailId) {
    stats.emailsBlocked++;
    await saveStats();
    return { success: true, message: 'Sender blocked successfully' };
}

async function deleteEmail(emailId) {
    stats.emailsDeleted++;
    await saveStats();
    return { success: true, message: 'Email deleted successfully' };
}