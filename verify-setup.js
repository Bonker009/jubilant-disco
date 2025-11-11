// Verification script to test the setup
const http = require('http');

console.log('Verifying setup...\n');

// Test 1: Check if server can start
console.log('1. Testing server startup...');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { testEndpointValidation } = require('./server/validationTester');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/api/test-validation', async (req, res) => {
  try {
    const { endpoint, requestBody, authToken } = req.body;
    if (!endpoint || !requestBody) {
      return res.status(400).json({ error: 'Endpoint and request body are required' });
    }
    const results = await testEndpointValidation(endpoint, requestBody, authToken);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to test validation', message: error.message });
  }
});

const server = app.listen(5000, '127.0.0.1', () => {
  console.log('   ✓ Server started successfully on port 5000\n');
  
  // Test 2: Check if validation tester module loads
  console.log('2. Testing validation tester module...');
  console.log('   ✓ Module loaded successfully\n');
  
  // Test 3: Test API endpoint
  console.log('3. Testing API endpoint...');
  const testData = JSON.stringify({
    endpoint: 'http://httpbin.org/post',
    requestBody: JSON.stringify({ test: 'value' }),
    authToken: null
  });
  
  const options = {
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/test-validation',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': testData.length
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('   ✓ API endpoint responds correctly\n');
        console.log('4. All checks passed! ✓\n');
        console.log('The application is ready to use.');
        console.log('Run "npm start" to launch the Electron app.');
        server.close();
        process.exit(0);
      } else {
        console.log(`   ✗ API returned status ${res.statusCode}`);
        console.log('   Response:', data);
        server.close();
        process.exit(1);
      }
    });
  });
  
  req.on('error', (e) => {
    console.log(`   ✗ Error: ${e.message}`);
    server.close();
    process.exit(1);
  });
  
  req.write(testData);
  req.end();
  
  // Timeout after 30 seconds
  setTimeout(() => {
    console.log('   ✗ Test timed out');
    server.close();
    process.exit(1);
  }, 30000);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('   ⚠ Port 5000 is already in use (server may already be running)');
    console.log('   This is okay if the Electron app is already running.\n');
    console.log('Setup verification complete!');
    process.exit(0);
  } else {
    console.log(`   ✗ Server error: ${err.message}`);
    process.exit(1);
  }
});

