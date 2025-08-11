const fs = require('fs');
const path = require('path');

class MessageFileManager {
  constructor(baseDir = 'messages') {
    this.baseDir = baseDir;
    this.ensureBaseDirectory();
  }

  ensureBaseDirectory() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Creates a folder for a message type ID and saves the message content
   * @param {string} messageTypeId - The message type ID (e.g., "187", "188")
   * @param {Object} messageData - The message data to save
   * @returns {string} - Path to the created file
   */
  createMessageFile(messageTypeId, messageData) {
    // Create folder for message type ID
    const messageFolder = path.join(this.baseDir, messageTypeId);
    if (!fs.existsSync(messageFolder)) {
      fs.mkdirSync(messageFolder, { recursive: true });
    }

    // Create file named after message type ID
    const fileName = `${messageTypeId}.txt`;
    const filePath = path.join(messageFolder, fileName);

    // Format the message content
    const content = this.formatMessageContent(messageTypeId, messageData);

    // Write the content to the file
    fs.writeFileSync(filePath, content, 'utf8');

    return filePath;
  }

  /**
   * Formats the message content for the file
   * @param {string} messageTypeId - The message type ID
   * @param {Object} messageData - The message data
   * @returns {string} - Formatted content
   */
  formatMessageContent(messageTypeId, messageData) {
    const {
      messageName,
      direction,
      timestamp,
      callId,
      cellId,
      protocol,
      hexData,
      rawLine,
      status,
      messageNumber
    } = messageData;

    return `Message ID: ${messageTypeId}
Type: ${this.cleanMessageName(messageName)}
Direction: ${direction}
Timestamp: ${timestamp}

Raw Log Entry:
${rawLine}

Message Content:
This is a ${this.cleanMessageName(messageName)} message.
The message contains ${this.getProtocolDescription(protocol)} parameters.

Protocol Details:
- Protocol: ${protocol}
- Message Type: ${this.cleanMessageName(messageName)}
- Direction: ${direction}
- Status: ${status}

Technical Parameters:
- Call ID: ${callId || 'N/A'}
- Cell ID: ${cellId || 'N/A'}
- Hex Data: ${hexData || 'N/A'}
- Message Number: ${messageNumber || 'N/A'}

Additional Information:
- File created: ${new Date().toISOString()}
- Message Type ID: ${messageTypeId}`;
  }

  /**
   * Cleans the message name for display
   * @param {string} messageName - The raw message name
   * @returns {string} - Cleaned message name
   */
  cleanMessageName(messageName) {
    return messageName
      .replace(/^msg/, "")
      .replace(/STD/, "")
      .replace(/Rrc/, "RRC ")
      .replace(/Mac/, "MAC ")
      .replace(/Pdcp/, "PDCP ")
      .replace(/S1ap/, "S1AP ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .trim();
  }

  /**
   * Gets a description for the protocol
   * @param {string} protocol - The protocol name
   * @returns {string} - Protocol description
   */
  getProtocolDescription(protocol) {
    const descriptions = {
      'RRC': 'Radio Resource Control',
      'MAC': 'Medium Access Control',
      'PDCP': 'Packet Data Convergence Protocol',
      'S1AP': 'S1 Application Protocol',
      'X2AP': 'X2 Application Protocol',
      'GTP': 'GPRS Tunneling Protocol',
      'RLC': 'Radio Link Control',
      'UE': 'User Equipment',
      'ECCB': 'Enhanced Call Control Block'
    };
    return descriptions[protocol] || protocol;
  }

  /**
   * Reads and returns the content of a message file
   * @param {string} messageTypeId - The message type ID
   * @returns {string|null} - The file content or null if file doesn't exist
   */
  readMessageFile(messageTypeId) {
    const filePath = path.join(this.baseDir, messageTypeId, `${messageTypeId}.txt`);
    
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    
    return null;
  }

  /**
   * Lists all available message type IDs
   * @returns {string[]} - Array of message type IDs
   */
  listMessageTypes() {
    if (!fs.existsSync(this.baseDir)) {
      return [];
    }

    const folders = fs.readdirSync(this.baseDir, { withFileTypes: true });
    return folders
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .sort((a, b) => parseInt(a) - parseInt(b));
  }

  /**
   * Checks if a message file exists for the given message type ID
   * @param {string} messageTypeId - The message type ID
   * @returns {boolean} - True if file exists
   */
  messageFileExists(messageTypeId) {
    const filePath = path.join(this.baseDir, messageTypeId, `${messageTypeId}.txt`);
    return fs.existsSync(filePath);
  }

  /**
   * Deletes a message file and its folder
   * @param {string} messageTypeId - The message type ID
   * @returns {boolean} - True if deletion was successful
   */
  deleteMessageFile(messageTypeId) {
    const folderPath = path.join(this.baseDir, messageTypeId);
    
    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
      return true;
    }
    
    return false;
  }
}

module.exports = MessageFileManager; 