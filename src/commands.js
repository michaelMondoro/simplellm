const vscode = require('vscode');
const { getUrl, parseSSE } = require('./utils');

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
            vscode.window.showErrorMessage(`(${response.status}) error querying model`); 
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    
        const data = await response.json();
        
        const eventId = data.event_id;
    
        // Read response
        const streamResponse = await fetch(`${url}/${eventId}`);
        if (!streamResponse.ok) {
            vscode.window.showErrorMessage(`(${response.status}) error reading response from model`); 
            throw new Error(`HTTP error! status: ${streamResponse.status}`);
        }
    
        let responses = [];
        for await (const chunk of streamResponse.body) {
            responses.push(new TextDecoder().decode(chunk));
        }
            let rawRes = responses.pop();
            let parsedRes = parseSSE(rawRes)
            console.log(parsedRes)
            return parsedRes[0].data[0];
    } catch (error) {
        console.error('Error:', error);
        vscode.window.showErrorMessage(error); 
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
        title: type == "CODE" ? "coding with robots 🤖 ..." : "asking the robots 🤖 ...",
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

module.exports = { ask, CODE_INSTRUCTION}