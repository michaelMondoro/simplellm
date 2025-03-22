const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { generate, ask, create, CODE_INSTRUCTION } = require('./commands.js');
const { checkConfig, getUrl, hash } = require("./utils.js");

let hovers = {}

function activate(context) {
    let codeLensProvider = new MyCodeLensProvider();

    let simplellmAsk = vscode.commands.registerCommand('simplellm.ask', async function () {
        try {
            checkConfig();
            let prompt = await vscode.window.showInputBox({
                prompt: "Enter your prompt for the LLM",
                placeHolder: "What would you like to ask?"
            });
        
            if (prompt) {
                const selection = vscode.window.activeTextEditor?.selection;
                const startLine = selection.start.line;
                const endLine = selection.end.line;

                const result = await ask(prompt, "QUESTION");
                let realLine = startLine;
                for (let i = startLine; i <= endLine; i++) {
                    if (vscode.window.activeTextEditor?.document.lineAt(i).text.trim().length > 0) {
                        realLine = i;
                        break;
                    }
                }
                showHover(realLine, selection.start, result);
                codeLensProvider.refresh();
            }
        } catch (error) {
            console.error(error);
        }
    })

    let simplellmGenerate = vscode.commands.registerCommand('simplellm.generate', async function () {
        try {
            checkConfig();
            let prompt = await vscode.window.showInputBox({
                prompt: "Enter your prompt for the LLM",
                placeHolder: "What would you like to create?"
            });
        
            if (prompt) {
                const result = await ask(prompt, "CODE");
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    const position = editor.selection.active;
                    editor.edit(editBuilder => {
                        editBuilder.insert(editor.selection.active, result.split('\n').slice(1, -1).join('\n'));
                    });
                } else {
                    vscode.window.showInformationMessage(`LLM Response: ${result.split('\n').slice(1, -1).join('\n')}`);    
                }
            }
        } catch (error) {
            console.error(error);
        }
    })
    
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

    // Function to manually clear AI context
    let clear = vscode.commands.registerCommand('simplellm.clear', async function (key) {
        if (!key) {
            vscode.window.showErrorMessage('clear 😎');
            return;
        }
        delete hovers[key];
        codeLensProvider.refresh();
    })

    // Function to manually show hover
    let showContext = vscode.commands.registerCommand('simplellm.showContext',(line, pos, result) => {
        if (!line) {
            vscode.window.showErrorMessage("nothing here 🙀"); 
            return;
        }
        showHover(line,pos,result);
    })

    // Register CodeLens providers for accessing AI 
    let codeLensProviderDisposable = vscode.languages.registerCodeLensProvider('*', codeLensProvider)

    context.subscriptions.push(simplellmAsk);
    context.subscriptions.push(clear);
    context.subscriptions.push(showContext);
    context.subscriptions.push(codeLensProviderDisposable);
    context.subscriptions.push(hoverProvider);

}


function showHover(lineNum, position, result) {
    const lineText = vscode.window.activeTextEditor.document.lineAt(lineNum).text;
    const key = hash(lineText);
    hovers[key] = {data: result, position: position};
    vscode.window.activeTextEditor.selection = new vscode.Selection(position, position);
    vscode.commands.executeCommand('editor.action.showHover');
}

function deactivate() {}

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

            if (Object.keys(hovers).includes(key) && line.trim().length > 0) {
                const codeLensRange = document.lineAt(i).range;
                codeLenses.push(new vscode.CodeLens(codeLensRange, {
                    title: "AI Context",
                    command: "simplellm.showContext",
                    arguments: [i, codeLensRange.start, hovers[key].data]
                }));

                codeLenses.push(new vscode.CodeLens(codeLensRange, {
                    title: "Clear",
                    command: "simplellm.clear",
                    arguments: [key]
                }));
            }
        }
        return codeLenses;
    }

    refresh() {
        this._onDidChangeCodeLenses.fire();
    }
}

module.exports = {
    activate,
    deactivate
}
