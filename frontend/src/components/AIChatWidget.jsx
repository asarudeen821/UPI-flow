import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, Headphones, Sparkles, Play, Settings, Briefcase } from 'lucide-react';
import { merchantAssist, supportChat, executeMerchantAction, businessChat, getAIConfig } from '../api/services/aiService';
import { cn } from '../lib/utils';
import AIConfigPanel from './AIConfigPanel';

const QUICK_PROMPTS = {
  merchant: [
    'Generate QR for ₹500',
    'Show my analytics',
    'Create a payment link',
    'Create payment page for my shop',
  ],
  support: [
    'Why did my payment fail?',
    'What are UPI transfer limits?',
    'How do I get a refund?',
    'Is my money safe here?',
  ],
  business: [
    'Create payment link for ₹299',
    'Show revenue this week',
    'Generate QR code for my shop',
    'Search failed payments',
  ],
};

const WELCOME = {
  merchant: '👋 Hi! I\'m your **Merchant Assistant**.\n\nI can help you:\n- Generate QR codes & payment links\n- Create payment pages\n- Show analytics & insights\n\nWhat would you like to do?',
  support: '👋 Hi! I\'m your **Support Assistant**.\n\nI can help you with:\n- Payment failures & troubleshooting\n- UPI transfer limits & FAQs\n- Refund process guidance\n- Transaction status queries\n\nHow can I help you today?',
  business: '👋 Hi! I\'m your **Business Dashboard AI**.\n\nI can execute actions via chat:\n- "Create payment link for ₹299"\n- "Show revenue this week"\n- "Generate QR code"\n- "Search failed payments"\n\nWhat would you like to do?',
};

function formatContent(text) {
  // Simple markdown-like formatting without react-markdown
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-xs font-mono">$1</code>')
    .replace(/\n/g, '<br/>');
}

function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={cn('flex gap-2 mb-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[82%] px-3 py-2 rounded-2xl text-xs leading-relaxed',
          isUser
            ? 'bg-purple-600 text-white rounded-br-sm'
            : msg.isError
            ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-bl-sm'
            : msg.isSuccess
            ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200 border border-green-200 dark:border-green-800 rounded-bl-sm'
            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm shadow-sm'
        )}
      >
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <p dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2 mb-3">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center shrink-0">
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="px-3 py-2.5 rounded-2xl rounded-bl-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

