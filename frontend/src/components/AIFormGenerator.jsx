import { useState, useEffect } from 'react';
import { Wand2, Loader2, Copy, Check, QrCode, Save, ExternalLink, Sparkles } from 'lucide-react';
import { generateForm as generateFormAPI } from '../api/services/aiService';

const API_BASE = '';

export default function AIFormGenerator() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [formConfig, setFormConfig] = useState(null);
  const [savedForm, setSavedForm] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);
  
  // Form save fields
  const [upiId, setUpiId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    import('../api/services/aiService').then(({ checkAIStatus }) => {
      checkAIStatus().then((status) => {
        setAiAvailable(status.available);
        setIsMockMode(status.mockMode || false);
      });
    });
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setFormConfig(null);
    setSavedForm(null);
    setQrCode(null);

    try {
      const config = await generateFormAPI(prompt);
      setFormConfig(config);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveForm = async () => {
    if (!formConfig) return;
    if (!upiId.trim()) {
      setError('UPI ID is required to save the form');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/ai/form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          save: true,
          upiId: upiId.trim(),
          recipientName: recipientName.trim() || formConfig.title,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save form');
      }

      setSavedForm(data.data);
      setQrCode(data.data.qrCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateQR = async () => {
    if (!savedForm) return;

    try {
      const res = await fetch(`${API_BASE}/api/payment-forms/qr/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: savedForm.slug }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate QR');
      }

      setQrCode(data.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(formConfig, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFormPageUrl = () => {
    if (!savedForm) return '#';
    return `${window.location.origin}/payment/${savedForm.slug}`;
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* AI Unavailable Fallback */}
      {!aiAvailable && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-yellow-600 text-2xl">⚠️</div>
            <h3 className="text-lg font-semibold text-yellow-800">AI Features Unavailable</h3>
          </div>
          <p className="text-sm text-yellow-700 mb-3">
            The AI form generator requires an OpenAI API key to be configured on the backend.
          </p>
          <p className="text-xs text-yellow-600">
            Contact your administrator or add <code className="bg-yellow-100 px-1 py-0.5 rounded">OPENAI_API_KEY</code> to backend environment variables.
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Wand2 className="text-purple-600" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">AI Form Generator</h2>
            <p className="text-sm text-gray-600">Describe your payment form in plain English</p>
            {isMockMode && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded mt-1 inline-block">
                ✨ Demo Mode - AI responses are simulated
              </span>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe your payment form
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: Create a donation form with quick amounts ₹100, ₹500, ₹1000 and allow custom amounts. Include name and email fields."
            className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            disabled={loading || saving}
          />
          <div className="mt-3 flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim() || !aiAvailable}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 size={18} />
                  Generate Form
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Generated Form Config */}
        {formConfig && !savedForm && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Generated Form Config</h3>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy JSON'}
              </button>
            </div>

            {/* Preview */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="text-purple-600" size={20} />
                <h4 className="font-bold text-lg text-gray-800">{formConfig.title}</h4>
              </div>
              <p className="text-sm text-gray-600 mb-4">{formConfig.description}</p>

              {formConfig.quickAmounts && formConfig.quickAmounts.length > 0 && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Quick Amounts</label>
                  <div className="flex gap-2 flex-wrap">
                    {formConfig.quickAmounts.map((amt, i) => (
                      <button key={i} className="px-4 py-2 bg-purple-100 text-purple-800 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors">
                        ₹{amt}
                      </button>
                    ))}
                    {formConfig.allowCustomAmount && (
                      <button className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors">
                        Custom Amount
                      </button>
                    )}
                  </div>
                </div>
              )}

              {formConfig.fields && formConfig.fields.length > 0 && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Form Fields</label>
                  <div className="space-y-3">
                    {formConfig.fields.map((field, i) => (
                      <div key={i}>
                        <label className="text-sm text-gray-600 mb-1 block">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {field.type === 'select' ? (
                          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                            <option>Select {field.label}...</option>
                            {field.options?.map((opt, j) => (
                              <option key={j}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            disabled
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Save Form Section */}
              <div className="mt-6 pt-6 border-t border-purple-200">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Save size={18} className="text-purple-600" />
                  Save Form & Generate QR Code
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      UPI ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="yourname@upi"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recipient Name
                    </label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder={formConfig.title}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                      disabled={saving}
                    />
                  </div>
                </div>
                <button
                  onClick={handleSaveForm}
                  disabled={saving || !upiId.trim()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving & Generating QR...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Form & Generate QR
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* JSON Output */}
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
              <pre className="text-xs">{JSON.stringify(formConfig, null, 2)}</pre>
            </div>
          </div>
        )}

        {/* Saved Form with QR Code */}
        {savedForm && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Check className="text-green-600" size={20} />
                Form Saved Successfully!
              </h3>
              <button
                onClick={() => {
                  setFormConfig(null);
                  setSavedForm(null);
                  setQrCode(null);
                  setUpiId('');
                  setRecipientName('');
                }}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Generate Another Form
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Form Details */}
              <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                <h4 className="font-bold text-lg text-gray-800 mb-2">{savedForm.title}</h4>
                <p className="text-sm text-gray-600 mb-4">{savedForm.description}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Form ID:</span>
                    <span className="font-mono text-gray-800">{savedForm.formId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Slug:</span>
                    <span className="font-mono text-gray-800">{savedForm.slug}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Currency:</span>
                    <span className="font-medium text-gray-800">{savedForm.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quick Amounts:</span>
                    <span className="font-medium text-gray-800">
                      {savedForm.quickAmounts?.map(a => `₹${a}`).join(', ') || 'None'}
                    </span>
                  </div>
                </div>

                <a
                  href={getFormPageUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  <ExternalLink size={16} />
                  Open Payment Page
                </a>
              </div>

              {/* QR Code */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <QrCode className="text-blue-600" size={20} />
                  <h4 className="font-bold text-gray-800">Payment QR Code</h4>
                </div>
                
                {qrCode ? (
                  <div className="space-y-3">
                    <img
                      src={qrCode.qr_image_url}
                      alt="Payment QR Code"
                      className="w-full h-auto border border-gray-200 rounded-lg"
                    />
                    <p className="text-xs text-gray-600 text-center">
                      Scan to pay via UPI
                    </p>
                    <div className="text-xs text-gray-500 font-mono break-all bg-gray-50 p-2 rounded">
                      {qrCode.upi_string}
                    </div>
                    <button
                      onClick={handleRegenerateQR}
                      className="w-full text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Regenerate QR
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <QrCode size={48} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">QR code not generated</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
