import { requireAdminAuth } from '@/lib/admin-auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { calculateTokenCost, AI_PROVIDER_PRICING } from '@/lib/ai-cost-calculator'

export default async function CostVerificationPage() {
  let adminUser
  let recentUsage = []
  let errorMessage = null

  try {
    adminUser = await requireAdminAuth()
  } catch (error) {
    console.error('Admin auth error:', error)
    errorMessage = 'Admin authentication failed'
  }

  if (adminUser) {
    try {
      const supabase = createSupabaseServerClient()

      // Get recent usage records with full details
      const { data, error } = await supabase
        .from('agent_usage_detailed')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Error fetching usage data:', error)
        errorMessage = `Database error: ${error.message}`
      } else {
        recentUsage = data || []
      }
    } catch (error) {
      console.error('Supabase error:', error)
      errorMessage = `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Cost & Token Verification</h1>
        <p className="text-gray-600 mt-1">
          Verify the accuracy of AI cost calculations and token tracking
        </p>
      </div>

      {/* Error Display */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Data</h3>
              <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Current Pricing Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Current AI Provider Pricing</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Input Cost (per 1K tokens)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Output Cost (per 1K tokens)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {AI_PROVIDER_PRICING.map((provider) =>
                Object.entries(provider.models).map(([modelName, pricing]) => (
                  <tr key={`${provider.provider}-${modelName}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {provider.provider}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {modelName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${pricing.inputCostPer1kTokens.toFixed(6)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${pricing.outputCostPer1kTokens.toFixed(6)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Usage with Cost Verification */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Usage & Cost Verification</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Input Tokens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Output Tokens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stored Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Calculated Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Match
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentUsage && recentUsage.length > 0 ? recentUsage.map((usage) => {
                // Recalculate cost to verify accuracy
                const calculatedCost = calculateTokenCost(
                  usage.provider,
                  null, // Use default model
                  {
                    inputTokens: usage.input_tokens,
                    outputTokens: usage.output_tokens,
                    totalTokens: usage.input_tokens + usage.output_tokens
                  }
                )
                
                const storedCost = parseFloat(usage.cost_usd || '0')
                const isMatch = Math.abs(calculatedCost.totalCost - storedCost) < 0.000001
                
                return (
                  <tr key={usage.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(usage.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {usage.agent_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {usage.provider}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {usage.input_tokens?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {usage.output_tokens?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${storedCost.toFixed(6)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${calculatedCost.totalCost.toFixed(6)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        isMatch 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {isMatch ? '✓ Match' : '✗ Mismatch'}
                      </span>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    {errorMessage ? 'Unable to load usage data' : 'No usage data available yet. Try using an AI agent first.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real vs Estimated Tracking Status */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Real vs Estimated Cost Tracking</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <h3 className="font-medium text-red-900 mb-2">❌ Current System (Estimated)</h3>
            <div className="space-y-2 text-sm text-red-700">
              <p>• Uses hardcoded pricing from ai-cost-calculator.ts</p>
              <p>• Estimates token usage (not always accurate)</p>
              <p>• Fixed cost per request for some agents</p>
              <p>• No real-time cost data from AI providers</p>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="font-medium text-green-900 mb-2">✅ New System (Real Data)</h3>
            <div className="space-y-2 text-sm text-green-700">
              <p>• Captures actual token usage from API responses</p>
              <p>• Uses real input/output token counts</p>
              <p>• Tracks actual model used per request</p>
              <p>• Calculates costs based on real usage</p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-900 mb-2">🔧 Implementation Status</h3>
          <div className="space-y-2 text-sm text-blue-700">
            <p>• ✅ Updated Coral agent to use real usage tracking</p>
            <p>• ✅ Modified LangChain to include full API responses</p>
            <p>• ✅ Modified Perplexity to include full API responses</p>
            <p>• ⏳ Need to update remaining agents (Pearl, Mariner, etc.)</p>
            <p>• ⏳ Need to implement provider API usage sync</p>
          </div>
        </div>
      </div>

      {/* Your Current Models */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Current AI Models</h2>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">OpenAI</h3>
              <p className="text-sm text-gray-600">gpt-4-turbo-preview</p>
              <p className="text-xs text-gray-500">$0.01 input / $0.03 output per 1K tokens</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Anthropic</h3>
              <p className="text-sm text-gray-600">claude-3.5-sonnet-20241022</p>
              <p className="text-xs text-gray-500">$0.003 input / $0.015 output per 1K tokens</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Perplexity</h3>
              <p className="text-sm text-gray-600">llama-3.1-sonar-large-128k-online</p>
              <p className="text-xs text-gray-500">$0.001 input / $0.001 output per 1K tokens</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
