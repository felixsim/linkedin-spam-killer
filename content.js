let processedThreads = {};
let isProcessing = false;
let processedThreadsCount = 0;

// Load processed threads from storage
chrome.storage.local.get(['processedThreads'], function(result) {
    if (result.processedThreads) {
        processedThreads = JSON.parse(result.processedThreads);
        processedThreadsCount = Object.keys(processedThreads).length;
        console.log(`Loaded ${processedThreadsCount} processed threads from storage.`);
    }
});

function createSpamKillerMenu() {
    const menu = document.createElement('div');
    menu.id = 'spam-killer-menu';
    menu.innerHTML = `
        <button id="kill-spam-button">Kill Spam</button>
        <button id="stop-button">Stop</button>
        <button id="clear-history-button">Clear History</button>
        <div id="processed-threads-counter">Processed Threads: ${processedThreadsCount}/${getThreads().length}</div>
    `;
    menu.style.cssText = `
        position: fixed;
        top: 60px;
        right: 20px;
        background-color: white;
        border: 1px solid #ccc;
        border-radius: 5px;
        padding: 10px;
        z-index: 9999;
    `;
    return menu;
}

function insertSpamKillerMenu() {
    if (document.getElementById('spam-killer-menu')) return;
    
    const targetContainer = document.body;
    if (targetContainer) {
        targetContainer.appendChild(createSpamKillerMenu());
        console.log("Spam Killer menu inserted.");
        attachMenuListeners();
    } else {
        console.log("Target container for menu not found. Retrying...");
        setTimeout(insertSpamKillerMenu, 1000);
    }
}

function attachMenuListeners() {
    document.getElementById('kill-spam-button').addEventListener('click', () => waitForThreadsAndProcess(3));
    document.getElementById('stop-button').addEventListener('click', stopProcessing);
    document.getElementById('clear-history-button').addEventListener('click', clearProcessedThreadsHistory);
}

function updateMenuCounter(processed, total) {
    const counter = document.getElementById('processed-threads-counter');
    if (counter) {
        counter.textContent = `Processed: ${processed}/${Math.max(processed, total)}`;
    }
}

function clearProcessedThreadsHistory() {
    processedThreads = {};
    processedThreadsCount = 0;
    chrome.storage.local.remove('processedThreads', function() {
        console.log('Processed threads history cleared.');
        updateMenuCounter(0, 0);
        removeAllMarkers();
    });
}

function stopProcessing() {
    isProcessing = false;
    console.log('Processing stopped by user.');
}

