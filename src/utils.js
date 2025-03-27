const vscode = require('vscode');
const crypto = require('crypto');

/**
 * Parses a raw Server-Sent Events (SSE) string into structured JavaScript objects.
 * Handles 'event' and 'data' fields, with JSON parsing for the data payload.
 * 
 * @param {string} rawSSEString - The raw SSE stream (e.g., "event: foo\ndata: [...]\n\n...")
 * @returns {Array<{type: string, data: any}>} Array of parsed events (or empty array if invalid)
 */
function parseSSE(rawSSEString) {
    if (!rawSSEString || typeof rawSSEString !== 'string') {
      console.error('Invalid SSE input: Expected non-empty string');
      return [];
    }
  
    return rawSSEString
      .trim()
      .split('\n\n') // Split into individual events
      .filter(eventStr => eventStr.includes('data:')) // Ignore malformed events
      .map(eventStr => {
        const lines = eventStr.split('\n');
        const event = { type: 'message' }; // Default SSE event type
  
        lines.forEach(line => {
          if (line.startsWith('event:')) {
            event.type = line.replace('event:', '').trim();
          } 
          else if (line.startsWith('data:')) {
            try {
              event.data = JSON.parse(line.replace('data:', '').trim());
            } catch (err) {
              // Fallback to raw string if JSON parsing fails
              event.data = line.replace('data:', '').trim();
            }
          }
        });
  
        return event;
      });
  }

  
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

module.exports = { checkConfig, getUrl, hash, parseSSE}


