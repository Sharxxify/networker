const net = require('net');

// Simple TCP client test script
function testSocketConnection() {
  const client = new net.Socket();
  
  client.connect(8080, 'localhost', () => {
    console.log('Connected to server');
    
    // Send a test log message
    const testMessage = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: "log",
      data: "[05:02:28.259|ECCB|1] [0x02000000]    1, 2[<=]   RRC     1,    1 [0xdb10:          UNKNOWN:T:0x0000:E:0:TH04]               II 187 msgSTDRrcRRCConnectionRequestUeEccb",
      source: "test-client"
    };
    
    client.write(JSON.stringify(testMessage));
    console.log('Sent test message:', testMessage);
  });
  
  client.on('data', (data) => {
    console.log('Received from server:', data.toString());
    client.destroy();
  });
  
  client.on('close', () => {
    console.log('Connection closed');
  });
  
  client.on('error', (error) => {
    console.error('Connection error:', error);
  });
}

// Run the test
console.log('Starting socket test...');
testSocketConnection(); 