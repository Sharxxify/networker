// Enhanced log format regex patterns with better error handling
const LOG_PATTERNS = {
  mainLog:
    /^\[(\d{2}:\d{2}:\d{2}\.\d{3})\|([^|]+)\|(\d+)\]\s+\[([^\]]+)\]\s+(\d+),\s*(\d+)\[([<=>\s]+)\]\s+([A-Z]+)\s+(\d+),\s*(\d+)\s+\[([^\]]+)\]\s+([A-Z]+)\s+(\d+)\s+(.+)$/,
  simpleLog: /^(\d+)_(Rx|Tx)_(.+)$/,
  timestampOnly: /^\[(\d{2}:\d{2}:\d{2}\.\d{3})\|([^|]+)\|(\d+)\]/,
  messageOnly: /(\d+)\s+(msg\w+)/,
};

// Track previous protocol for chaining
let lastProtocol = 'UE';

function cleanMessageName(messageName) {
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

function determineStatus(messageName, additionalData) {
  const lowerMessage = messageName.toLowerCase();
  const lowerData = additionalData.toLowerCase();
  if (lowerMessage.includes("error") || lowerMessage.includes("fail") || lowerData.includes("unknown")) {
    return "error";
  }
  if (lowerMessage.includes("warning") || lowerMessage.includes("retry")) {
    return "warning";
  }
  if (lowerMessage.includes("setup") || lowerMessage.includes("complete") || lowerMessage.includes("success")) {
    return "success";
  }
  return "info";
}

function extractProtocolFromMessage(messageName) {
  const lower = messageName.toLowerCase();
  if (lower.includes("rrc")) return "RRC";
  if (lower.includes("mac")) return "MAC";
  if (lower.includes("pdcp")) return "PDCP";
  if (lower.includes("s1ap")) return "S1AP";
  if (lower.includes("nas")) return "NAS";
  return "UNKNOWN";
}

function isDebugPrintLine(line) {
  // Consider a line a debug print if it contains 'DEBUG:' (case-insensitive)
  return /\bDEBUG:/i.test(line);
}

function extractTimestamp(line) {
  // Try to extract [HH:MM:SS.mmm|...|...] at the start
  const match = line.match(/^\[(\d{2}:\d{2}:\d{2}\.\d{3})\|/);
  return match ? match[1] : "";
}

function parseLogLine(line, lineNumber) {
  const trimmedLine = line.trim();
  if (!trimmedLine) return { entry: null, error: null };

  // ABSOLUTE: Always treat lines with DEBUG: as debug prints, no matter what
  if (/\bDEBUG:/i.test(trimmedLine)) {
    return {
      entry: {
        id: `debug-${lineNumber}`,
        timestamp: extractTimestamp(trimmedLine),
        status: "debug",
        message: trimmedLine,
        rawLine: trimmedLine,
        lineNumber,
      },
      error: null,
    };
  }

  try {
    const mainMatch = trimmedLine.match(LOG_PATTERNS.mainLog);
    if (mainMatch) {
      const [
        ,
        timestamp,
        system,
        systemId,
        hexValue,
        param1,
        param2,
        direction,
        protocol,
        callId,
        cellId,
        additionalData,
        msgType,
        messageId,
        messageName,
      ] = mainMatch;
      lastProtocol = protocol; // update for chain
      return {
        entry: {
          id: `${lineNumber}-${messageId}`,
          timestamp: timestamp,
          callId: `CALL-${callId}`,
          cellId: `CELL-${cellId}`,
          msgType: protocol,
          direction: direction.includes("<=") ? "UE → eNB" : direction.includes("=>") ? "eNB → UE" : direction.trim(),
          status: determineStatus(messageName, additionalData),
          message: cleanMessageName(messageName),
          rawLine: trimmedLine,
          lineNumber,
          messageId,
          protocol,
          hexData: hexValue,
        },
        error: null,
      };
    }
    const simpleMatch = trimmedLine.match(LOG_PATTERNS.simpleLog);
    if (simpleMatch) {
      const [, messageId, direction, messageName] = simpleMatch;
      lastProtocol = extractProtocolFromMessage(messageName);
      return {
        entry: {
          id: `${lineNumber}-${messageId}`,
          timestamp: "",
          msgType: extractProtocolFromMessage(messageName),
          direction: direction === "Rx" ? "Received" : "Transmitted",
          status: "info",
          message: cleanMessageName(messageName),
          rawLine: trimmedLine,
          lineNumber,
          messageId,
        },
        error: null,
      };
    }
    // --- CHAINED PROTOCOL FLOW ---
    const protocolList = ["RRC", "MAC", "PDCP", "GTP", "RLC", "T-ENB", "GNB", "S1AP", "MME", "HSS", "SGW", "PGW"];
    const protoRegex = new RegExp(`\\b(${protocolList.join("|")})\\b`, "i");
    const protoMatch = trimmedLine.match(protoRegex);
    if (protoMatch) {
      const msgType = protoMatch[1].toUpperCase();
      const direction = `${lastProtocol} → ${msgType}`;
      lastProtocol = msgType;
      // Try to extract callId and cellId (look for 'CALL-<digits>' and 'CELL-<digits>' or similar patterns)
      let callId = undefined;
      let cellId = undefined;
      const callIdMatch = trimmedLine.match(/CALL[-_ ]?(\d+)/i);
      if (callIdMatch) callId = `CALL-${callIdMatch[1]}`;
      else {
        // Try to extract from comma-separated fields
        const callNumMatch = trimmedLine.match(/\s(\d+),/);
        if (callNumMatch) callId = `CALL-${callNumMatch[1]}`;
      }
      const cellIdMatch = trimmedLine.match(/CELL[-_ ]?([A-Za-z0-9]+)/i);
      if (cellIdMatch) cellId = `CELL-${cellIdMatch[1]}`;
      else {
        // Try to extract from comma-separated fields
        const cellNumMatch = trimmedLine.match(/,\s*(\d+)\s*\[/);
        if (cellNumMatch) cellId = `CELL-${cellNumMatch[1]}`;
      }
      if (!callId) callId = 'UNKNOWN';
      if (!cellId) cellId = 'UNKNOWN';
      // Use the rest of the line as message
      const message = trimmedLine;
      return {
        entry: {
          id: `${lineNumber}-fallback`,
          timestamp: "",
          callId,
          cellId,
          msgType,
          direction,
          status: "info",
          message,
          rawLine: trimmedLine,
          lineNumber,
        },
        error: null,
      };
    }
    // Try to extract partial information for debugging
    const timestampMatch = trimmedLine.match(LOG_PATTERNS.timestampOnly);
    if (timestampMatch) {
      return {
        entry: null,
        error: `Partial timestamp found on line ${lineNumber}`,
      };
    }
    const messageMatch = trimmedLine.match(LOG_PATTERNS.messageOnly);
    if (messageMatch) {
      return {
        entry: null,
        error: `Partial message found on line ${lineNumber}`,
      };
    }
    return {
      entry: null,
      error: `Unrecognized log format on line ${lineNumber}`,
    };
  } catch (err) {
    return {
      entry: null,
      error: `Error parsing line ${lineNumber}: ${err.message}`,
    };
  }
}

module.exports = parseLogLine; 