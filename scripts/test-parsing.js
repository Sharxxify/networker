const fs = require('fs');
const path = require('path');

// Test the parsing functionality
function testParsing() {
  console.log('Testing parsing functionality...');
  
  // Test log line
  const testLine = "[05:02:28.259|ECCB|1] [0x02000000]    1, 2[<=]   RRC     1,    1 [0xdb10:          UNKNOWN:T:0x0000:E:0:TH04]               II 187 msgSTDRrcRRCConnectionRequestUeEccb";
  
  console.log('Test line:', testLine);
  
  // Test regex pattern
  const LOG_PATTERN = /^\[(\d{2}:\d{2}:\d{2}\.\d{3})\|([^|]+)\|(\d+)\]\s+\[([^\]]+)\]\s+(\d+),\s*(\d+)\[([<=>\s]+)\]\s+([A-Z]+)\s+(\d+),\s*(\d+)\s+\[([^\]]+)\]\s+([A-Z]+)\s+(\d+)\s+(.+)$/;
  
  const match = testLine.match(LOG_PATTERN);
  
  if (match) {
    console.log('✅ Regex pattern matched successfully!');
    console.log('Extracted data:');
    console.log('- Timestamp:', match[1]);
    console.log('- System:', match[2]);
    console.log('- System ID:', match[3]);
    console.log('- Hex Value:', match[4]);
    console.log('- Param1:', match[5]);
    console.log('- Param2:', match[6]);
    console.log('- Direction:', match[7]);
    console.log('- Protocol:', match[8]);
    console.log('- Call ID:', match[9]);
    console.log('- Cell ID:', match[10]);
    console.log('- Additional Data:', match[11]);
    console.log('- Message Type:', match[12]);
    console.log('- Message ID:', match[13]);
    console.log('- Message Name:', match[14]);
    
    // Test message number extraction
    const messageNumberMatch = match[14].match(/\b(\d+)\b/);
    if (messageNumberMatch) {
      console.log('✅ Message number extracted:', messageNumberMatch[1]);
    } else {
      console.log('❌ Failed to extract message number');
    }
    
    // Test protocol mapping
    const protocol = match[8];
    const mapProtocolToEntity = (protocol) => {
      const upperProtocol = protocol.toUpperCase();
      switch (upperProtocol) {
        case "RRC": return "BE";
        case "S1AP": return "MME";
        case "S2AP": return "ENB2";
        case "PDCP": return "PDCP";
        case "GTP": return "GTPB";
        case "RLC": return "RLCB";
        case "MAC": return "MACB";
        default: return protocol;
      }
    };
    
    const mappedProtocol = mapProtocolToEntity(protocol);
    console.log('✅ Protocol mapping:', protocol, '→', mappedProtocol);
    
    // Test direction analysis
    const direction = match[7];
    let directionStr;
    if (direction.includes("<=")) {
      directionStr = `${mappedProtocol} → ECCB`;
    } else if (direction.includes("=>")) {
      directionStr = `ECCB → ${mappedProtocol}`;
    } else {
      directionStr = direction.trim();
    }
    console.log('✅ Direction analysis:', direction, '→', directionStr);
    
  } else {
    console.log('❌ Regex pattern failed to match');
  }
  
  // Test with a few more sample lines
  const sampleLines = [
    "[05:02:28.260|ECCB|1] [0x02000000]    1, 2[→]   MAC     1,    1 [0xdb11:       e030244e:T:T:0x0000:E:0:TH04]               II 188 msgSTDmacRandomAccess",
    "[05:02:28.261|ECCB|1] [0x02000000]    1, 2[→]   PDCP    1,    1 [0xdb12:       e030244e:T:T:0x0000:E:0:TH04]               II 189 msgSTDPdcpDataTransfer",
    "DEBUG: This is a debug message",
    "Some random text that shouldn't match"
  ];
  
  console.log('\nTesting multiple lines...');
  sampleLines.forEach((line, index) => {
    const lineMatch = line.match(LOG_PATTERN);
    if (lineMatch) {
      console.log(`✅ Line ${index + 1}: Matched (${lineMatch[8]} protocol)`);
    } else if (line.includes('DEBUG:')) {
      console.log(`✅ Line ${index + 1}: Debug message (expected no match)`);
    } else {
      console.log(`❌ Line ${index + 1}: No match (${line.substring(0, 50)}...)`);
    }
  });
}

// Test message file creation
function testMessageFileCreation() {
  console.log('\nTesting message file creation...');
  
  const messageData = {
    messageName: "msgSTDRrcRRCConnectionRequestUeEccb",
    direction: "BE → ECCB",
    timestamp: "05:02:28.259",
    callId: "CALL-1",
    cellId: "CELL-2",
    protocol: "BE",
    hexData: "0xdb10",
    rawLine: "[05:02:28.259|ECCB|1] [0x02000000]    1, 2[<=]   RRC     1,    1 [0xdb10:          UNKNOWN:T:0x0000:E:0:TH04]               II 187 msgSTDRrcRRCConnectionRequestUeEccb",
    status: "info",
    messageNumber: "187"
  };
  
  const messagesDir = path.join(process.cwd(), 'messages');
  const messageDir = path.join(messagesDir, '187');
  const messageFile = path.join(messageDir, '187.txt');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(messageDir)) {
    fs.mkdirSync(messageDir, { recursive: true });
    console.log('✅ Created message directory:', messageDir);
  }
  
  // Create message file
  const content = `Message ID: 187
Type: RRC Connection Request
Direction: ${messageData.direction}
Timestamp: ${messageData.timestamp}

Raw Log Entry:
${messageData.rawLine}

Message Content:
This is a ${messageData.messageName} message.
The message contains ${messageData.protocol} parameters.

Protocol Details:
- Protocol: ${messageData.protocol}
- Message Type: ${messageData.messageName}
- Direction: ${messageData.direction}
- Status: ${messageData.status}

Technical Parameters:
- Call ID: ${messageData.callId}
- Cell ID: ${messageData.cellId}
- Hex Data: ${messageData.hexData}
- Message Number: ${messageData.messageNumber}

Additional Information:
- File created: ${new Date().toISOString()}
- Message Type ID: 187`;
  
  fs.writeFileSync(messageFile, content, 'utf8');
  console.log('✅ Created message file:', messageFile);
  
  // Verify file exists
  if (fs.existsSync(messageFile)) {
    console.log('✅ Message file verification successful');
  } else {
    console.log('❌ Message file verification failed');
  }
}

// Run tests
console.log('=== 4G Debugging Tool - Parsing Test ===\n');
testParsing();
testMessageFileCreation();
console.log('\n=== Test Complete ==='); 