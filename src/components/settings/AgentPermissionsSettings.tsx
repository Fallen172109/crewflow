'use client'

import { useState, useEffect } from 'react'
import { 
  Shield, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  Save,
  Loader2,
  Info
} from 'lucide-react'
import { motion } from 'framer-motion'

interface AgentPermissionSetting {
  agentId: string
  agentName: string
  integrationId: string
  integrationName: string
  settings: {
    alwaysRequireConfirmation: boolean
    autoApproveLowRisk: boolean
    autoApproveMediumRisk: boolean
    maxAutonomousActions: number
    autonomousActionFrequency: 'hourly' | 'daily' | 'weekly'
    restrictedActions: string[]
    emergencyStopEnabled: boolean
  }
}

interface AgentPermissionsSettingsProps {
  userId: string
  onSave?: (settings: AgentPermissionSetting[]) => void
}

const defaultSettings = {
  alwaysRequireConfirmation: false,
  autoApproveLowRisk: true,
  autoApproveMediumRisk: false,
  maxAutonomousActions: 10,
  autonomousActionFrequency: 'daily' as const,
  restrictedActions: [],
  emergencyStopEnabled: true
}

const agentIntegrations = [
  { agentId: 'anchor', agentName: 'Anchor', integrationId: 'shopify', integrationName: 'Shopify' },
  { agentId: 'pearl', agentName: 'Pearl', integrationId: 'shopify', integrationName: 'Shopify' },
  { agentId: 'flint', agentName: 'Flint', integrationId: 'shopify', integrationName: 'Shopify' },
  { agentId: 'splash', agentName: 'Splash', integrationId: 'shopify', integrationName: 'Shopify' },
  { agentId: 'drake', agentName: 'Drake', integrationId: 'shopify', integrationName: 'Shopify' }
]

const actionTypes = [
  { id: 'create_product', name: 'Create Products', description: 'Allow agent to create new products' },
  { id: 'update_product', name: 'Update Products', description: 'Allow agent to modify existing products' },
  { id: 'delete_product', name: 'Delete Products', description: 'Allow agent to delete products' },
  { id: 'update_price', name: 'Update Prices', description: 'Allow agent to change product prices' },
  { id: 'fulfill_order', name: 'Fulfill Orders', description: 'Allow agent to process order fulfillment' },
  { id: 'manage_inventory', name: 'Manage Inventory', description: 'Allow agent to update inventory levels' }
]

