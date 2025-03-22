const vscode = require('vscode');

/**
 * Get model endpoint from config setting
 * @returns model url endpoint
 */
function getUrl() {
    let model = vscode.workspace.getConfiguration('simplellm').get("model")
    model = model.toLowerCase().replace("/", "-").replaceAll(".","-");
    let url = `https://${model}.hf.space/gradio_api/call/chat`
    return url;
}

/**
 * Verify 'simplellm.model' param is set in config
 */
function checkConfig() {
    const config = vscode.workspace.getConfiguration('simplellm');
    const MODEL = config.get('model');
    
    if (!MODEL) {
        vscode.window.showErrorMessage("please define 'simplellm.model' setting"); 
        throw new Error('oops');
    }
}

module.exports = { checkConfig, getUrl, getWebviewContent }