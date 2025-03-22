const vscode = require('vscode');
const { getUrl } = require('./utils');

CODE_INSTRUCTION = "you are an expert software developer that ONLY writes code. Nothing else."
ASK_INSTRUCTION = "please be brief"

/**
 * Gets the current text selection to use for context in LLM prompt
 * @returns current selected text as context
 */
function getContext() {
    const editor = vscode.window.activeTextEditor;
    if (editor && !editor.selection.isEmpty) {
        const selection = editor.selection;
        const context = editor.document.getText(selection);
        return context;
    } 
}

/**
 * Send API request to HuggingFace model
 * @param {string} message 
 * @param {string} url 
 * @returns model response
 */
async function chat(message, url) {
    try {
        // initiate query
        const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            data: [message, '']
        })
    });
  
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
  
    const data = await response.json();
    const eventId = data.event_id;
  
    // Read response
    const streamResponse = await fetch(`${url}/${eventId}`);
    if (!streamResponse.ok) {
        throw new Error(`HTTP error! status: ${streamResponse.status}`);
    }
  
    let result = '';
    for await (const chunk of streamResponse.body) {
        result += new TextDecoder().decode(chunk);
    }
        let resData = JSON.parse(result.slice(result.indexOf('['), result.length));
        return resData[0];
    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Ask the model a question with selected text as context
 * @param {string} prompt 
 */
async function ask(prompt, type) {
    const context = getContext();
    if (context) prompt = `${context} : ${prompt}`;
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Window,
        title: "asking...",
        cancellable: false
    }, async () => {
        try {
            const result = await chat(`${prompt} : ${type == "CODE" ? CODE_INSTRUCTION : ASK_INSTRUCTION}`, getUrl());
            // vscode.window.showInformationMessage(`${result}`);    
            return result;
        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }        
    })
        
    
}

module.exports = { ask, generate, CODE_INSTRUCTION}