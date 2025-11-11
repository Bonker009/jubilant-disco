# Setup Instructions

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   cd client
   npm install
   cd ..
   ```

2. **Run in development mode:**
   ```bash
   npm run dev
   ```
   This will start:
   - Express server on port 5000
   - React dev server on port 3000
   - Electron app window

3. **Run in production mode:**
   ```bash
   npm run build
   npm start
   ```

## Building for Distribution

To create installers for your platform:

```bash
npm run build:electron
```

This will create installers in the `dist` folder:
- **Windows**: `.exe` installer
- **macOS**: `.dmg` file
- **Linux**: `.AppImage` file

## Troubleshooting

### Port 5000 already in use
If you get an error that port 5000 is in use, you can:
1. Close any other applications using that port
2. Or modify `electron/main.js` to use a different port

### curl not found
Make sure curl is installed and available in your system PATH:
- **Windows**: Usually comes with Git Bash or can be installed separately
- **macOS**: Usually pre-installed
- **Linux**: Install with `sudo apt-get install curl` or equivalent

### Build errors
If you encounter build errors:
1. Make sure all dependencies are installed
2. Try deleting `node_modules` and reinstalling:
   ```bash
   rm -rf node_modules client/node_modules
   npm install
   cd client && npm install && cd ..
   ```

