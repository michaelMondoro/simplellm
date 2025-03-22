const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { generate, ask, create, CODE_INSTRUCTION } = require('./commands.js');
const { checkConfig, getUrl } = require("./utils.js");

let hovers = {}

function activate(context) {
    let clear = vscode.commands.registerCommand('simplellm.clear', async function (line) {
        if (!line) vscode.window.showErrorMessage('nothing to clear');
        const key = hash(line)
        delete hovers[key];
        codeLensProvider.refresh();
    })

    let simplellmAsk = vscode.commands.registerCommand('simplellm.ask', async function () {
        try {
            checkConfig();
            let prompt = await vscode.window.showInputBox({
                prompt: "Enter your prompt for the LLM",
                placeHolder: "What would you like to ask?"
            });
        
            if (prompt) {
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Window,
                    title: "Asking...",
                    cancellable: false
                }, async (progress) => {
                    const position = vscode.window.activeTextEditor?.selection.active;
                    const selection = vscode.window.activeTextEditor?.selection;
                    const lineText = vscode.window.activeTextEditor?.document.lineAt(selection.start.line).text;

                    const result = await ask(prompt);
                    
                    showHover(selection.start.line, selection.start, result);
                    codeLensProvider.refresh();
                });
            }
        } catch (error) {
            console.error(error);
        }
    })

    let codeLensProvider = new MyCodeLensProvider();
    // Register CodeLens providers for accessing AI 
    let codeLensProviderDisposable = vscode.languages.registerCodeLensProvider('*', codeLensProvider)
    
    // Register hover provider for displaying AI responses
    let hoverProvider = vscode.languages.registerHoverProvider('*', {
        provideHover(document, position) {
            const lineText = document.lineAt(position.line).text;
            const key = hash(lineText);
            const hoverData = hovers[key];
            if (hoverData) {
                markdown = new vscode.MarkdownString(`<span style="color:var(--vscode-charts-green);">AI Context</span>  \\\n${hoverData.data}`);
                markdown.isTrusted = true;
                return new vscode.Hover(markdown);
            }
        }
    })

    // Register function to manually show hover
    let showContext = vscode.commands.registerCommand('simplellm.showContext',(line, pos, result) => {
        if (!line) {
            vscode.window.showErrorMessage("nothing to show"); 
            return;
        }
        showHover(line,pos,result);
    })

    context.subscriptions.push(simplellmAsk);
    context.subscriptions.push(clear);
    context.subscriptions.push(showContext);
    context.subscriptions.push(codeLensProviderDisposable);
    context.subscriptions.push(hoverProvider);

}


class MyCodeLensProvider {
    constructor() {
        this._onDidChangeCodeLenses = new vscode.EventEmitter();
    }

    get onDidChangeCodeLenses() {
        return this._onDidChangeCodeLenses.event;
    }

    async provideCodeLenses(document, token) {
        const codeLenses = [];
        for (let i = 0; i < document.lineCount; i++) {
            let line = document.lineAt(i).text;
            let key = hash(line);
            if (Object.keys(hovers).includes(key)) {
                const codeLensRange = document.lineAt(i).range;
                codeLenses.push(new vscode.CodeLens(codeLensRange, {
                    title: "AI Context",
                    command: "simplellm.showContext",
                    arguments: [i, codeLensRange.start, hovers[key].data]
                }));

                codeLenses.push(new vscode.CodeLens(codeLensRange, {
                    title: "Clear",
                    command: "simplellm.clear",
                    arguments: [line]
                }));
            }
        }
        return codeLenses;
    }

    // Method to manually trigger a refresh
    refresh() {
        this._onDidChangeCodeLenses.fire();
    }
}

function hash(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

function showHover(lineNum, position, result) {
    const lineText = vscode.window.activeTextEditor.document.lineAt(lineNum).text;
    const key = hash(lineText);
    hovers[key] = {data: result, position: position};
    vscode.window.activeTextEditor.selection = new vscode.Selection(position, position);
    vscode.commands.executeCommand('editor.action.showHover');
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
}
