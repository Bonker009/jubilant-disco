const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * Test validation for a single field by sending different value types
 */
async function testFieldValidation(endpoint, baseBody, fieldName, originalValue, authToken, method = 'POST', progressCallback = null) {
  const testCases = [
    { name: 'null', value: null },
    { name: 'undefined', value: undefined },
    { name: 'empty string', value: '' },
    { name: 'number (0)', value: 0 },
    { name: 'number (negative)', value: -1 },
    { name: 'number (large)', value: 999999999 },
    { name: 'boolean (true)', value: true },
    { name: 'boolean (false)', value: false },
    { name: 'array', value: [] },
    { name: 'object', value: {} },
    { name: 'string (special chars)', value: '!@#$%^&*()' },
    { name: 'string (very long)', value: 'a'.repeat(10000) },
  ];

  // Add type-specific tests based on original value
  if (typeof originalValue === 'string') {
    testCases.push(
      { name: 'number as string', value: '123' },
      { name: 'boolean as string', value: 'true' }
    );
  } else if (typeof originalValue === 'number') {
    testCases.push(
      { name: 'string', value: 'test' },
      { name: 'float', value: 3.14 }
    );
  } else if (typeof originalValue === 'boolean') {
    testCases.push(
      { name: 'string', value: 'test' },
      { name: 'number (1)', value: 1 },
      { name: 'number (0)', value: 0 }
    );
  }

  const results = [];

  for (const testCase of testCases) {
    // Create a deep copy of the base body (preserves ALL original fields)
    // Then modify ONLY the field being tested, keeping all other fields unchanged
    const testBody = JSON.parse(JSON.stringify(baseBody));
    
    if (testCase.value === undefined) {
      // Remove the field entirely for undefined test
      delete testBody[fieldName];
    } else {
      // Replace ONLY this field with test value, all other fields remain as original
      testBody[fieldName] = testCase.value;
    }
    
    // testBody now contains the complete original request body
    // with ONLY the tested field changed to the test case value
    
    // No delay - maximum performance (server should handle concurrent requests)
    try {
      // Log the test to terminal
      console.log(`\n[TEST] Field: ${fieldName}, Test: ${testCase.name}`);
      console.log(`[REQUEST] ${method} ${endpoint}`);
      
      // Make HTTP request using Node.js built-in modules
      const result = await makeHttpRequest(endpoint, testBody, authToken, method);
      const statusCode = result.statusCode;
      const responseBody = result.response;
      
      // Log response status to terminal
      console.log(`[RESPONSE] Status: ${statusCode}`);
      
      // Send test result progress
      if (progressCallback) {
        const handled = isValidationError(statusCode, responseBody);
        
        progressCallback({
          type: 'test-result',
          fieldName,
          testName: testCase.name,
          testValue: testCase.value,
          statusCode,
          handled,
          requestBody: testBody,
          response: responseBody
        });
      }

      // Determine if the field is properly validated
      // 4xx = Client errors (validation errors) - COUNT AS VALIDATED
      // 5xx = Server errors (internal errors) - DO NOT COUNT AS VALIDATED
      // 2xx with validation error message - COUNT AS VALIDATED
      let handled = false;
      if (statusCode !== null && statusCode !== undefined) {
        if (statusCode >= 400 && statusCode < 500) {
          // 4xx status codes = validation errors (bad request, unauthorized, etc.)
          handled = true;
        } else if (statusCode >= 200 && statusCode < 300) {
          // 2xx status codes - check if response contains validation error message
          handled = isValidationError(responseBody);
        } else if (statusCode >= 500) {
          // 5xx status codes = server errors (should NOT count as validated)
          handled = false;
        }
        // Other status codes (1xx, 3xx) are not counted as validated
      }

      results.push({
        testCase: testCase.name,
        value: testCase.value,
        requestBody: testBody, // Include the full request body
        statusCode: statusCode,
        response: responseBody,
        error: null,
        handled: handled
      });
    } catch (error) {
      // Better error message for network issues
      let errorMessage = error.message;
      
      // Log the error
      console.log(`[ERROR] ${errorMessage}`);
      
      results.push({
        testCase: testCase.name,
        value: testCase.value,
        requestBody: testBody, // Include the full request body even on error
        statusCode: null,
        response: null,
        error: errorMessage,
        handled: false
      });
    }
  }

  return results;
}

/**
 * Make HTTP request using Node.js built-in http/https modules
 * This is more reliable than curl and works consistently across all platforms
 */
function makeHttpRequest(endpoint, body, authToken, method = 'POST') {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(endpoint);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const jsonBody = JSON.stringify(body);
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: method.toUpperCase(), // Support POST, PUT, etc.
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(jsonBody)
        },
        timeout: 10000 // 10 second timeout
      };
      
      if (authToken) {
        options.headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const req = client.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          let parsedBody;
          try {
            parsedBody = JSON.parse(responseData);
          } catch {
            parsedBody = responseData || '';
          }
          
          resolve({
            statusCode: res.statusCode,
            response: parsedBody,
            headers: res.headers
          });
        });
      });
      
      req.on('error', (error) => {
        let errorMessage = error.message;
        if (error.code === 'ECONNREFUSED') {
          errorMessage = 'Connection refused - endpoint is not reachable';
        } else if (error.code === 'ENOTFOUND') {
          errorMessage = 'Host not found - check the endpoint URL';
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
          errorMessage = 'Request timeout - endpoint did not respond in time';
        }
        reject(new Error(errorMessage));
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout - endpoint did not respond in time'));
      });
      
      // Write request body
      req.write(jsonBody);
      req.end();
      
    } catch (error) {
      reject(new Error(`Invalid endpoint URL: ${error.message}`));
    }
  });
}

