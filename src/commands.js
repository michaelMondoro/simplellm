const vscode = require('vscode');

CODE_INSTRUCTION = "you are an expert software developer that ONLY writes code. Nothing else."
ASK_INSTRUCTION = "please be brief"

async function askOllama(prompt) {
    if (!prompt) return;

    // Change model name as needed
    var outputChannel = null;
    const model = vscode.workspace.getConfiguration('simplellm').get("model");
    const url = "http://localhost:11434/api/generate";
    const body = JSON.stringify({ model, prompt });
	const decoder = new TextDecoder('utf-8');
    const emptySelection = vscode.window.activeTextEditor?.selection.isEmpty;

    if (emptySelection) {
        outputChannel = vscode.window.createOutputChannel('Ollama');
        outputChannel.show();
    }
    
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: body
        });
        
		const reader = res.body.getReader();
		var result = "";
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			var realVal = JSON.parse(decoder.decode(value, {stream: true}))["response"];
			if (emptySelection) outputChannel.replace(`[${model}] ${result}`);
            result += realVal;
		}
        
    } catch (err) {
        console.error("Error: " + (err.message || String(err)));
    }
    return result;
}

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
            const result = await askOllama(`${prompt} : ${type == "CODE" ? CODE_INSTRUCTION : ASK_INSTRUCTION}`);
            // vscode.window.showInformationMessage(`${result}`);    
            return result;
        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }        
    })
        
    
}

module.exports = { ask, askOllama, CODE_INSTRUCTION}