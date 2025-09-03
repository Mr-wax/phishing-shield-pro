
class Debouncer {
    constructor(delay) {
        this.delay = delay;
        this.timeout = null;
    }

    debounce(callback) {
        clearTimeout(this.timeout);
        this.timeout = setTimeout(callback, this.delay);
    }
}

function createElement(tag, classes = [], attributes = {}) {
    const element = document.createElement(tag);
    if (classes.length) {
        element.classList.add(...classes);
    }
    Object.keys(attributes).forEach(key => {
        element.setAttribute(key, attributes[key]);
    });
    return element;
}

async function sendMessage(action, data = {}) {
    try {
        return await chrome.runtime.sendMessage({ action, ...data });
    } catch (error) {
        console.warn('Message sending failed:', error);
        return null;
    }
}