'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, Settings, Clock, Zap, AlertTriangle, CheckCircle } from 'lucide-react'

interface Permission {
  id: string
  integrationId: string
  actionType: string
  enabled: boolean
  maxFrequency: string
  restrictions: {
    maxActions: number
  }
  description: string
}

interface PermissionsManagerProps {
  userId: string
  className?: string
}

export default function PermissionsManager({ userId, className = '' }: PermissionsManagerProps) {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    loadPermissions()
  }, [userId])

  const loadPermissions = async () => {
    try {
      // In a real implementation, this would fetch from your API
      // For now, we'll show demo permissions
      const demoPermissions: Permission[] = [
        {
          id: '1',
          integrationId: 'facebook-business',
          actionType: 'create_post',
          enabled: true,
          maxFrequency: 'daily',
          restrictions: { maxActions: 5 },
          description: 'AI agents can create and schedule posts on your Facebook pages'
        },
        {
          id: '2',
          integrationId: 'facebook-business',
          actionType: 'reply_comment',
          enabled: true,
          maxFrequency: 'hourly',
          restrictions: { maxActions: 20 },
          description: 'AI agents can respond to comments on your posts'
        },
        {
          id: '3',
          integrationId: 'facebook-business',
          actionType: 'manage_ads',
          enabled: false,
          maxFrequency: 'daily',
          restrictions: { maxActions: 3 },
          description: 'AI agents can create and optimize advertising campaigns'
        },
        {
          id: '4',
          integrationId: 'google-ads',
          actionType: 'optimize_campaigns',
          enabled: false,
          maxFrequency: 'daily',
          restrictions: { maxActions: 10 },
          description: 'AI agents can adjust bids and budgets for better performance'
        }
      ]
      
      setPermissions(demoPermissions)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load permissions:', error)
      setLoading(false)
    }
  }

  const updatePermission = async (permissionId: string, updates: Partial<Permission>) => {
    setSaving(permissionId)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setPermissions(prev => 
        prev.map(p => 
          p.id === permissionId 
            ? { ...p, ...updates }
            : p
        )
      )
    } catch (error) {
      console.error('Failed to update permission:', error)
    } finally {
      setSaving(null)
    }
  }

  const getIntegrationIcon = (integrationId: string) => {
    const icons: Record<string, string> = {
      'facebook-business': '📘',
      'google-ads': '🎯',
      'linkedin': '💼',
      'twitter': '🐦'
    }
    return icons[integrationId] || '🔗'
  }

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'hourly': return 'text-red-600 bg-red-50'
      case 'daily': return 'text-green-600 bg-green-50'
      case 'weekly': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="w-6 h-6 text-green-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Agent Permissions</h2>
            <p className="text-gray-600">Control what your AI agents can do autonomously</p>
          </div>
        </div>

        <div className="space-y-4">
          {permissions.map(permission => (
            <motion.div
              key={permission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-xl">
                    {getIntegrationIcon(permission.integrationId)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-gray-900 capitalize">
                        {permission.actionType.replace('_', ' ')}
                      </h3>
                      <span className="text-xs text-gray-500 capitalize">
                        {permission.integrationId.replace('-', ' ')}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {permission.description}
                    </p>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className={`px-2 py-1 text-xs rounded-full ${getFrequencyColor(permission.maxFrequency)}`}>
                          {permission.restrictions.maxActions} per {permission.maxFrequency}
                        </span>
                      </div>
                      
                      {permission.enabled && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs">Active</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Enable/Disable Toggle */}
                  <button
                    onClick={() => updatePermission(permission.id, { enabled: !permission.enabled })}
                    disabled={saving === permission.id}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                      permission.enabled ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        permission.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>

                  {/* Settings Button */}
                  <button
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
                    title="Configure limits"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {saving === permission.id && (
                <div className="mt-3 flex items-center space-x-2 text-green-600">
                  <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Updating...</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Warning Notice */}
        <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-emerald-900">Important Security Notice</h4>
              <p className="text-sm text-emerald-700 mt-1">
                AI agents will perform these actions autonomously in the background. 
                You can view all actions in your activity log and disable permissions anytime.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-200">
          <button className="text-sm text-gray-600 hover:text-gray-900">
            View Activity Log
          </button>
          <div className="flex space-x-3">
            <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              Disable All
            </button>
            <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
