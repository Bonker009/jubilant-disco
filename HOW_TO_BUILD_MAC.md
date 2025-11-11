# How to Build for macOS

## ⚠️ Important: You Cannot Build macOS Apps on Windows

macOS apps can **only** be built on a Mac computer. This is an Apple requirement.

## Option 1: Build on a Mac (Recommended)

If you have access to a Mac:

1. **Transfer your project to the Mac** (via Git, USB, or cloud)

2. **On the Mac, open Terminal and run:**
   ```bash
   # Navigate to project
   cd /path/to/testing-endpoint-validation
   
   # Install dependencies
   npm install
   cd client && npm install && cd ..
   
   # Build for Mac
   npm run build:mac
   ```

3. **Find your DMG file:**
   - Location: `dist/API Validation Tester-1.0.0.dmg`
   - This is the installer you can share with Mac users

## Option 2: Use GitHub Actions (Automatic)

I've set up GitHub Actions to automatically build for Mac when you push to GitHub.

### Steps:

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

2. **Trigger the build:**
   - Go to your GitHub repository
   - Click "Actions" tab
   - Click "Build macOS" workflow
   - Click "Run workflow" button
   - Select your branch and click "Run workflow"

3. **Download the build:**
   - After the workflow completes (about 5-10 minutes)
   - Go to the workflow run
   - Download the "macos-dmg" artifact
   - This is your DMG installer file

## Option 3: Use a Cloud Mac Service

If you don't have a Mac, you can rent one:

1. **MacStadium** - https://www.macstadium.com/
2. **AWS EC2 Mac Instances** - https://aws.amazon.com/ec2/instance-types/mac/
3. **MacinCloud** - https://www.macincloud.com/

Then follow Option 1 instructions on the cloud Mac.

## Option 4: Ask Someone with a Mac

Share your project with someone who has a Mac and ask them to:
1. Clone/download your project
2. Run `npm run build:mac`
3. Share the DMG file back with you

## What You'll Get

After building, you'll have:

- **`API Validation Tester-1.0.0.dmg`** - DMG installer (share this with Mac users)
- **`API Validation Tester.app`** - App bundle (can be zipped and distributed)

## Distribution

Mac users can:
1. Download the DMG file
2. Double-click to open it
3. Drag the app to Applications folder
4. Launch from Applications

**Note:** If the app is unsigned, users will need to:
- Right-click → "Open" (first time only)
- Or go to System Preferences → Security & Privacy → Click "Open Anyway"

## Quick Reference

```bash
# On a Mac, build with:
npm run build:mac

# Or manually:
npm run build
electron-builder --mac
```

## Need Help?

- See `BUILD_MAC.md` for detailed instructions
- See `MAC_INSTRUCTIONS.md` for Mac usage instructions
- Check GitHub Actions logs if using automated builds

