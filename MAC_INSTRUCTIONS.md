# Using API Validation Tester on macOS

## Prerequisites

1. **Node.js** (v14 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Or install via Homebrew: `brew install node`

2. **curl** (pre-installed on macOS)
   - Verify it's available: `curl --version`
   - If not found, install via Homebrew: `brew install curl`

## Installation Steps

### 1. Open Terminal
Press `Cmd + Space`, type "Terminal", and press Enter.

### 2. Navigate to Project Directory
```bash
cd /path/to/testing-endpoint-validation
```

### 3. Install Dependencies

**Install root dependencies:**
```bash
npm install
```

**Install client dependencies:**
```bash
cd client
npm install
cd ..
```

## Running the App

### Option 1: Development Mode (Recommended for first-time use)

This mode includes hot-reload and easier debugging:

```bash
npm run dev
```

This will:
- Start the Express server on port 5000
- Start React dev server on port 3000
- Launch the Electron app window

### Option 2: Production Mode

1. **Build the React app:**
   ```bash
   npm run build
   ```

2. **Start the Electron app:**
   ```bash
   npm start
   ```

## Using the App

1. **Enter your POST endpoint URL**
   - Example: `https://api.example.com/v1/users`

2. **Add Authorization Token (Optional)**
   - Paste your Bearer token or API key

3. **Paste your JSON Request Body**
   - Example:
   ```json
   {
     "departmentId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
     "employeeName": "string",
     "firstName": "string",
     "lastName": "string",
     "phoneNumber": "0662663",
     "homeAddress": "string",
     "imageUrl": "",
     "email": "string",
     "isEnabled": true,
     "createAt": "2025-11-11T06:50:09.558Z"
   }
   ```

4. **Click "Start Validation Test"**

5. **View Results**
   - Summary cards show validation statistics
   - Each field shows detailed test results
   - Click "View Request Body" to see what was sent
   - Click "View Response" to see the API response

## Building a macOS Installer (DMG)

To create a distributable `.dmg` file for macOS:

```bash
npm run build:electron
```

This will create a `.dmg` file in the `dist` folder that you can:
- Share with others
- Install by double-clicking
- Drag to Applications folder

## Troubleshooting

### "Command not found: npm"
- Install Node.js from [nodejs.org](https://nodejs.org/)
- Or use Homebrew: `brew install node`

### "Port 5000 already in use"
```bash
# Find what's using the port
lsof -i :5000

# Kill the process (replace PID with actual process ID)
kill -9 PID
```

### "Cannot open because it is from an unidentified developer"
If you get this security warning:
1. Go to System Preferences → Security & Privacy
2. Click "Open Anyway" next to the message
3. Or right-click the app and select "Open"

### Permission Denied Errors
If you get permission errors:
```bash
# Make scripts executable
chmod +x node_modules/.bin/*
```

### Electron App Won't Open
Try rebuilding:
```bash
rm -rf node_modules client/node_modules
npm install
cd client && npm install && cd ..
npm run build
npm start
```

## Mac-Specific Notes

- **curl**: Pre-installed on macOS, no installation needed
- **Terminal**: Use Terminal.app (included with macOS)
- **File Paths**: Use forward slashes `/` in paths (Unix-style)
- **Permissions**: First launch may require security approval
- **Quit App**: Press `Cmd + Q` or use the menu bar

## Keyboard Shortcuts

- `Cmd + Q` - Quit application
- `Cmd + W` - Close window
- `Cmd + R` - Reload (if DevTools is open)
- `F12` or `Cmd + Option + I` - Open DevTools

## Need Help?

- Check the main `README.md` for general information
- Check `SETUP.md` for setup instructions
- Review console logs in DevTools for errors

