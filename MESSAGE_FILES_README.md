# Message Files Structure

This document describes the implementation of the folder and file structure for message types in the 4G Log Analyzer application.

## Overview

Each message type ID has its own folder named after it (e.g., `187/`), and inside that folder is a file named after the message type ID (e.g., `187.txt`). The parser automatically creates these files when processing log entries that contain message type IDs.

## Folder Structure

```
messages/
├── 187/
│   └── 187.txt
├── 188/
│   └── 188.txt
├── 189/
│   └── 189.txt
└── ...
```

## File Content Format

Each message file contains detailed information about the message:

```
Message ID: 187
Type: RRC Connection Request
Direction: UE → ECCB
Timestamp: 05:02:28.259

Raw Log Entry:
[05:02:28.259|ECCB|1] [0x02000000]    1, 2[<=]   RRC     1,    1 [0xdb10:          UNKNOWN:T:0x0000:E:0:TH04]               II 187 msgSTDRrcRRCConnectionRequestUeEccb

Message Content:
This is a RRC Connection Request message.
The message contains Radio Resource Control parameters.

Protocol Details:
- Protocol: RRC
- Message Type: RRC Connection Request
- Direction: UE → ECCB
- Status: info

Technical Parameters:
- Call ID: CALL-1
- Cell ID: CELL-1
- Hex Data: 0x02000000
- Message Number: 187

Additional Information:
- File created: 2025-08-03T19:05:01.401Z
- Message Type ID: 187
```

## Implementation Details

### Message File Manager (`electron/messageFileManager.js`)

The `MessageFileManager` class handles all operations related to message files:

- **`createMessageFile(messageTypeId, messageData)`**: Creates a folder and file for a message type
- **`readMessageFile(messageTypeId)`**: Reads the content of a message file
- **`listMessageTypes()`**: Lists all available message type IDs
- **`messageFileExists(messageTypeId)`**: Checks if a message file exists
- **`deleteMessageFile(messageTypeId)`**: Deletes a message file and its folder

### Integration with Log Parser

The log parser (`electron/parseLogLine.js`) automatically creates message files when it encounters log entries with message type IDs. The parser extracts the message number from the message name and creates the corresponding file.

### API Endpoints

The following API endpoints are available through the Electron main process:

- **`readMessageFile(messageTypeId)`**: Read message file content
- **`listMessageTypes()`**: List all available message types
- **`messageFileExists(messageTypeId)`**: Check if a message file exists
- **`deleteMessageFile(messageTypeId)`**: Delete a message file

### User Interface

The Message Files page (`/message-files`) provides a user interface for:

- Viewing all available message types
- Reading message file contents
- Deleting message files
- Refreshing the message type list

## Usage

1. **Upload and Parse Logs**: Upload log files through the Upload Logs page
2. **View Message Files**: Navigate to the Message Files page to see all generated message files
3. **Read Message Content**: Click on any message type to view its detailed content
4. **Manage Files**: Delete message files as needed

## Benefits

- **Organized Storage**: Each message type has its own dedicated folder
- **Easy Access**: Files are named consistently and predictably
- **Detailed Information**: Each file contains comprehensive message details
- **User-Friendly Interface**: Web-based interface for managing message files
- **Automatic Generation**: Files are created automatically during log parsing

## Technical Notes

- Message files are created in the `messages/` directory relative to the application root
- Files are created with UTF-8 encoding
- The parser extracts message numbers using regex patterns
- Error handling is implemented for file operations
- The system supports both creation and deletion of message files 