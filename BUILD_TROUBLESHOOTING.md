# Build Troubleshooting Guide

## Common Build Errors and Solutions

### Error: "zip: not a valid zip file" or "ERR_ELECTRON_BUILDER_CANNOT_EXECUTE"

This error occurs when electron-builder fails to download or extract the Electron binary.

#### Solution 1: Clear Caches and Retry

```bash
# Clear npm cache
npm cache clean --force

# Remove build directories
rm -rf dist
rm -rf node_modules/.cache

# Clear electron-builder cache (Windows)
rm -rf %USERPROFILE%\.cache\electron-builder

# Clear electron-builder cache (Mac/Linux)
rm -rf ~/.cache/electron-builder

# Reinstall electron-builder
npm uninstall electron-builder
npm install electron-builder --save-dev

# Try building again
npm run build:electron
```

#### Solution 2: Download Electron Manually

If automatic download fails, you can pre-download Electron:

```bash
# Set environment variable to use local Electron
export ELECTRON_CACHE=./.electron-cache
# Or on Windows:
# set ELECTRON_CACHE=./.electron-cache

# Then build
npm run build:electron
```

#### Solution 3: Use Pack Instead of Full Build

For testing, use the unpacked build:

```bash
npm run pack
```

This creates an unpacked version in `dist/win-unpacked` (or `dist/mac` on Mac) that you can run directly without creating an installer.

#### Solution 4: Check Network and Antivirus

1. **Network Issues**: 
   - Check your internet connection
   - Try using a VPN if GitHub is blocked
   - Use a different network

2. **Antivirus Interference**:
   - Temporarily disable antivirus during build
   - Add project folder to antivirus exclusions
   - Windows Defender may block downloads

3. **Firewall**:
   - Ensure firewall allows Node.js and electron-builder
   - Allow connections to GitHub

#### Solution 5: Use Different Electron Version

If the current Electron version has issues, try a different one:

```bash
# Install specific Electron version
npm install electron@27.0.0 --save-dev

# Then build
npm run build:electron
```

#### Solution 6: Build for Current Platform Only

Build only for your current platform to avoid downloading multiple binaries:

**Windows:**
```bash
npm run build && electron-builder --win
```

**Mac:**
```bash
npm run build && electron-builder --mac
```

**Linux:**
```bash
npm run build && electron-builder --linux
```

## Alternative: Run Without Building Installer

If you just want to use the app without creating an installer:

```bash
# Build React app
npm run build

# Run Electron directly
npm start
```

This runs the app without creating a distributable package.

## Windows-Specific Issues

### "app-builder.exe process failed"

1. **Run as Administrator**: Try running terminal as administrator
2. **Check Disk Space**: Ensure you have at least 500MB free
3. **Disable Real-time Protection**: Temporarily disable Windows Defender
4. **Check Path Length**: Windows has path length limits, ensure project isn't too nested

### Permission Errors

```bash
# On Windows, you might need to run:
npm run build:electron -- --win --x64
```

## Mac-Specific Issues

### Code Signing Errors

If you get code signing errors on Mac:

```json
// Add to package.json build.mac:
"mac": {
  "target": "dmg",
  "icon": "build/icon.icns",
  "identity": null
}
```

### Gatekeeper Warnings

After building, you may need to:
1. Right-click the app
2. Select "Open"
3. Click "Open" in the security dialog

## Getting Help

If none of these solutions work:

1. Check electron-builder logs in `dist/builder-debug.yml`
2. Check Node.js version: `node --version` (should be v14+)
3. Check npm version: `npm --version`
4. Try updating electron-builder: `npm install electron-builder@latest --save-dev`

## Quick Fix Commands

```bash
# Complete reset and rebuild
rm -rf dist node_modules/.cache
npm cache clean --force
npm install
cd client && npm install && cd ..
npm run build
npm run build:electron
```

