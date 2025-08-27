// Enhanced log format regex patterns for both formats
const LOG_PATTERNS = {
  // Format 1: [05:02:28.259|ECCB|1] [0x02000000]    1, 2[<=]   RRC     1,    1 [0xdb10: UNKNOWN:T:0x0000:E:0:TH04] II 187 msgSTDRrcRRCConnectionRequestUeEccb
  format1: /^\[(\d{2}:\d{2}:\d{2}\.\d{3})\|([^|]+)\|(\d+)\]\s+\[([^\]]+)\]\s+(\d+),\s*(\d+)\[([<=>\s]+)\]\s+([A-Z]+)\s+(\d+),\s*(\d+)\s+\[([^\]]+)\]\s+([A-Z]+)\s+(\d+)\s+(.+)$/,
  
  // Format 2: [ECCB L2 05:02:28.259]    1, 2[<=]   RRC     1,    1 [0xdb10: UNKNOWN:T:0x0000:E:0:TH04] II 187 msgSTDRrcRRCConnectionRequestUeEccb
  format2: /^\[([^L]+)\s+L2\s+(\d{2}:\d{2}:\d{2}\.\d{3})\]\s+(\d+),\s*(\d+)\[([<=>\s]+)\]\s+([A-Z]+)\s+(\d+),\s*(\d+)\s+\[([^\]]+)\]\s+([A-Z]+)\s+(\d+)\s+(.+)$/,
  
  // Fallback patterns for partial parsing
  simpleLog: /^(\d+)_(Rx|Tx)_(.+)$/,
  timestampOnly: /^\[(\d{2}:\d{2}:\d{2}\.\d{3})\|([^|]+)\|(\d+)\]/,
  messageOnly: /(\d+)\s+(msg\w+)/,
};

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
  if (lower.includes("rrc")) return "UE"; // Replace RRC with UE
  if (lower.includes("mac")) return "MAC";
  if (lower.includes("pdcp")) return "PDCP";
  if (lower.includes("s1ap")) return "S1AP";
  if (lower.includes("nas")) return "NAS";
  return "UNKNOWN";
}

function isDebugPrintLine(line) {
  return /\bDEBUG:/i.test(line);
}

function extractTimestamp(line) {
  const match = line.match(/^\[(\d{2}:\d{2}:\d{2}\.\d{3})\|/);
  return match ? match[1] : "";
}

function parseLogLine(line, lineNumber) {
  const trimmedLine = line.trim();
  if (!trimmedLine) return { entry: null, error: null };

  // Handle debug prints
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
    // Try Format 1 first
    const format1Match = trimmedLine.match(LOG_PATTERNS.format1);
    if (format1Match) {
      const [
        ,
        timestamp,
        referenceBlock,
        logLevel,
        hexValue,
        callId,
        cellId,
        direction,
        protocol,
        callId2,
        l2CallId,
        additionalData,
        state,
        msgNum,
        msgName,
      ] = format1Match;

      // Replace RRC with UE
      const mappedProtocol = protocol === "RRC" ? "UE" : protocol;
      
      // Parse the additional data field [0xdb10: UNKNOWN:T:0x0000:E:0:TH04]
      const additionalDataMatch = additionalData.match(/^([^:]+):\s*(.+)$/);
      const msgHexValue = additionalDataMatch ? additionalDataMatch[1] : "";
      const unknownField = additionalDataMatch ? additionalDataMatch[2] : additionalData;

      return {
        entry: {
          id: `${lineNumber}-${msgNum}`,
          timestamp: timestamp,
          referenceBlock: referenceBlock,
          logLevel: logLevel,
          callId: callId,
          cellId: cellId,
          direction: direction.trim(),
          protocol: mappedProtocol,
          l2CallId: l2CallId,
          msgHexValue: msgHexValue,
          unknownField: unknownField,
          state: state,
          msgNum: msgNum,
          msgName: msgName,
          status: determineStatus(msgName, unknownField),
          message: msgName, // Show message name instead of number
          rawLine: trimmedLine,
          lineNumber,
          // Legacy fields for compatibility
          messageId: msgNum,
          msgType: mappedProtocol,
          hexData: hexValue,
          messageNumber: msgNum,
          originalMessageName: msgName,
        },
        error: null,
      };
    }

    // Try Format 2
    const format2Match = trimmedLine.match(LOG_PATTERNS.format2);
    if (format2Match) {
      const [
        ,
        referenceBlock,
        timestamp,
        callId,
        cellId,
        direction,
        protocol,
        callId2,
        l2CallId,
        additionalData,
        state,
        msgNum,
        msgName,
      ] = format2Match;

      // Replace RRC with UE
      const mappedProtocol = protocol === "RRC" ? "UE" : protocol;
      
      // Parse the additional data field [0xdb10: UNKNOWN:T:0x0000:E:0:TH04]
      const additionalDataMatch = additionalData.match(/^([^:]+):\s*(.+)$/);
      const msgHexValue = additionalDataMatch ? additionalDataMatch[1] : "";
      const unknownField = additionalDataMatch ? additionalDataMatch[2] : additionalData;

      return {
        entry: {
          id: `${lineNumber}-${msgNum}`,
          timestamp: timestamp,
          referenceBlock: referenceBlock,
          logLevel: "L2",
          callId: callId,
          cellId: cellId,
          direction: direction.trim(),
          protocol: mappedProtocol,
          l2CallId: l2CallId,
          msgHexValue: msgHexValue,
          unknownField: unknownField,
          state: state,
          msgNum: msgNum,
          msgName: msgName,
          status: determineStatus(msgName, unknownField),
          message: msgName, // Show message name instead of number
          rawLine: trimmedLine,
          lineNumber,
          // Legacy fields for compatibility
          messageId: msgNum,
          msgType: mappedProtocol,
          hexData: msgHexValue,
          messageNumber: msgNum,
          originalMessageName: msgName,
        },
        error: null,
      };
    }

    // Handle simple log format as fallback
    const simpleMatch = trimmedLine.match(LOG_PATTERNS.simpleLog);
    if (simpleMatch) {
      const [, messageId, direction, messageName] = simpleMatch;
      const extractedProtocol = extractProtocolFromMessage(messageName);
      
      return {
        entry: {
          id: `${lineNumber}-${messageId}`,
          timestamp: "",
          referenceBlock: "UNKNOWN",
          logLevel: "UNKNOWN",
          callId: "UNKNOWN",
          cellId: "UNKNOWN",
          direction: direction === "Rx" ? "<=" : "=>",
          protocol: extractedProtocol,
          l2CallId: "UNKNOWN",
          msgHexValue: "UNKNOWN",
          unknownField: "UNKNOWN",
          state: "UNKNOWN",
          msgNum: messageId,
          msgName: messageName,
          status: "info",
          message: messageName,
          rawLine: trimmedLine,
          lineNumber,
          // Legacy fields for compatibility
          messageId: messageId,
          msgType: extractedProtocol,
          originalMessageName: messageName,
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