function markThread(threadUrl, isSpam) {
    console.log(`Marking thread ${threadUrl} as ${isSpam ? 'spam' : 'not spam'}`);
    const thread = document.querySelector(`a[href="${threadUrl}"]`);
    if (!thread) {
        console.log(`Thread with URL ${threadUrl} not found. Unable to mark.`);
        return;
    }

    let marker = thread.querySelector('.spam-marker');
    if (!marker) {
        console.log('Creating new marker');
        marker = document.createElement('span');
        marker.className = 'spam-marker';
        marker.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            font-weight: bold;
            font-size: 14px;
            z-index: 1000;
        `;
        thread.style.position = 'relative';
        thread.appendChild(marker);
    } else {
        console.log('Updating existing marker');
    }

    marker.textContent = isSpam ? 'SPAM' : '✅';
    marker.style.color = isSpam ? 'red' : 'green';
    console.log('Marker updated');
}

function removeAllMarkers() {
    document.querySelectorAll('.spam-marker').forEach(marker => marker.remove());
}

function getThreads() {
    const threads = Array.from(document.querySelectorAll('a.msg-conversation-listitem__link'));
    console.log(`Found ${threads.length} threads using selector: a.msg-conversation-listitem__link`);
    return threads;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function processMessages() {
    let threads = getThreads();
    let totalThreads = threads.length;
    let processedCount = Object.keys(processedThreads).length;

    console.log(`Found ${totalThreads} threads to process. ${processedCount} already processed.`);
    updateMenuCounter(processedCount, totalThreads);
    isProcessing = true;

    for (let threadIndex = 0; threadIndex < totalThreads; threadIndex++) {
        if (!isProcessing) {
            console.log('Processing stopped.');
            break;
        }

        const thread = threads[threadIndex];
        const threadUrl = thread.getAttribute('href');

        if (!threadUrl) {
            console.log(`Thread ${threadIndex + 1} has no valid URL. Skipping.`);
            continue;
        }

        if (processedThreads.hasOwnProperty(threadUrl)) {
            console.log(`Thread ${threadIndex + 1} (URL: ${threadUrl}) already processed. Skipping.`);
            continue;
        }

        try {
            thread.click();
            await sleep(2000);

            const messages = document.querySelectorAll('.msg-s-event-listitem__message-bubble');
            const oldestMessage = messages[messages.length - 1];

            if (oldestMessage) {
                const messageText = oldestMessage.textContent.trim();

                const isSpam = await checkForSpamInBackground(messageText);

                processedThreads[threadUrl] = isSpam;
                markThread(threadUrl, isSpam);
                processedCount++;
                updateMenuCounter(processedCount, totalThreads);

                // Save processed threads to storage
                chrome.storage.local.set({processedThreads: JSON.stringify(processedThreads)});
            } else {
                console.log(`No messages found in thread ${threadUrl}. Skipping.`);
            }
        } catch (error) {
            console.error(`Stopping further processing due to an error with thread ${threadUrl}:`, error);
            break;
        }

        // Recalculate total threads in case new ones have appeared
        threads = getThreads();
        totalThreads = threads.length;

        await sleep(1000); // 1 second delay between threads
    }

    console.log(`Finished processing. ${processedCount} threads were processed this run.`);
    isProcessing = false;
}

function checkForSpamInBackground(messageText) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            { type: 'CHECK_SPAM', text: messageText },
            response => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response.isSpam);
                }
            }
        );
    });
}

function waitForThreadsAndProcess(retries = 3) {
    const threads = getThreads();
    const newThreads = threads.filter(thread => !processedThreads.hasOwnProperty(thread.getAttribute('href')));
    
    if (newThreads.length === 0) {
        alert("No new threads to process. All visible threads have already been checked.");
        return;
    }

    if (threads.length === 0 && retries > 0) {
        console.log(`No threads found. Retrying in 2 seconds... (${retries} retries left)`);
        setTimeout(() => waitForThreadsAndProcess(retries - 1), 2000);
    } else if (threads.length === 0) {
        console.log("No threads found after all retries. Please check the page structure.");
    } else {
        processMessages();
    }
}

function logPageState() {
    console.log('Current URL:', window.location.href);
    console.log('Body classes:', document.body.className);
    console.log('Visible text:', document.body.innerText.slice(0, 200) + '...');
    console.log('Number of <a> tags:', document.getElementsByTagName('a').length);
}

function checkForIframes() {
    const iframes = document.getElementsByTagName('iframe');
    for (let iframe of iframes) {
        console.log('Found iframe:', iframe.src);
        if (iframe.contentDocument) {
            console.log('Iframe content:', iframe.contentDocument.body.innerHTML.slice(0, 200) + '...');
        }
    }
}

function isOnLinkedInMessagingPage() {
    return window.location.href.includes('linkedin.com/messaging');
}

function initializeExtension() {
    console.log("Initializing LinkedIn Spam Killer extension...");
    logPageState();
    checkForIframes();

    if (!isOnLinkedInMessagingPage()) {
        console.log("Not on LinkedIn messaging page. Extension will not activate.");
        return;
    }

    insertSpamKillerMenu();
    
    // Mark previously processed threads
    Object.entries(processedThreads).forEach(([threadUrl, isSpam]) => markThread(threadUrl, isSpam));
    
    // Set up MutationObserver to watch for dynamically loaded content
    const observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                console.log('New content added to the page');
                getThreads(); // This will log if new threads are found
                break;
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// Wait for the page to be fully loaded before initializing
window.addEventListener('load', () => {
    console.log("Page fully loaded. Setting up Spam Killer...");
    setTimeout(initializeExtension, 2000);
});

// Use event delegation for dynamically loaded content
document.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('msg-conversation-listitem__link')) {
        const threadUrl = e.target.getAttribute('href');
        if (threadUrl && processedThreads.hasOwnProperty(threadUrl)) {
            markThread(threadUrl, processedThreads[threadUrl]);
        }
    }
});