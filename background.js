chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'CHECK_SPAM') {
        fetch(config.llmEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "messages": [
                    { "content": "You are a helpful assistant that identifies whether messages are spam or not.", "role": "system" },
                    { "content": `Is the following message spam? Answer with a simple 'Yes' or 'Nope': ${request.text}`, "role": "user" }
                ]
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const spamDecision = data.choices[0].message.content.trim().toLowerCase();
            sendResponse({ isSpam: spamDecision === 'yes' });
        })
        .catch(error => {
            console.error("Error in background script:", error);
            sendResponse({ isSpam: false, error: error.message });
        });

        return true; // Keep the message channel open for async response
    }
});