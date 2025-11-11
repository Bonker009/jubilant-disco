# Building for macOS

## Prerequisites

1. **macOS** - You must be on a Mac to build for macOS
2. **Node.js** (v14 or higher)
3. **Xcode Command Line Tools** (for code signing, optional but recommended)

## Building the macOS Version

### Option 1: Build DMG Installer (Recommended)

```bash
# Build React app first
npm run build

# Build macOS DMG installer
npm run build && electron-builder --mac
```

This will create:
- `dist/API Validation Tester-1.0.0.dmg` - DMG installer file
- `dist/mac/` - Unpacked app bundle

### Option 2: Build Only (No Installer)

```bash
npm run build && electron-builder --mac --dir
```

This creates only the unpacked app in `dist/mac/API Validation Tester.app`

### Option 3: Using npm Script

```bash
npm run build:electron
```

This builds for all platforms. To build only for Mac, modify the command:

```bash
npm run build && electron-builder --mac
```

## Code Signing (Optional)

If you want to distribute the app, you may want to code sign it:

1. **Get a Developer ID** from Apple Developer Program
2. **Add to package.json:**
```json
"build": {
  "mac": {
    "target": "dmg",
    "icon": "build/icon.icns",
    "identity": "Developer ID Application: Your Name (TEAM_ID)"
  }
}
```

3. **Or set environment variable:**
```bash
export CSC_IDENTITY_AUTO_DISCOVERY=true
npm run build && electron-builder --mac
```

## Without Code Signing

If you don't have a developer certificate, the app will be unsigned. Users will need to:

1. Right-click the app
2. Select "Open"
3. Click "Open" in the security dialog

Or disable Gatekeeper (not recommended):
```bash
sudo spctl --master-disable
```

## Building on Windows/Linux for Mac

**You cannot build macOS apps on Windows or Linux.** You must:

1. Use a Mac computer
2. Or use a Mac in the cloud (MacStadium, AWS EC2 Mac instances)
3. Or use GitHub Actions with macOS runners

## GitHub Actions Example

Create `.github/workflows/build-mac.yml`:

```yaml
name: Build macOS

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: cd client && npm install && cd ..
      - run: npm run build
      - run: npm run build && electron-builder --mac
      - uses: actions/upload-artifact@v2
        with:
          name: mac-dmg
          path: dist/*.dmg
```

## Troubleshooting

### "Cannot build for macOS on this platform"
- You must be on a Mac to build macOS apps
- Use a Mac computer or cloud Mac service

### Gatekeeper Warnings
- Unsigned apps will show security warnings
- Users need to right-click and select "Open" the first time

### Missing Icon
- Create `build/icon.icns` file
- Or remove icon from package.json to use default

### Build Fails
```bash
# Clean and rebuild
rm -rf dist node_modules/.cache
npm cache clean --force
npm install
cd client && npm install && cd ..
npm run build && electron-builder --mac
```

## Distribution

After building, you'll have:
- **DMG file**: Share this file with Mac users
- **App bundle**: Can be zipped and distributed

Users can:
1. Download the DMG
2. Open it
3. Drag the app to Applications folder
4. Launch from Applications

