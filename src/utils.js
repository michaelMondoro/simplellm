const vscode = require('vscode');
const crypto = require('crypto');

/**
 * Create simple hash of a string value
 * @param {value to hash} str 
 * @returns hashed value
 */
function hash(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

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

module.exports = { checkConfig, getUrl, hash}