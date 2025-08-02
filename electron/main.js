const { app, BrowserWindow, Menu, dialog, ipcMain, Notification } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const fs = require('fs');
const db = require('./db');
const { readFile, writeFile, unlink } = require('fs/promises');

let mainWindow;
let windowState = {};
const windowStatePath = path.join(app.getPath('userData'), 'window-state.json');

// Load window state
function loadWindowState() {
  try {
    if (fs.existsSync(windowStatePath)) {
      windowState = JSON.parse(fs.readFileSync(windowStatePath, 'utf-8'));
    } else {
      windowState = { width: 1200, height: 800 };
    }
  } catch {
    windowState = { width: 1200, height: 800 };
  }
}

// Save window state
function saveWindowState() {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  fs.writeFileSync(windowStatePath, JSON.stringify(bounds));
}

function createWindow() {
  loadWindowState();
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../public/icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // Load the upload logs page by default
  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000/upload'
      : `file://${path.join(__dirname, '../out/upload/index.html')}`
  );

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('close', saveWindowState);
  mainWindow.on('closed', () => { mainWindow = null; });
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Log File',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'Log Files', extensions: ['log', 'txt'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow.webContents.send('file-selected', result.filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => { app.quit(); }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About 4G Log Analyzer',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About',
              message: '4G Log Analyzer',
              detail: 'A desktop application for analyzing 4G network logs.\nVersion 0.1.0\n© 2024 Your Name or Company',
            });
          }
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers for desktop features
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Log Files', extensions: ['log', 'txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});
ipcMain.handle('window:minimize', () => { mainWindow && mainWindow.minimize(); });
ipcMain.handle('window:maximize', () => { mainWindow && (mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()); });
ipcMain.handle('window:close', () => { mainWindow && mainWindow.close(); });
ipcMain.handle('notify', (event, { title, body }) => {
  new Notification({ title, body }).show();
});

// IPC: Fetch all uploaded files
ipcMain.handle('db:getFiles', () => {
  return db.prepare('SELECT * FROM uploaded_files ORDER BY created_at DESC').all();
});

// IPC: Upload a log file
ipcMain.handle('db:uploadFile', async (event, { name, buffer, type, size }) => {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const timestamp = Date.now();
  const filename = `${timestamp}_${name}`;
  const filepath = path.join(uploadsDir, filename);
  await writeFile(filepath, Buffer.from(buffer));
  const stmt = db.prepare(
    `INSERT INTO uploaded_files (filename, original_name, file_size, mime_type, file_path, upload_status) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const info = stmt.run(filename, name, size, type || 'text/plain', filepath, 'completed');
  return db.prepare('SELECT * FROM uploaded_files WHERE id = ?').get(info.lastInsertRowid);
});

// IPC: Parse a log file
ipcMain.handle('db:parseFile', async (event, { fileId, filePath }) => {
  const fileContent = await readFile(filePath, 'utf-8');
  const lines = fileContent.split('\n');
  // Use your parseLogLine function from your API route (move it here if needed)
  const parseLogLine = require('./parseLogLine');
  const parsedEntries = [];
  const parseErrors = [];
  let parsedLines = 0;
  lines.forEach((line, index) => {
    const { entry, error } = parseLogLine(line, index + 1);
    if (entry) {
      parsedEntries.push(entry);
      parsedLines++;
    }
    if (error) {
      parseErrors.push(error);
    }
  });
  // Debug: print all parsed entries before inserting
  console.log('Parsed entries:', parsedEntries);
  const insertStmt = db.prepare(`INSERT INTO log_entries (file_id, timestamp, call_id, cell_id, message_type, direction, status, message, raw_line, line_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertMany = db.transaction((entries) => {
    for (const entry of entries) {
      insertStmt.run(
        fileId,
        entry.timestamp,
        entry.callId,
        entry.cellId,
        entry.msgType,
        entry.direction,
        entry.status,
        entry.message,
        entry.rawLine,
        entry.lineNumber
      );
    }
  });
  insertMany(parsedEntries);
  return {
    success: true,
    totalLines: lines.length,
    parsedEntries: parsedEntries.length,
    parsedLines,
    errors: parseErrors,
    parseStats: {
      successRate: ((parsedLines / lines.length) * 100).toFixed(1),
      errorCount: parseErrors.length,
    },
  };
});

// IPC: Fetch parsed log entries
ipcMain.handle('db:getLogEntries', (event, { fileId }) => {
  let entries;
  if (fileId) {
    entries = db.prepare('SELECT * FROM log_entries WHERE file_id = ? ORDER BY line_number ASC').all(fileId);
  } else {
    entries = db.prepare('SELECT * FROM log_entries ORDER BY created_at DESC').all();
  }
  // Map snake_case to camelCase for frontend compatibility
  return entries.map((e) => ({
    ...e,
    callId: e.call_id,
    cellId: e.cell_id,
    msgType: e.message_type,
    lineNumber: e.line_number,
    rawLine: e.raw_line,
    createdAt: e.created_at,
    // Remove snake_case fields to avoid confusion
    call_id: undefined,
    cell_id: undefined,
    message_type: undefined,
    line_number: undefined,
    raw_line: undefined,
    created_at: undefined,
  }));
});

// IPC: Delete a file and its log entries
ipcMain.handle('db:deleteFile', async (event, { fileId }) => {
  const file = db.prepare('SELECT * FROM uploaded_files WHERE id = ?').get(fileId);
  if (file) {
    await unlink(file.file_path);
    db.prepare('DELETE FROM uploaded_files WHERE id = ?').run(fileId);
    db.prepare('DELETE FROM log_entries WHERE file_id = ?').run(fileId);
    return { success: true };
  }
  return { success: false, error: 'File not found' };
});

// IPC: Read message file content
ipcMain.handle('readMessageFile', async (event, filename) => {
  try {
    const messagesDir = path.join(process.cwd(), 'messages');
    const filePath = path.join(messagesDir, filename);
    
    if (fs.existsSync(filePath)) {
      const content = await readFile(filePath, 'utf-8');
      return content;
    } else {
      return null; // File doesn't exist
    }
  } catch (error) {
    console.error('Error reading message file:', error);
    throw error;
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
}); 