// Action Result Display Component
function ActionResult({ action, result }) {
  if (!result) return null;

  const renderResult = () => {
    switch (action) {
      case 'generate_payment_link':
      case 'create_payment_link': {
        const url = result.url || result.data?.url;
        const amount = result.amount || result.data?.amount;
        const recipient = result.recipientName || result.data?.recipientName || result.recipient_name;
        return (
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">🔗 Payment Link Created & Saved</p>
            {recipient && <p className="text-xs text-blue-600 dark:text-blue-400">For: {recipient}</p>}
            {amount && <p className="text-xs font-bold text-blue-700 dark:text-blue-300">₹{amount}</p>}
            {url && (
              <div className="mt-2 flex items-center gap-2">
                <a href={url} target="_blank" rel="noopener noreferrer"
                   className="text-xs text-blue-600 dark:text-blue-400 underline break-all flex-1">
                  {url}
                </a>
                <button
                  onClick={() => navigator.clipboard.writeText(url)}
                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shrink-0"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        );
      }

      case 'generate_qr_code':
      case 'generate_qr': {
        const qrImg = result.qrImageUrl || result.qr_image_url || result.data?.qrImageUrl || result.data?.qr_image_url;
        const upiStr = result.upiString || result.upi_string || result.data?.upiString;
        const amount = result.amount || result.data?.amount;
        const upiId = result.upiId || result.upi_id || result.data?.upiId;
        const recipient = result.recipientName || result.recipient_name || result.data?.recipientName;
        return (
          <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <p className="text-xs font-semibold text-green-800 dark:text-green-200 mb-2">📱 QR Code Created & Saved</p>
            {qrImg && (
              <div className="flex justify-center mb-2">
                <img src={qrImg} alt="UPI QR Code" className="w-36 h-36 rounded-lg border border-green-200" />
              </div>
            )}
            <div className="space-y-1 text-xs">
              {upiId && <p className="text-green-700 dark:text-green-300">UPI: <span className="font-mono font-medium">{upiId}</span></p>}
              {recipient && <p className="text-green-700 dark:text-green-300">To: {recipient}</p>}
              {amount && <p className="font-bold text-green-800 dark:text-green-200">₹{amount}</p>}
            </div>
            {upiStr && (
              <button
                onClick={() => navigator.clipboard.writeText(upiStr)}
                className="mt-2 w-full text-xs py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Copy UPI Link
              </button>
            )}
          </div>
        );
      }

      case 'show_analytics': {
        const revenue = result.revenue || {};
        const convRate = result.conversion_rate;
        const peakHour = result.peak_hour;
        const totalQR = result.total_qr_codes;
        const totalLinks = result.total_payment_links;
        return (
          <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
            <p className="text-xs font-semibold text-purple-800 dark:text-purple-200 mb-2">📊 Analytics ({result.timeRange || 'week'})</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {revenue.period !== undefined && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                  <p className="text-purple-500">Period Revenue</p>
                  <p className="font-bold text-purple-800 dark:text-purple-200">₹{(revenue.period || 0).toLocaleString('en-IN')}</p>
                </div>
              )}
              {revenue.total !== undefined && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                  <p className="text-purple-500">Total Revenue</p>
                  <p className="font-bold text-purple-800 dark:text-purple-200">₹{(revenue.total || 0).toLocaleString('en-IN')}</p>
                </div>
              )}
              {convRate && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                  <p className="text-purple-500">Conversion</p>
                  <p className="font-bold text-purple-800 dark:text-purple-200">{convRate}</p>
                </div>
              )}
              {result.successful !== undefined && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                  <p className="text-purple-500">Successful</p>
                  <p className="font-bold text-purple-800 dark:text-purple-200">{result.successful}</p>
                </div>
              )}
              {totalQR !== undefined && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                  <p className="text-purple-500">QR Codes</p>
                  <p className="font-bold text-purple-800 dark:text-purple-200">{totalQR}</p>
                </div>
              )}
              {totalLinks !== undefined && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                  <p className="text-purple-500">Pay Links</p>
                  <p className="font-bold text-purple-800 dark:text-purple-200">{totalLinks}</p>
                </div>
              )}
            </div>
            {peakHour && <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">⏰ Peak hour: {peakHour}</p>}
            {result.insights && (
              <div className="mt-2 text-xs text-purple-700 dark:text-purple-300 bg-white dark:bg-gray-800 rounded-lg p-2">
                <p className="font-medium mb-1">AI Insight:</p>
                <p>{result.insights.summary || result.summary}</p>
              </div>
            )}
          </div>
        );
      }

      case 'search_payments':
        return (
          <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              Found {result.count} payment{result.count !== 1 ? 's' : ''}
            </p>
            {result.results && result.results.slice(0, 3).map((r, i) => (
              <div key={i} className="text-xs text-amber-700 dark:text-amber-300 mt-1 py-1 border-t border-amber-200 dark:border-amber-800">
                <span className="font-medium">₹{r.amount}</span> — <span className={r.status === 'success' ? 'text-green-600' : r.status === 'failed' ? 'text-red-600' : 'text-yellow-600'}>{r.status}</span>
              </div>
            ))}
            {result.count > 3 && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">+{result.count - 3} more</p>}
          </div>
        );

      default:
        if (result && typeof result === 'object' && Object.keys(result).length > 0) {
          return (
            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-32">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          );
        }
        return null;
    }
  };

  return <div className="ml-9">{renderResult()}</div>;
}

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('support');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [aiMode, setAiMode] = useState('slm'); // slm, mock, or real
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      loadAIMode();
    }
  }, [open]);

  const loadAIMode = async () => {
    try {
      const config = await getAIConfig();
      if (config.slmMode) setAiMode('slm');
      else if (config.mockMode) setAiMode('mock');
      else setAiMode('real');
    } catch (error) {
      console.error('Failed to load AI mode:', error);
      setAiMode('slm'); // Default to SLM
    }
  };

  const getModeLabel = () => {
    switch (aiMode) {
      case 'slm': return 'SLM Mode';
      case 'mock': return 'Mock Mode';
      case 'real': return 'AI Mode';
      default: return 'SLM Mode';
    }
  };

  const showQuickPrompts = messages.length === 0 && !loading;

  async function handleSend(text) {
    const content = (text || input).trim();
    if (!content || loading) return;

    // Cancel any in-flight request before sending a new one
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content }]);
    setLoading(true);

    try {
      // Always pass full conversation history for context
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      if (tab === 'merchant') {
        const result = await merchantAssist(content, { history });
        if (signal.aborted) return;
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.reply, action: result.action, params: result.params },
        ]);
      } else if (tab === 'business') {
        // Pass full history including action metadata for multi-turn UPI collection
        const historyWithMeta = messages.map((m) => ({
          role: m.role,
          content: m.content,
          ...(m.action ? { action: m.action } : {}),
          ...(m.params ? { params: m.params } : {}),
        }));
        const result = await businessChat(content, {}, historyWithMeta);
        if (signal.aborted) return;
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: result.reply,
            action: result.action,
            params: result.params,
            result: result.result,
            confidence: result.confidence,
            executed: result.executed,
          },
        ]);
      } else {
        const result = await supportChat(content, null, history);
        if (signal.aborted) return;
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.reply, escalate: result.escalate },
        ]);
      }
    } catch (err) {
      if (err.name === 'AbortError' || abortRef.current?.signal.aborted) return;
      const errMsg = err.message?.includes('timed out')
        ? 'Request timed out. Please try again.'
        : 'Something went wrong. Please try again.';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: errMsg, isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleExecuteAction(action, params) {
    setExecuting(action);
    try {
      const result = await executeMerchantAction(action, params);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `✅ Done! Here's the result:\n\`\`\`\n${JSON.stringify(result.data, null, 2)}\n\`\`\``,
          isSuccess: true,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ Action failed: ${err.message}`, isError: true },
      ]);
    } finally {
      setExecuting(null);
    }
  }

  function switchTab(newTab) {
    // Cancel any in-flight request when switching tabs
    if (abortRef.current) abortRef.current.abort();
    setTab(newTab);
    setMessages([]);
    setInput('');
    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl shadow-xl transition-all duration-200',
          'bg-gradient-to-br from-purple-600 to-purple-500 text-white hover:scale-105 active:scale-95',
          open && 'hidden'
        )}
        title="AI Assistant"
      >
        <MessageCircle size={22} />
      </button>

      {/* Chat panel */}
      <div
        className={cn(
          'fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-2xl overflow-hidden',
          'w-[calc(100vw-3rem)] sm:w-96 h-[530px]',
          'transition-all duration-200 origin-bottom-right',
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white shrink-0">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-sm">UPI folw in AI bot</p>
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            </div>
            <div className="flex items-center gap-1">
              <p className="text-white/70 text-xs">AI-powered • Always online</p>
              <span className="text-white/50 text-xs">•</span>
              <span className="text-white/70 text-xs">{getModeLabel()}</span>
            </div>
          </div>
          <button
            onClick={() => setShowConfig(true)}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors mr-1"
            title="AI Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
          {[
            { id: 'support', label: 'Support', icon: Headphones },
            { id: 'merchant', label: 'Merchant', icon: Bot },
            { id: 'business', label: 'Business', icon: Briefcase },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => switchTab(id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors',
                tab === id
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 pt-4 bg-gray-50 dark:bg-gray-900/50">
          {/* Welcome message */}
          <Bubble
            msg={{
              role: 'assistant',
              content: WELCOME[tab],
            }}
          />

          {messages.map((msg, i) => (
            <div key={i}>
              <Bubble msg={msg} />
              {/* Business chat action results */}
              {msg.result && tab === 'business' && (
                <ActionResult action={msg.action} result={msg.result} />
              )}
              {/* Merchant action execution button — only for non-executed, non-awaiting actions */}
              {msg.action && msg.action !== 'none' && !msg.result && !msg.executed &&
               !msg.action.startsWith('awaiting_') && (
                <div className="flex justify-start pl-9 -mt-1 mb-3">
                  <button
                    onClick={() => handleExecuteAction(msg.action, msg.params)}
                    disabled={!!executing}
                    className="flex items-center gap-1 rounded-lg bg-purple-100 dark:bg-purple-900/40 px-2.5 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/60 disabled:opacity-50 transition-colors"
                  >
                    {executing === msg.action ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Play size={11} />
                    )}
                    Execute: {msg.action.replace(/_/g, ' ')}
                  </button>
                </div>
              )}
              {msg.escalate && (
                <div className="flex justify-start pl-9 -mt-1 mb-3">
                  <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-800">
                    ⚠️ This may need human support
                  </span>
                </div>
              )}
            </div>
          ))}

          {loading && <TypingIndicator />}

          {/* Quick prompts */}
          {showQuickPrompts && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2 px-1">Quick questions:</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS[tab].map((p) => (
                  <button
                    key={p}
                    onClick={() => handleSend(p)}
                    className="text-xs px-2.5 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-300 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                tab === 'merchant'
                  ? 'Generate QR for ₹500...'
                  : 'Ask about payments, refunds...'
              }
              disabled={loading}
              className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors shrink-0"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">Powered by UPI folw in AI – UPI Payments</p>
        </div>
      </div>

      {/* AI Configuration Panel Modal */}
      {showConfig && <AIConfigPanel onClose={() => { setShowConfig(false); loadAIMode(); }} />}
    </>
  );
}
