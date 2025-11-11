const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { testEndpointValidation } = require('./validationTester');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Test endpoint with streaming support
app.post('/api/test-validation', async (req, res) => {
  try {
    const { endpoint, requestBody, authToken, method = 'POST', stream } = req.body;

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
      res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in nginx

      // Progress callback to send updates
      const sendProgress = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      console.log('Starting validation test for endpoint:', endpoint);
      const startTime = Date.now();
      
      try {
        const finalResults = await testEndpointValidation(endpoint, requestBody, authToken, method, sendProgress);
        
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
      
      const results = await testEndpointValidation(endpoint, requestBody, authToken, method);
      
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

