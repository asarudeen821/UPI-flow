import { useState, useEffect } from 'react';
import { Brain, TrendingUp, Lightbulb, Loader2, RefreshCw } from 'lucide-react';
import { getAutoAnalytics } from '../api/services/aiService';

export default function AIAnalyticsInsights() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAutoAnalytics();
      setInsights(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  if (loading && !insights) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Analyzing your data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
        <strong>AI Insights Unavailable:</strong> {error}
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain className="text-purple-600" size={28} />
          <div>
            <h3 className="text-xl font-bold text-gray-800">AI Insights</h3>
            <p className="text-sm text-gray-600">Powered by AI analytics</p>
          </div>
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="p-2 hover:bg-white/50 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh insights"
        >
          <RefreshCw size={18} className={`text-gray-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary */}
      {insights.summary && (
        <div className="bg-white rounded-lg p-4 mb-4 border-l-4 border-purple-500">
          <p className="text-gray-800">{insights.summary}</p>
        </div>
      )}

      {/* Key Insights */}
      {insights.insights && insights.insights.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={20} className="text-blue-600" />
            <h4 className="font-semibold text-gray-800">Key Observations</h4>
          </div>
          <div className="space-y-2">
            {insights.insights.map((insight, i) => (
              <div key={i} className="bg-white rounded-lg p-3 flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {i + 1}
                </div>
                <p className="text-sm text-gray-700">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {insights.suggestions && insights.suggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={20} className="text-yellow-600" />
            <h4 className="font-semibold text-gray-800">Actionable Suggestions</h4>
          </div>
          <div className="space-y-2">
            {insights.suggestions.map((suggestion, i) => (
              <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-3">
                <div className="text-yellow-600 text-lg flex-shrink-0">💡</div>
                <p className="text-sm text-gray-700">{suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
