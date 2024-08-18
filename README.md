# LinkedIn Spam Killer

## Background

LinkedIn Spam Killer is a Chrome extension I developed to address the growing issue of spam messages on the LinkedIn platform. This project was inspired by a tweet from Eugene Ng (@Eug_Ng) highlighting the prevalence of spam on LinkedIn, a problem I frequently encountered myself.

Leveraging the power of AI language models, this extension aims to automatically identify and mark potential spam messages, helping users maintain a cleaner, more relevant inbox.

## Features

- Automatic spam detection using AI language models
- Visual marking of identified spam messages
- User-friendly interface integrated into LinkedIn's messaging page

## Installation

1. Clone this repository
2. Copy `config.example.js` to `config.js`
3. Edit `config.js` and replace the `llmEndpoint` with your own LLM API endpoint
4. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the directory containing the extension files

## Custom LLM Configuration

If you're using your own Language Model (LLM) for spam detection, you may need to adjust the request format in `background.js`. Follow these steps:

1. Open `background.js` in a text editor.

2. Locate the `fetch` call in the message listener.

3. Modify the `body` of the request to match your LLM's API requirements. The current format is:

   ```javascript
   body: JSON.stringify({
     "messages": [
       { "content": "You are a helpful assistant that identifies whether messages are spam or not.", "role": "system" },
       { "content": `Is the following message spam? Answer with a simple 'Yes' or 'Nope': ${request.text}`, "role": "user" }
     ]
   })

4. Adjust the response handling if necessary. The current code expects a response in this format:

    ```javascript
    {
        choices: [
            {
            message: {
                content: "Yes" or "Nope"
            }
            }
        ]
    }

5. Save your changes to `background.js`.

Remember to test your changes thoroughly to ensure compatibility with your chosen LLM.

## Usage
Once installed, navigate to your LinkedIn messages. The extension will add a "Spam Killer" menu to the page. Click "Kill Spam" to scan your messages for potential spam.

## Future Enhancements
I'm considering the following features for future versions:
- OpenAI API integration, allowing users to use their own API keys
- Automatic archiving of messages identified as spam (with considerations for message retrieval)
- Cloud-based automation (with appropriate security measures for LinkedIn credentials)

## Contributing
I welcome contributions to improve and expand the functionality of LinkedIn Spam Killer. Feel free to fork the repository, make your changes, and submit a pull request.

## Disclaimer
This extension is a personal project and is not affiliated with or endorsed by LinkedIn. Use it at your own discretion and always review messages before taking action.

## License
MIT License