export default function AgentPermissionsSettings({ userId, onSave }: AgentPermissionsSettingsProps) {
  const [settings, setSettings] = useState<AgentPermissionSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize settings
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        setLoading(true)
        
        // TODO: Fetch existing settings from API
        // For now, initialize with defaults
        const initialSettings = agentIntegrations.map(integration => ({
          ...integration,
          settings: { ...defaultSettings }
        }))
        
        setSettings(initialSettings)
      } catch (err) {
        console.error('Error loading settings:', err)
        setError('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    initializeSettings()
  }, [userId])

  const updateAgentSetting = (agentId: string, integrationId: string, key: string, value: any) => {
    setSettings(prev => prev.map(setting => 
      setting.agentId === agentId && setting.integrationId === integrationId
        ? {
            ...setting,
            settings: {
              ...setting.settings,
              [key]: value
            }
          }
        : setting
    ))
    setHasChanges(true)
  }

  const toggleRestrictedAction = (agentId: string, integrationId: string, actionId: string) => {
    setSettings(prev => prev.map(setting => 
      setting.agentId === agentId && setting.integrationId === integrationId
        ? {
            ...setting,
            settings: {
              ...setting.settings,
              restrictedActions: setting.settings.restrictedActions.includes(actionId)
                ? setting.settings.restrictedActions.filter(id => id !== actionId)
                : [...setting.settings.restrictedActions, actionId]
            }
          }
        : setting
    ))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      
      // TODO: Save to API
      console.log('Saving settings:', settings)
      
      if (onSave) {
        await onSave(settings)
      }
      
      setHasChanges(false)
    } catch (err) {
      console.error('Error saving settings:', err)
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    setSettings(prev => prev.map(setting => ({
      ...setting,
      settings: { ...defaultSettings }
    })))
    setHasChanges(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
        <span className="ml-2 text-gray-600">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Shield className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Agent Permissions</h2>
            <p className="text-gray-600">Configure how your AI agents can act autonomously</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Reset to Defaults
          </button>
          
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Global Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Global Settings</h3>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-2">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How Agent Permissions Work</p>
              <ul className="space-y-1 text-blue-700">
                <li>• <strong>Low Risk:</strong> Simple actions like updating inventory or creating draft products</li>
                <li>• <strong>Medium Risk:</strong> Actions like publishing products or updating prices</li>
                <li>• <strong>High Risk:</strong> Destructive actions like deleting products or large price changes</li>
                <li>• <strong>Critical Risk:</strong> Actions that could significantly impact your business</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Agent-Specific Settings */}
      <div className="space-y-4">
        {settings.map((agentSetting) => (
          <motion.div
            key={`${agentSetting.agentId}-${agentSetting.integrationId}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 font-semibold">
                    {agentSetting.agentName[0]}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {agentSetting.agentName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {agentSetting.integrationName} Integration
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Approval Settings */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Approval Settings</h4>
                
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={agentSetting.settings.alwaysRequireConfirmation}
                      onChange={(e) => updateAgentSetting(
                        agentSetting.agentId,
                        agentSetting.integrationId,
                        'alwaysRequireConfirmation',
                        e.target.checked
                      )}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        Always require confirmation
                      </span>
                      <p className="text-xs text-gray-600">
                        Require approval for all actions, regardless of risk level
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={agentSetting.settings.autoApproveLowRisk}
                      onChange={(e) => updateAgentSetting(
                        agentSetting.agentId,
                        agentSetting.integrationId,
                        'autoApproveLowRisk',
                        e.target.checked
                      )}
                      disabled={agentSetting.settings.alwaysRequireConfirmation}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 disabled:opacity-50"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        Auto-approve low risk actions
                      </span>
                      <p className="text-xs text-gray-600">
                        Allow automatic execution of low-risk actions
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={agentSetting.settings.autoApproveMediumRisk}
                      onChange={(e) => updateAgentSetting(
                        agentSetting.agentId,
                        agentSetting.integrationId,
                        'autoApproveMediumRisk',
                        e.target.checked
                      )}
                      disabled={agentSetting.settings.alwaysRequireConfirmation}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 disabled:opacity-50"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        Auto-approve medium risk actions
                      </span>
                      <p className="text-xs text-gray-600">
                        Allow automatic execution of medium-risk actions
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Limits */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Action Limits</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max autonomous actions
                    </label>
                    <select
                      value={agentSetting.settings.maxAutonomousActions}
                      onChange={(e) => updateAgentSetting(
                        agentSetting.agentId,
                        agentSetting.integrationId,
                        'maxAutonomousActions',
                        parseInt(e.target.value)
                      )}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value={5}>5 actions</option>
                      <option value={10}>10 actions</option>
                      <option value={25}>25 actions</option>
                      <option value={50}>50 actions</option>
                      <option value={100}>100 actions</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frequency limit
                    </label>
                    <select
                      value={agentSetting.settings.autonomousActionFrequency}
                      onChange={(e) => updateAgentSetting(
                        agentSetting.agentId,
                        agentSetting.integrationId,
                        'autonomousActionFrequency',
                        e.target.value
                      )}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="hourly">Per hour</option>
                      <option value="daily">Per day</option>
                      <option value="weekly">Per week</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Restricted Actions */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">Restricted Actions</h4>
              <p className="text-sm text-gray-600 mb-4">
                Select actions that should always require manual approval
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {actionTypes.map((action) => (
                  <label
                    key={action.id}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={agentSetting.settings.restrictedActions.includes(action.id)}
                      onChange={() => toggleRestrictedAction(
                        agentSetting.agentId,
                        agentSetting.integrationId,
                        action.id
                      )}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {action.name}
                      </span>
                      <p className="text-xs text-gray-600">
                        {action.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {hasChanges && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span className="text-orange-800">You have unsaved changes</span>
          </div>
        </div>
      )}
    </div>
  )
}
