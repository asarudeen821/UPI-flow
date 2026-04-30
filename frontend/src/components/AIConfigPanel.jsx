import React, { useState, useEffect } from 'react';
import { getAIConfig, configureAI, testAIConnection } from '../api/services/aiService';

const AIConfigPanel = ({ onClose }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const commonModels = [
    'gpt-4o-mini',
    'gpt-4o',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
  ];

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await getAIConfig();
      setConfig(data);
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to load config: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const result = await testAIConnection();
      setTestResult(result);
      setMessage({
        type: result.success ? 'success' : 'error',
        text: result.success
          ? `Connection successful! Mode: ${result.mode}`
          : `Connection failed: ${result.error}`
      });
    } catch (error) {
      setTestResult({ success: false, error: error.message });
      setMessage({ type: 'error', text: `Test failed: ${error.message}` });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setLoading(true);
      const result = await configureAI({
        apiKey: apiKey.trim() || undefined,
        model: model || undefined,
        forceMock: !apiKey.trim()
      });
      setConfig(result);
      setMessage({
        type: 'success',
        text: result.slmMode
          ? 'AI switched to SLM mode (Small Language Model)'
          : result.mockMode
          ? 'AI switched to MOCK mode'
          : 'AI switched to REAL mode with OpenAI API'
      });
      setApiKey(''); // Clear API key after saving for security
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to save config: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToMock = async () => {
    try {
      setLoading(true);
      const result = await configureAI({ forceMock: true });
      setConfig(result);
      setMessage({ type: 'success', text: 'AI switched to MOCK mode' });
      setApiKey('');
      setTestResult(null);
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to switch: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToSLM = async () => {
    try {
      setLoading(true);
      const result = await configureAI({ forceSLM: true });
      setConfig(result);
      setMessage({ type: 'success', text: 'AI switched to SLM mode (Small Language Model) - Fast & Lightweight' });
      setApiKey('');
      setTestResult(null);
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to switch: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !config) {
    return (
      <div className="ai-config-panel">
        <div className="loading">Loading AI configuration...</div>
      </div>
    );
  }

  return (
    <div className="ai-config-panel" style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      padding: '24px',
      maxWidth: '500px',
      width: '90%',
      zIndex: 10000,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#1a1a1a' }}>AI Configuration</h2>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '0 4px',
            }}
          >
            ×
          </button>
        )}
      </div>

      {message.text && (
        <div style={{
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px',
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
          fontSize: '14px',
        }}>
          {message.text}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <div style={{
          padding: '12px',
          borderRadius: '6px',
          backgroundColor: config?.slmMode ? '#e8f5e9' : config?.mockMode ? '#fff3cd' : '#d1ecf1',
          border: `1px solid ${config?.slmMode ? '#4caf50' : config?.mockMode ? '#ffc107' : '#17a2b8'}`,
          marginBottom: '16px',
        }}>
          <strong>Current Mode:</strong>{' '}
          {config?.slmMode ? '🌱 SLM (Small Language Model)' : config?.mockMode ? '🤖 MOCK' : '🚀 REAL (OpenAI API)'}
          <br />
          <strong>Model:</strong> {config?.model || 'N/A'}
          {config?.slmAvailable && <><br /><strong>SLM Available:</strong> Yes</>}
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
          OpenAI API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
        />
        <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '4px' }}>
          Leave empty to use MOCK mode. Enter your API key to enable REAL AI.
        </small>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
          Model
        </label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: 'white',
            boxSizing: 'border-box',
          }}
        >
          {commonModels.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <button
          onClick={handleTestConnection}
          disabled={testing || config?.mockMode || config?.slmMode}
          style={{
            flex: 1,
            padding: '10px 16px',
            backgroundColor: config?.mockMode || config?.slmMode ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: config?.mockMode || config?.slmMode ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            fontSize: '14px',
            opacity: config?.mockMode || config?.slmMode ? 0.6 : 1,
          }}
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          onClick={handleSwitchToSLM}
          disabled={loading || config?.slmMode}
          style={{
            flex: 1,
            padding: '10px 16px',
            backgroundColor: config?.slmMode ? '#4caf50' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px',
            opacity: config?.slmMode ? 0.6 : 1,
          }}
        >
          🌱 Use SLM Mode
        </button>
        <button
          onClick={handleSwitchToMock}
          disabled={loading || config?.mockMode}
          style={{
            flex: 1,
            padding: '10px 16px',
            backgroundColor: config?.mockMode ? '#6c757d' : '#ffc107',
            color: config?.mockMode ? 'white' : '#333',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px',
            opacity: config?.mockMode ? 0.6 : 1,
          }}
        >
          🤖 Use Mock
        </button>
      </div>

      {testResult && (
        <div style={{
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px',
          backgroundColor: testResult.success ? '#d4edda' : '#f8d7da',
          color: testResult.success ? '#155724' : '#721c24',
          fontSize: '14px',
        }}>
          <strong>Test Result:</strong> {testResult.success ? '✓ ' : '✗ '}
          {testResult.mode === 'mock' 
            ? 'Mock mode is working correctly'
            : testResult.success 
              ? `Connected to OpenAI (${testResult.model})`
              : testResult.error
          }
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handleSaveConfig}
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
          }}
        >
          {loading ? 'Saving...' : 'Save Configuration'}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
            }}
          >
            Close
          </button>
        )}
      </div>

      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#666',
      }}>
        <strong>ℹ️ About Modes:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li><strong>🌱 SLM Mode:</strong> Small Language Model with rule-based intent detection. Fast (&lt;10ms), lightweight, no API key needed. Best for common payment queries.</li>
          <li><strong>🤖 MOCK Mode:</strong> Uses simulated responses. No API key needed. Great for testing and development.</li>
          <li><strong>🚀 REAL Mode:</strong> Uses OpenAI API for intelligent, context-aware responses. Requires valid API key. Best for complex queries.</li>
        </ul>
      </div>
    </div>
  );
};

export default AIConfigPanel;
