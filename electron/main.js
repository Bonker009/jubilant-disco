const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { testEndpointValidation } = require('../server/validationTester');

// Suppress GPU process errors (common on Windows, usually harmless)
// These should be set before app is ready
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-sandbox');

let mainWindow;
let server;

// Start Express server
function startServer() {
  const expressApp = express();
  const PORT = 5000;

  // Enable CORS for all origins (needed for Electron)
  expressApp.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  expressApp.use(bodyParser.json());
  expressApp.use(bodyParser.urlencoded({ extended: true }));

  // Test endpoint with streaming support - must be before static files
  expressApp.post('/api/test-validation', async (req, res) => {
    try {
      const { endpoint, requestBody, authToken, stream } = req.body;

      if (!endpoint || !requestBody) {
        return res.status(400).json({ 
          error: 'Endpoint and request body are required' 
        });
      }

      // If streaming is requested, use Server-Sent Events
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        // Progress callback to send updates
        const sendProgress = (data) => {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        console.log('Starting validation test for endpoint:', endpoint);
        const startTime = Date.now();
        
        try {
          const finalResults = await testEndpointValidation(endpoint, requestBody, authToken, sendProgress);
          
          const duration = ((Date.now() - startTime) / 1000).toFixed(2);
          console.log(`Validation test completed in ${duration} seconds`);
          
          // Send final results one more time to ensure client has them
          sendProgress({ 
            type: 'final-summary',
            summary: finalResults.summary,
            fieldResults: finalResults.fieldResults
          });
          
          // Send completion signal
          sendProgress({ type: 'complete' });
          res.end();
        } catch (error) {
          sendProgress({ 
            type: 'error', 
            error: error.message 
          });
          res.end();
        }
      } else {
        // Non-streaming mode (backward compatibility)
        console.log('Starting validation test for endpoint:', endpoint);
        const startTime = Date.now();
        
        const results = await testEndpointValidation(endpoint, requestBody, authToken);
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`Validation test completed in ${duration} seconds`);
        
        res.json(results);
      }
    } catch (error) {
      console.error('Error testing validation:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Failed to test validation', 
          message: error.message 
        });
      }
    }
  });

  // Serve static files from React build
  const buildPath = path.join(__dirname, '../client/build');
  console.log('Serving static files from:', buildPath);
  
  // Serve static assets (JS, CSS, etc.) - must be before catch-all
  expressApp.use('/static', express.static(path.join(buildPath, 'static')));
  
  // Serve other static files
  expressApp.use(express.static(buildPath, {
    index: false
  }));

  // Serve index.html for all other GET routes (SPA fallback) - must be last
  expressApp.get('*', (req, res) => {
    // Skip if it's a static file request
    if (req.path.startsWith('/static/')) {
      return res.status(404).send('Not found');
    }
    console.log('Serving index.html for route:', req.path);
    res.sendFile(path.join(buildPath, 'index.html'));
  });

  server = expressApp.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running on port ${PORT}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} is already in use. Trying to use existing server...`);
      // Server might already be running, continue anyway
    } else {
      console.error('Server error:', err);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true, // Enable web security
      preload: path.join(__dirname, 'preload.js'),
      // Suppress GPU warnings (common on Windows)
      enableWebSQL: false
    },
    icon: path.join(__dirname, '../build/icon.png')
  });
  

  // Always open DevTools for debugging
  mainWindow.webContents.openDevTools();
  
  // Inject a script to log when page loads
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      console.log('Page loaded, checking React...');
      setTimeout(() => {
        const root = document.getElementById('root');
        if (root && root.children.length === 0) {
          console.error('Root element is empty - React may not have rendered');
        } else {
          console.log('React app appears to be rendered');
        }
      }, 2000);
    `);
  });

  // Load the app from Express server (serves static files)
  // Always use the Express server since it serves the built files
  // Check if React dev server is available, otherwise use built files
  const useDevServer = process.env.USE_DEV_SERVER === 'true';
  
  if (useDevServer) {
    // Development: load from React dev server (only if explicitly enabled)
    console.log('Loading from React dev server: http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // Production: load from Express server serving static files
    console.log('Loading from Express server: http://localhost:5000');
    mainWindow.loadURL('http://localhost:5000');
  }
  
  // Log all events
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL);
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page finished loading');
  });
  
  mainWindow.webContents.on('dom-ready', () => {
    console.log('DOM ready');
  });
  
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Console ${level}]:`, message);
  });
  
  // Log page errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Page failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startServer();
  
  // Wait a bit for server to start, then create window
  setTimeout(() => {
    createWindow();
  }, 500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (server) {
    server.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (server) {
    server.close();
  }
});

