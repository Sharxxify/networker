const parseLogLine = require('./electron/parseLogLine');
const fs = require('fs');

// Read test logs
const testLogs = fs.readFileSync('./test_logs.txt', 'utf-8').split('\n').filter(line => line.trim());

console.log('Testing Parser with Required Log Formats\n');
console.log('=' .repeat(80));

testLogs.forEach((line, index) => {
  if (!line.trim()) return;
  
  console.log(`\nTest ${index + 1}: ${line.substring(0, 80)}...`);
  console.log('-'.repeat(80));
  
  const result = parseLogLine(line, index + 1);
  
  if (result.entry) {
    console.log('✅ Parsed successfully');
    console.log(`   Timestamp: ${result.entry.timestamp}`);
    console.log(`   Reference Block: ${result.entry.referenceBlock}`);
    console.log(`   Log Level: ${result.entry.logLevel}`);
    console.log(`   Call ID: ${result.entry.callId}`);
    console.log(`   Cell ID: ${result.entry.cellId}`);
    console.log(`   Direction: ${result.entry.direction}`);
    console.log(`   Protocol: ${result.entry.protocol}`);
    console.log(`   L2 Call ID: ${result.entry.l2CallId}`);
    console.log(`   Msg Hex Value: ${result.entry.msgHexValue}`);
    console.log(`   Unknown Field: ${result.entry.unknownField}`);
    console.log(`   State: ${result.entry.state}`);
    console.log(`   Msg Num: ${result.entry.msgNum}`);
    console.log(`   Msg Name: ${result.entry.msgName}`);
    console.log(`   Status: ${result.entry.status}`);
    console.log(`   Message: ${result.entry.message}`);
  } else {
    console.log('❌ Failed to parse');
    console.log(`   Error: ${result.error}`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('Parser Test Complete');