/**
 * Check if response indicates a validation error (not a server error)
 * This is used for 2xx responses that might contain validation error messages
 */
function isValidationError(response) {
  if (!response) return false;
  
  const responseStr = typeof response === 'string' 
    ? response.toLowerCase() 
    : JSON.stringify(response).toLowerCase();
  
  // Check for validation-related keywords
  const validationKeywords = [
    'validation',
    'invalid',
    'required',
    'bad request',
    'unprocessable',
    'constraint',
    'format',
    'pattern',
    'type error',
    'must be',
    'should be',
    'expected'
  ];
  
  // Exclude server error keywords
  const serverErrorKeywords = [
    'internal server error',
    'server error',
    'database error',
    'connection error',
    'timeout',
    'service unavailable'
  ];
  
  // If it contains server error keywords, it's NOT a validation error
  if (serverErrorKeywords.some(keyword => responseStr.includes(keyword))) {
    return false;
  }
  
  // Check if it contains validation keywords
  return validationKeywords.some(keyword => responseStr.includes(keyword));
}

/**
 * Main function to test endpoint validation
 * @param {Function} progressCallback - Optional callback to send progress updates
 */
async function testEndpointValidation(endpoint, requestBody, authToken, method = 'POST', progressCallback = null) {
  // Parse the request body (handle both string and object)
  const body = typeof requestBody === 'string' ? JSON.parse(requestBody) : requestBody;
  const fields = Object.keys(body);
  
  // Store the original body to use as base for all tests
  // Each test will send the COMPLETE body with only one field modified
  
  const fieldResults = {};
  const summary = {
    totalFields: fields.length,
    properlyValidated: 0,
    notValidated: 0,
    errors: []
  };

  // Send initial progress
  if (progressCallback) {
    progressCallback({
      type: 'start',
      endpoint,
      totalFields: fields.length
    });
  }

  // First, test the original request to get baseline
  try {
    // Log baseline request to terminal
    console.log('\n[BASELINE] Testing original request body');
    console.log(`[REQUEST] ${method} ${endpoint}`);
    
    // Make HTTP request using Node.js built-in modules
    const result = await makeHttpRequest(endpoint, body, authToken, method);
    const statusCode = result.statusCode;
    const responseBody = result.response;
    
    // Log baseline response status
    console.log(`[RESPONSE] Status: ${statusCode}`);
    
    summary.baseline = {
      statusCode,
      response: responseBody,
      error: null
    };
  } catch (error) {
    summary.baseline = {
      statusCode: null,
      response: null,
      error: error.message
    };
    summary.errors.push(`Baseline test failed: ${error.message}`);
  }

  // Test each field
  // For each field, we send the COMPLETE original body with only that field modified
  for (const fieldName of fields) {
    try {
      // Pass the original body as base - testFieldValidation will create copies
      // and modify only the field being tested, keeping all other fields unchanged
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Testing field: ${fieldName}`);
      console.log(`${'='.repeat(60)}`);
      const results = await testFieldValidation(
        endpoint, 
        body, // Original complete body - all fields preserved
        fieldName, 
        body[fieldName], 
        authToken,
        method,
        progressCallback
      );
      console.log(`\n✓ Completed testing field: ${fieldName} (${results.length} test cases)`);
      
      const handledCount = results.filter(r => r.handled).length;
      const totalTests = results.length;
      const isProperlyValidated = handledCount / totalTests > 0.7; // 70% threshold
      
      fieldResults[fieldName] = {
        originalValue: body[fieldName],
        originalType: typeof body[fieldName],
        testResults: results,
        handledCount,
        totalTests,
        properlyValidated: isProperlyValidated,
        validationScore: (handledCount / totalTests * 100).toFixed(1) + '%'
      };

      if (isProperlyValidated) {
        summary.properlyValidated++;
      } else {
        summary.notValidated++;
      }
      
      // Send field completion progress
      if (progressCallback) {
        progressCallback({
          type: 'field-complete',
          fieldName,
          handledCount,
          totalTests,
          isProperlyValidated,
          fieldResult: fieldResults[fieldName]
        });
      }
    } catch (error) {
      fieldResults[fieldName] = {
        error: error.message,
        properlyValidated: false
      };
      summary.errors.push(`Field ${fieldName} test failed: ${error.message}`);
    }
  }

  // Send final summary
  if (progressCallback) {
    progressCallback({
      type: 'summary',
      summary,
      fieldResults
    });
  }

  return {
    endpoint,
    summary,
    fieldResults,
    timestamp: new Date().toISOString()
  };
}

module.exports = { testEndpointValidation };

