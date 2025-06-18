# 4G Log Analyzer - Desktop Application

A desktop application for analyzing 4G network logs, built with Next.js and Electron.

## Features

- 📊 Advanced log analysis and visualization
- 📁 File upload and processing
- 🎨 Modern, responsive UI
- 🖥️ Native desktop application experience
- 📈 Real-time data visualization
- 🔍 Powerful filtering and search capabilities

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

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

2. **Build fails**
   - Clear `node_modules` and reinstall dependencies
   - Make sure you have sufficient disk space

3. **Electron app shows blank screen**
   - Check the console for errors
   - Verify the Next.js build completed successfully

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