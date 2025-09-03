export async function analyzeEmail(emailData) {
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

function extractFeatures(emailData) {
    return {
        suspiciousLinks: checkSuspiciousLinks(emailData.links || []),
        urgencyLanguage: checkUrgencyLanguage(emailData.text || ''),
        senderReputation: checkSenderReputation(emailData.sender || ''),
        domainAge: checkDomainAge(emailData.links || []),
        grammarErrors: checkGrammarErrors(emailData.text || ''),
        attachmentRisk: checkAttachments(emailData.attachments || []),
        socialEngineering: checkSocialEngineering(emailData.text || '')
    };
}

function calculatePhishingScore(features) {
    let score = 0;
    
    // Weighted scoring system
    const weights = {
        suspiciousLinks: 0.25,
        urgencyLanguage: 0.20,
        senderReputation: 0.15,
        domainAge: 0.15,
        grammarErrors: 0.10,
        attachmentRisk: 0.10,
        socialEngineering: 0.05
    };

    Object.keys(features).forEach(key => {
        if (features[key]) {
            score += weights[key] || 0;
        }
    });

    return Math.min(1, score);
}

function generateReasons(features, score) {
    const reasons = [];
    
    if (features.suspiciousLinks) reasons.push('Suspicious links detected');
    if (features.urgencyLanguage) reasons.push('Urgency language used');
    if (features.senderReputation) reasons.push('Unverified sender');
    if (features.domainAge) reasons.push('Newly registered domain');
    if (features.grammarErrors) reasons.push('Poor grammar and spelling');
    if (features.attachmentRisk) reasons.push('Suspicious attachments');
    if (features.socialEngineering) reasons.push('Social engineering tactics detected');
    
    if (score > 0.9) reasons.push('High confidence phishing attempt');
    
    return reasons;
}

// Feature detection functions
function checkSuspiciousLinks(links) {
    const suspiciousPatterns = [
        /http:\/\//i,
        /login\.\w+\.\w+/i,
        /verify-|account-|security-/i,
        /\.(xyz|top|club|site|online)$/i,
        /ipage\.com|000webhostapp\.com/i
    ];
    
    return links.some(link => 
        suspiciousPatterns.some(pattern => pattern.test(link))
    );
}

function checkUrgencyLanguage(text) {
    const urgencyWords = [
        'urgent', 'immediately', 'action required', 'verify now',
        'account suspended', 'security alert', 'limited time',
        'click here', 'confirm your account', 'password expired'
    ];
    
    return urgencyWords.some(word => 
        text.toLowerCase().includes(word.toLowerCase())
    );
}

function checkSenderReputation(sender) {
    const trustedDomains = [
        'gmail.com', 'google.com', 'outlook.com', 'microsoft.com',
        'yahoo.com', 'icloud.com', 'protonmail.com'
    ];
    
    const domain = sender.split('@')[1];
    return !trustedDomains.includes(domain?.toLowerCase());
}

function checkDomainAge(links) {
    // Simulate domain age check - in real implementation, use WHOIS API
    return Math.random() < 0.3; // 30% chance for demo
}

function checkGrammarErrors(text) {
    const commonErrors = [
        /dear customer/i,
        /valued customer/i,
        /dear account holder/i,
        /urgent action needed/i
    ];
    
    return commonErrors.some(pattern => pattern.test(text));
}

function checkAttachments(attachments) {
    const riskyTypes = ['.exe', '.scr', '.bat', '.cmd', '.js', '.vbs'];
    return attachments.some(attachment => 
        riskyTypes.some(type => attachment.toLowerCase().endsWith(type))
    );
}

function checkSocialEngineering(text) {
    const socialEngineeringPatterns = [
        /won.*prize/i,
        /inheritance/i,
        /lottery/i,
        /nigerian.*prince/i,
        /bank.*details/i
    ];
    
    return socialEngineeringPatterns.some(pattern => pattern.test(text));
}