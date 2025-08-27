const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, 'logs.db');
const db = new Database(dbPath);

// Create tables if they don't exist
// Uploaded files table
const createFilesTable = `
CREATE TABLE IF NOT EXISTS uploaded_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  upload_status TEXT DEFAULT 'completed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// Parsed log entries table with enhanced fields
const createLogEntriesTable = `
CREATE TABLE IF NOT EXISTS log_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER,
  timestamp TEXT,
  reference_block TEXT,
  log_level TEXT,
  call_id TEXT,
  cell_id TEXT,
  direction TEXT,
  protocol TEXT,
  l2_call_id TEXT,
  msg_hex_value TEXT,
  unknown_field TEXT,
  state TEXT,
  msg_num TEXT,
  msg_name TEXT,
  status TEXT,
  message TEXT,
  raw_line TEXT,
  line_number INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
);
`;

db.exec(createFilesTable);
db.exec(createLogEntriesTable);

module.exports = db; 