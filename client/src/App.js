import React, { useState } from 'react';
import './App.css';

function App() {
  const [endpoint, setEndpoint] = useState('');
  const [requestBody, setRequestBody] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [httpMethod, setHttpMethod] = useState('POST');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('input');

  const handleTest = async () => {
    if (!endpoint || !requestBody) {
      setError('Please provide both endpoint and request body');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setProgress(null);

    try {
      // Validate JSON
      JSON.parse(requestBody);

      // API endpoint - always use localhost:5000 (works in both Electron and dev)
      const apiUrl = 'http://localhost:5000/api/test-validation';
      
      // Use fetch with streaming
      console.log('Sending request to:', apiUrl);
      addLog('info', `Connecting to server at ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint,
          requestBody,
          authToken: authToken || undefined,
          method: httpMethod,
          stream: true
        })
      }).catch(fetchError => {
        console.error('Fetch failed:', fetchError);
        addLog('error', 'Network error', { error: fetchError.message });
        throw new Error(`Failed to connect to server: ${fetchError.message}. Make sure the server is running on http://localhost:5000`);
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Initialize results structure
      const initialResults = {
        endpoint,
        summary: {
          totalFields: 0,
          properlyValidated: 0,
          notValidated: 0,
          errors: []
        },
        fieldResults: {},
        timestamp: new Date().toISOString()
      };
      setResults(initialResults);

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              handleStreamEvent(data, initialResults);
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.slice(6));
          handleStreamEvent(data, initialResults);
        } catch (e) {
          console.error('Error parsing SSE data:', e);
        }
      }

    } catch (err) {
      console.error('Fetch error:', err);
      addLog('error', `Request failed: ${err.message}`, { error: err.message, stack: err.stack });
      
      if (err.message.includes('JSON')) {
        setError('Invalid JSON format in request body');
      } else if (err.message.includes('fetch') || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setError('Failed to connect to server. Make sure the server is running on http://localhost:5000');
      } else {
        setError(err.message || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const addLog = (type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { type, message, data, timestamp }]);
  };

  const handleStreamEvent = (data, initialResults) => {
    // Add log entry for each event
    if (data.type === 'test-result') {
      addLog('test', `[${data.fieldName}] ${data.testName}`, {
        statusCode: data.statusCode,
        handled: data.handled,
        requestBody: data.requestBody,
        response: data.response
      });
    } else if (data.type === 'baseline') {
      addLog('baseline', 'Baseline Request', {
        statusCode: data.statusCode,
        response: data.response
      });
    } else if (data.type === 'start') {
      addLog('info', `Starting validation test for ${data.totalFields} fields`);
    } else if (data.type === 'field-complete') {
      addLog('info', `Completed field: ${data.fieldName}`);
    } else if (data.type === 'summary') {
      addLog('info', 'All tests completed!');
    }
    
    setResults(prev => {
      const current = prev || initialResults;
      const updated = { ...current };

      switch (data.type) {
        case 'start':
          updated.summary.totalFields = data.totalFields || 0;
          updated.summary.properlyValidated = 0;
          updated.summary.notValidated = 0;
          setProgress({ message: `Starting test for ${data.totalFields} fields...` });
          break;

        case 'baseline':
          updated.summary.baseline = {
            statusCode: data.statusCode,
            response: data.response
          };
          setProgress({ message: 'Baseline test completed' });
          break;

        case 'test-result':
          // Update field result with new test
          if (!updated.fieldResults[data.fieldName]) {
            updated.fieldResults[data.fieldName] = {
              testResults: [],
              handledCount: 0,
              totalTests: 0,
              originalValue: null,
              originalType: 'unknown'
            };
          }
          const field = updated.fieldResults[data.fieldName];
          if (!field.testResults) {
            field.testResults = [];
          }
          // Check if this test already exists (avoid duplicates)
          const testExists = field.testResults.some(t => 
            t.testCase === data.testName && t.statusCode === data.statusCode
          );
          if (!testExists) {
            field.testResults.push({
              testCase: data.testName,
              value: data.testValue,
              statusCode: data.statusCode,
              handled: data.handled,
              requestBody: data.requestBody,
              response: data.response
            });
            if (data.handled) {
              field.handledCount = (field.handledCount || 0) + 1;
            }
            field.totalTests = (field.totalTests || 0) + 1;
          }
          setProgress({ 
            message: `Testing ${data.fieldName}: ${data.testName} - Status: ${data.statusCode}` 
          });
          break;

        case 'field-complete':
          if (updated.fieldResults[data.fieldName]) {
            // Update field with completion data
            updated.fieldResults[data.fieldName].properlyValidated = data.isProperlyValidated;
            updated.fieldResults[data.fieldName].validationScore = 
              `${((data.handledCount / data.totalTests) * 100).toFixed(1)}%`;
            // Also preserve originalValue and originalType if they exist in fieldResult
            if (data.fieldResult) {
              if (data.fieldResult.originalValue !== undefined) {
                updated.fieldResults[data.fieldName].originalValue = data.fieldResult.originalValue;
              }
              if (data.fieldResult.originalType !== undefined) {
                updated.fieldResults[data.fieldName].originalType = data.fieldResult.originalType;
              }
            }
          }
          // Recalculate summary counts from all completed fields
          // Only update if we haven't received a final summary yet
          let validatedCount = 0;
          let notValidatedCount = 0;
          Object.values(updated.fieldResults).forEach(field => {
            if (field.properlyValidated === true) {
              validatedCount++;
            } else if (field.properlyValidated === false) {
              notValidatedCount++;
            }
          });
          // Only update if we have actual counts (don't overwrite server's final summary)
          if (validatedCount > 0 || notValidatedCount > 0 || Object.keys(updated.fieldResults).length === updated.summary.totalFields) {
            updated.summary.properlyValidated = validatedCount;
            updated.summary.notValidated = notValidatedCount;
          }
          setProgress({ message: `Completed field: ${data.fieldName}` });
          break;

        case 'summary':
          // Use the summary data from server (it has the correct counts)
          console.log('Summary event received - full data:', JSON.stringify(data, null, 2));
          if (data.summary) {
            // Always use server's summary values - they are authoritative
            // Use explicit typeof checks to handle 0 values correctly
            updated.summary = {
              totalFields: typeof data.summary.totalFields === 'number' ? data.summary.totalFields : (typeof updated.summary.totalFields === 'number' ? updated.summary.totalFields : 0),
              properlyValidated: typeof data.summary.properlyValidated === 'number' ? data.summary.properlyValidated : (typeof updated.summary.properlyValidated === 'number' ? updated.summary.properlyValidated : 0),
              notValidated: typeof data.summary.notValidated === 'number' ? data.summary.notValidated : (typeof updated.summary.notValidated === 'number' ? updated.summary.notValidated : 0),
              errors: data.summary.errors || updated.summary.errors || [],
              baseline: data.summary.baseline || updated.summary.baseline
            };
            console.log('Updated summary from server:', updated.summary);
          } else {
            console.warn('Summary event received but data.summary is missing!');
          }
          // Merge field results: preserve streamed testResults, but get other properties from server
          if (data.fieldResults) {
            Object.keys(data.fieldResults).forEach(fieldName => {
              const serverField = data.fieldResults[fieldName];
              const clientField = updated.fieldResults[fieldName];
              
              if (clientField && clientField.testResults && clientField.testResults.length > 0) {
                // Keep streamed testResults, but update other properties from server
                updated.fieldResults[fieldName] = {
                  ...serverField,
                  testResults: clientField.testResults, // Keep streamed results
                  handledCount: clientField.handledCount || serverField.handledCount || 0,
                  totalTests: clientField.totalTests || serverField.totalTests || 0
                };
              } else {
                // Use server data if no streamed results
                updated.fieldResults[fieldName] = serverField;
              }
            });
          }
          setProgress({ message: 'All tests completed!' });
          break;

        case 'final-summary':
          // Final summary from server - use this as authoritative source
          console.log('Final summary received:', data);
          if (data.summary) {
            // Use typeof checks to correctly handle 0 values
            updated.summary = {
              totalFields: typeof data.summary.totalFields === 'number' ? data.summary.totalFields : 0,
              properlyValidated: typeof data.summary.properlyValidated === 'number' ? data.summary.properlyValidated : 0,
              notValidated: typeof data.summary.notValidated === 'number' ? data.summary.notValidated : 0,
              errors: data.summary.errors || [],
              baseline: data.summary.baseline || updated.summary.baseline
            };
            console.log('Final summary applied:', updated.summary);
          }
          if (data.fieldResults) {
            // Merge field results
            Object.keys(data.fieldResults).forEach(fieldName => {
              const serverField = data.fieldResults[fieldName];
              const clientField = updated.fieldResults[fieldName];
              
              if (clientField && clientField.testResults && clientField.testResults.length > 0) {
                updated.fieldResults[fieldName] = {
                  ...serverField,
                  testResults: clientField.testResults
                };
              } else {
                updated.fieldResults[fieldName] = serverField;
              }
            });
          }
          setProgress({ message: 'Test completed successfully' });
          break;

        case 'complete':
          setProgress({ message: 'Test completed successfully' });
          break;

        case 'error':
          setError(data.error);
          break;

        default:
          // Unknown event type, ignore
          break;
      }

      return updated;
    });
  };

  const formatValue = (value) => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const isLongValue = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.length > 50;
    if (typeof value === 'object') {
      const str = JSON.stringify(value);
      return str.length > 50;
    }
    return String(value).length > 50;
  };

  const formatValueShort = (value) => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') {
      if (value.length > 50) {
        return `"${value.substring(0, 47)}..." (${value.length} chars)`;
      }
      return `"${value}"`;
    }
    if (typeof value === 'object') {
      const str = JSON.stringify(value);
      if (str.length > 50) {
        return `${str.substring(0, 47)}... (${str.length} chars)`;
      }
      return str;
    }
    const str = String(value);
    if (str.length > 50) {
      return `${str.substring(0, 47)}... (${str.length} chars)`;
    }
    return str;
  };

  return (
    <div className="App">
      <div className="container">
        <h1>API Endpoint Validation Tester</h1>
        <p className="subtitle">Test your API endpoints for proper validation handling</p>

        {/* Input Tab */}
        {activeTab === 'input' && (
          <div className="input-section">
            <div className="input-group">
              <label htmlFor="method">HTTP Method</label>
              <select
                id="method"
                value={httpMethod}
                onChange={(e) => setHttpMethod(e.target.value)}
                className="method-select"
              >
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="endpoint">{httpMethod} Endpoint URL</label>
              <input
                id="endpoint"
                type="text"
                placeholder="https://api.example.com/v1/users"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="token">Authorization Token (Optional)</label>
              <input
                id="token"
                type="text"
                placeholder="Bearer token or API key"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="body">Request Body (JSON)</label>
              <textarea
                id="body"
                placeholder='{"field1": "value1", "field2": 123}'
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                rows="10"
              />
            </div>

            <button 
              className="test-button" 
              onClick={handleTest}
              disabled={loading}
            >
              {loading ? 'Testing...' : 'Start Validation Test'}
            </button>
          </div>
        )}

        {progress && (
          <div className="progress-message" style={{ 
            padding: '10px', 
            margin: '10px 0', 
            background: '#1a1a1a', 
            border: '1px solid #333',
            borderRadius: '4px',
            color: '#fff'
          }}>
            {progress.message}
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="tabs-container">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'input' ? 'active' : ''}`}
              onClick={() => setActiveTab('input')}
            >
              Input
            </button>
            <button 
              className={`tab ${activeTab === 'results' ? 'active' : ''}`}
              onClick={() => setActiveTab('results')}
              disabled={!results}
            >
              Results {results && `(${Object.keys(results.fieldResults || {}).length})`}
            </button>
            <button 
              className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
              disabled={logs.length === 0}
            >
              Monitoring Logs {logs.length > 0 && `(${logs.length})`}
            </button>
          </div>
        </div>

        {/* Monitoring Logs Tab */}
        {activeTab === 'logs' && (
          <div className="logs-section">
            <div className="logs-header">
              <h2>Request & Response Monitoring</h2>
              <button 
                className="clear-logs-button"
                onClick={() => setLogs([])}
              >
                Clear Logs
              </button>
            </div>
            <div className="logs-container">
              {logs.length === 0 ? (
                <div className="no-logs">No logs yet. Start a test to see requests and responses.</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className={`log-entry log-${log.type}`}>
                    <div className="log-header">
                      <span className="log-timestamp">[{log.timestamp}]</span>
                      <span className="log-type">{log.type.toUpperCase()}</span>
                      <span className="log-message">{log.message}</span>
                    </div>
                    {log.data && (
                      <div className="log-details">
                        {log.data.statusCode && (
                          <div className="log-status">
                            <strong>Status Code:</strong> <span className={`status-${Math.floor(log.data.statusCode / 100)}xx`}>{log.data.statusCode}</span>
                          </div>
                        )}
                        {log.data.handled !== undefined && (
                          <div className="log-handled">
                            <strong>Handled:</strong> <span className={log.data.handled ? 'handled-yes' : 'handled-no'}>
                              {log.data.handled ? '✓ Yes' : '✗ No'}
                            </span>
                          </div>
                        )}
                        {log.data.requestBody && (
                          <details className="log-request">
                            <summary>Request Body</summary>
                            <pre>{JSON.stringify(log.data.requestBody, null, 2)}</pre>
                          </details>
                        )}
                        {log.data.response && (
                          <details className="log-response">
                            <summary>Response</summary>
                            <pre>{JSON.stringify(log.data.response, null, 2)}</pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && results && (
          <div className="results-section">
            <div className="report-header">
              <h2>Validation Report</h2>
              <div className="report-timestamp">{new Date(results.timestamp).toLocaleString()}</div>
            </div>
            
            <div className="summary-cards">
              <div className="summary-card">
                <div className="summary-icon">📊</div>
                <div className="summary-content">
                  <div className="summary-label">Total Fields</div>
                  <div className="summary-value">{results.summary.totalFields}</div>
                </div>
              </div>
              <div className={`summary-card success ${results.summary.properlyValidated > 0 ? 'has-value' : ''}`}>
                <div className="summary-icon">✓</div>
                <div className="summary-content">
                  <div className="summary-label">Validated</div>
                  <div className="summary-value">{results.summary.properlyValidated}</div>
                  <div className="summary-percentage">
                    {results.summary.totalFields > 0 
                      ? Math.round((results.summary.properlyValidated / results.summary.totalFields) * 100) 
                      : 0}%
                  </div>
                </div>
              </div>
              <div className={`summary-card warning ${results.summary.notValidated > 0 ? 'has-value' : ''}`}>
                <div className="summary-icon">✗</div>
                <div className="summary-content">
                  <div className="summary-label">Not Validated</div>
                  <div className="summary-value">{results.summary.notValidated}</div>
                  <div className="summary-percentage">
                    {results.summary.totalFields > 0 
                      ? Math.round((results.summary.notValidated / results.summary.totalFields) * 100) 
                      : 0}%
                  </div>
                </div>
              </div>
            </div>

            {results.summary.baseline && (
              <div className="baseline-section">
                <div className="section-title">
                  <span>Baseline Response</span>
                  <span className="status-badge">{results.summary.baseline.statusCode || 'N/A'}</span>
                </div>
                {results.summary.baseline.response && (
                  <div className="baseline-content">
                    <pre>{JSON.stringify(results.summary.baseline.response, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            <div className="fields-section">
              <div className="section-title">Field Validation Details</div>
              <div className="field-results">
                {Object.entries(results.fieldResults).map(([fieldName, fieldData]) => (
                  <div 
                    key={fieldName} 
                    className={`field-card ${fieldData.properlyValidated ? 'validated' : 'not-validated'}`}
                  >
                    <div className="field-header-new">
                      <div className="field-title-section">
                        <h3 className="field-name">{fieldName}</h3>
                        <span className="field-type-badge">{fieldData.originalType}</span>
                      </div>
                      <div className="field-status-section">
                        <div className={`validation-badge ${fieldData.properlyValidated ? 'validated' : 'not-validated'}`}>
                          {fieldData.properlyValidated ? '✓ VALIDATED' : '✗ NOT VALIDATED'}
                        </div>
                        {fieldData.validationScore && (
                          <div className="validation-score">{fieldData.validationScore}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="field-original">
                      <span className="field-label">Original Value:</span>
                      <span className="field-value">{formatValue(fieldData.originalValue)}</span>
                    </div>

                    {fieldData.testResults && (
                      <div className="test-results-section">
                        <div className="test-results-header">
                          <span>Test Cases ({fieldData.handledCount}/{fieldData.totalTests} handled)</span>
                          <div className="test-progress-bar">
                            <div 
                              className="test-progress-fill" 
                              style={{ width: `${(fieldData.handledCount / fieldData.totalTests) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="test-grid">
                          {fieldData.testResults.map((test, idx) => (
                            <div 
                              key={idx} 
                              className={`test-item ${test.handled ? 'handled' : 'not-handled'}`}
                            >
                              <div className="test-header">
                                <span className="test-name">{test.testCase}</span>
                                <span className={`test-indicator ${test.handled ? 'handled' : 'not-handled'}`}>
                                  {test.handled ? '✓' : '✗'}
                                </span>
                              </div>
                              <div className="test-details">
                                <div className="test-value-row">
                                  <span className="test-label">Value:</span>
                                  {isLongValue(test.value) ? (
                                    <details className="test-value-dropdown">
                                      <summary className="test-value-summary">
                                        {formatValueShort(test.value)}
                                      </summary>
                                      <div className="test-value-full">
                                        {formatValue(test.value)}
                                      </div>
                                    </details>
                                  ) : (
                                    <span className="test-value-text">{formatValue(test.value)}</span>
                                  )}
                                </div>
                                <div className="test-status-row">
                                  <span className="test-label">Status:</span>
                                  <span className="test-status-code">{test.statusCode || 'Error'}</span>
                                </div>
                              </div>
                              {test.requestBody && (
                                <details className="test-request-body">
                                  <summary>View Request Body</summary>
                                  <pre>{JSON.stringify(test.requestBody, null, 2)}</pre>
                                </details>
                              )}
                              {test.response && (
                                <details className="test-response">
                                  <summary>View Response</summary>
                                  <pre>{JSON.stringify(test.response, null, 2)}</pre>
                                </details>
                              )}
                              {test.error && (
                                <div className="test-error">Error: {test.error}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {fieldData.error && (
                      <div className="field-error">Error: {fieldData.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

