
# SRM_25NCOAM03SRM_MsgFlow_Generation_Tool_for_4G_Debugging
SRIB-PRISM Program
# 4G Log Analyzer - Desktop Application

A desktop application for analyzing 4G network logs, built with Next.js and Electron.

## Features

- 📊 Advanced log analysis and visualization
- 📁 File upload and processing
- 🎨 Modern, responsive UI
- 🖥️ Native desktop application experience
- 📈 Real-time data visualization
- 🔍 Powerful filtering and search capabilities

# 📦 Run via Docker (no setup needed!)

```bash
docker pull deepta505/4g-log-analyzer
docker run --rm -v "${PWD}/out:/app/dist" deepta505/4g-log-analyzer
```

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Linux/Ubuntu Setup

For Linux (Ubuntu) environments, Electron requires Chrome sandbox permissions to run securely. Follow these steps:

#### 1. Install Required Dependencies

```bash
# Update package list
sudo apt-get update

# Install required libraries
sudo apt-get install -y \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  libatspi2.0-0 \
  libgtk-3-0
```

#### 2. Set Up Chrome Sandbox Permissions

Electron uses Chrome's sandbox for security. You need to configure the sandbox permissions:

**Option A: Run with User Namespace (Recommended for development)**

```bash
# Add your user to the user namespace
echo 'kernel.unprivileged_userns_clone=1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Or run Electron with sandbox disabled (development only)
npm run electron-dev -- --no-sandbox
```

**Option B: Set Up Proper Sandbox (Recommended for production)**

```bash
# Create a chrome-sandbox group (if not exists)
sudo groupadd -r chrome-sandbox 2>/dev/null || true

# Set proper permissions on Electron's chrome-sandbox binary
# This path may vary based on your Electron installation
sudo chown root:chrome-sandbox /usr/lib/electron/chrome-sandbox 2>/dev/null || \
sudo chown root:chrome-sandbox /opt/electron/chrome-sandbox 2>/dev/null || \
sudo chown root:chrome-sandbox node_modules/electron/dist/chrome-sandbox 2>/dev/null

sudo chmod 4755 /usr/lib/electron/chrome-sandbox 2>/dev/null || \
sudo chmod 4755 /opt/electron/chrome-sandbox 2>/dev/null || \
sudo chmod 4755 node_modules/electron/dist/chrome-sandbox 2>/dev/null
```

**Option C: Run with User Namespace (Quick Fix)**

If you encounter sandbox errors, you can temporarily disable the sandbox:

```bash
# Add to your .bashrc or .zshrc
export ELECTRON_DISABLE_SANDBOX=1

# Or run directly
ELECTRON_DISABLE_SANDBOX=1 npm run electron-dev
```

#### 3. Verify Installation

After setting up, verify Electron can run:

```bash
# Test Electron installation
npx electron --version

# Run the application
npm run electron-dev
```

#### Troubleshooting Linux Issues

**Issue: "The SUID sandbox helper binary was found, but is not configured correctly"**

```bash
# Find the chrome-sandbox binary
find node_modules/electron -name chrome-sandbox

# Set permissions (replace PATH with actual path)
sudo chown root:root node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
```

**Issue: "Failed to move to new namespace"**

```bash
# Enable user namespaces
echo 'kernel.unprivileged_userns_clone=1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Or run with --no-sandbox flag (development only)
npm run electron-dev -- --no-sandbox
```

**Issue: Missing shared libraries**

```bash
# Install missing dependencies
sudo apt-get install -f
ldd node_modules/electron/dist/electron | grep "not found"
```

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd 4g-log-analyzer
```

2. Install dependencies:

```bash
npm install
```

### Running the Application

#### Development Mode

To run the app in development mode with hot reload:

```bash
npm run electron-dev
```

This will:
- Start the Next.js development server
- Wait for it to be ready
- Launch the Electron app

#### Production Build

To build and run the production version:

```bash
npm run electron-pack
```

This will:
- Build the Next.js app for production
- Package it with Electron
- Create distributable files in the `dist` folder

### Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run build` - Build Next.js app for production
- `npm run electron` - Run Electron app (requires built app)
- `npm run electron-dev` - Run in development mode
- `npm run electron-build` - Build for distribution
- `npm run electron-pack` - Package for distribution

## Application Structure

```
4g-log-analyzer/
├── app/                 # Next.js app directory
├── components/          # React components
├── electron/           # Electron main process files
│   ├── main.js        # Main Electron process
│   └── preload.js     # Preload script for security
├── public/            # Static assets
├── styles/            # CSS styles
└── package.json       # Dependencies and scripts
```

## Building for Distribution

### Windows

```bash
npm run electron-pack
```

Creates a Windows installer in `dist/`

### macOS

```bash
npm run electron-pack
```

Creates a DMG file in `dist/`

### Linux

```bash
npm run electron-pack
```

Creates an AppImage in `dist/`

## Features

### Desktop Integration

- Native application menu
- File open dialog integration
- System tray support
- Keyboard shortcuts

### Security

- Context isolation enabled
- Node integration disabled
- Secure IPC communication

### User Experience

- Responsive design
- Dark/light theme support
- Modern UI components
- Intuitive navigation

## Troubleshooting

### Common Issues

1. **App won't start in development**
   - Make sure Next.js dev server is running on port 3000
   - Check that all dependencies are installed
   - **Linux:** Ensure Chrome sandbox permissions are configured (see Linux/Ubuntu Setup section)

2. **Build fails**
   - Clear `node_modules` and reinstall dependencies
   - Make sure you have sufficient disk space
   - **Linux:** Install required system libraries (see Linux/Ubuntu Setup section)

3. **Electron app shows blank screen**
   - Check the console for errors
   - Verify the Next.js build completed successfully
   - **Linux:** Check sandbox configuration and try running with `--no-sandbox` flag for testing

4. **Linux: Electron crashes on startup**
   - Verify Chrome sandbox permissions are set correctly
   - Check if user namespaces are enabled: `sysctl kernel.unprivileged_userns_clone`
   - Try running with `ELECTRON_DISABLE_SANDBOX=1` environment variable
   - Ensure all required system libraries are installed

### Development Tips

- Use `Ctrl+Shift+I` (or `Cmd+Option+I` on macOS) to open DevTools
- The app automatically opens DevTools in development mode
- Check the terminal for any error messages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License. 
# SRM_25NCOAM03SRM_MsgFlow_Generation_Tool_for_4G_Debugging
SRIB-PRISM Program


