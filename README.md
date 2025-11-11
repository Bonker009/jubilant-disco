# API Endpoint Validation Tester (Desktop App)

A desktop application built with Electron for testing API endpoint validation by sending various value types (null, undefined, numbers, strings, etc.) to each field and reporting which fields are properly validated.

## Features

- 🖥️ **Desktop Application** - Native desktop app using Electron
- 🎯 Test POST endpoints with custom request bodies
- 🔐 Support for Bearer token authentication
- 📊 Comprehensive validation testing for each field
- 📈 Detailed reports showing which fields are properly validated
- 🎨 Modern, user-friendly UI

## Installation

1. Install all dependencies:
```bash
npm install
cd client
npm install
cd ..
```

## Usage

### Development Mode

Run the app in development mode with hot-reload:

```bash
npm run dev
```

This will:
- Start the Express server on port 5000
- Start the React development server on port 3000
- Launch the Electron app

### Production Mode

1. Build the React app:
```bash
npm run build
```

2. Start the Electron app:
```bash
npm start
```

### Building Distributables

Build platform-specific installers:

```bash
npm run build:electron
```

This will create installers in the `dist` folder:
- **Windows**: NSIS installer (.exe)
- **macOS**: DMG file
- **Linux**: AppImage

Or create unpacked builds:
```bash
npm run pack
```

## How It Works

The tool will:
1. Parse your request body to identify all fields
2. For each field, test various value types:
   - `null`
   - `undefined` (field removed)
   - Empty string
   - Numbers (0, negative, large)
   - Booleans
   - Arrays
   - Objects
   - Special strings
   - Type-specific variations

3. Send each test case to your endpoint using curl
4. Analyze responses to determine if validation is working
5. Generate a report showing which fields are properly validated

## Example Request Body

```json
{
  "departmentId": "8fba8494-e35d-4e76-b334-4e40dad9c3e7",
  "employeeName": 2,
  "firstName": 4,
  "lastName": "Seyha",
  "phoneNumber": "+448681726",
  "homeAddress": "Phnom Penh",
  "imageUrl": "http://localhost:8081/api/v1/files/preview-file/cc3da07d-7fbe-404a-a18a-1ce6b54aa17e_pic.jpg",
  "email": "chhornseyha@gmail.com",
  "isEnabled": true,
  "createAt": "2025-11-10T08:23:21.768Z"
}
```

## Requirements

- Node.js (v14 or higher)
- curl (must be installed and available in PATH)
  - **macOS**: Pre-installed, no action needed
  - **Windows**: Usually comes with Git Bash
  - **Linux**: Install with `sudo apt-get install curl`
- npm or yarn

## Platform-Specific Instructions

- **macOS**: See [MAC_INSTRUCTIONS.md](MAC_INSTRUCTIONS.md) for detailed Mac setup
- **Windows**: See [SETUP.md](SETUP.md) for setup instructions
- **Linux**: Follow standard installation steps above

## Project Structure

```
.
├── electron/
│   ├── main.js              # Electron main process
│   └── preload.js           # Preload script for security
├── server/
│   ├── index.js             # Express server (used in Electron)
│   └── validationTester.js  # Core testing logic
├── client/
│   ├── public/
│   ├── src/
│   │   ├── App.js           # Main React component
│   │   ├── App.css          # Styles
│   │   └── index.js         # React entry point
│   └── package.json
├── package.json
└── README.md
```

## Notes

- The tool uses curl to make HTTP requests
- A field is considered "properly validated" if 70% or more of test cases return validation errors (4xx status codes)
- The tool tests each field independently by modifying only that field while keeping others unchanged
- The Express server runs internally within the Electron app on port 5000
- In production builds, the React app is served as static files

## Development

- The app uses Electron's main process to run the Express server
- React app is built and served statically in production
- Development mode uses React's dev server with hot-reload
