'use client'

import { getAgent } from '@/lib/agents'
import BaseAgentInterface from './BaseAgentInterface'

interface EnhancedAnchorAgentProps {
  userId?: string
  userTier?: string
}

export default function EnhancedAnchorAgent({ userId, userTier = 'starter' }: EnhancedAnchorAgentProps) {
  const anchorAgent = getAgent('anchor')
  
  if (!anchorAgent) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Anchor agent not found. Please check the agent configuration.</p>
        </div>
      </div>
    )
  }

  return (
    <BaseAgentInterface
      agent={anchorAgent}
      userId={userId}
      userTier={userTier}
    >
      {/* Custom Anchor-specific content can go here */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Anchor's Specializations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-medium text-emerald-700">Business Operations</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Supply chain optimization and tracking</li>
              <li>• Inventory management and forecasting</li>
              <li>• Supplier relationship management</li>
              <li>• Cost analysis and budget optimization</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="font-medium text-emerald-700">Daily Life Management</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Meal planning and nutrition guidance</li>
              <li>• Personal and household budgeting</li>
              <li>• Home organization and maintenance</li>
              <li>• Resource allocation and efficiency</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <h4 className="font-medium text-emerald-800 mb-2">⚓ Anchor's Maritime Wisdom</h4>
          <blockquote className="text-emerald-700 text-sm italic">
            "A well-supplied ship weathers any storm. Whether you're managing a business supply chain or 
            organizing your home, I'll help you stay anchored with proper planning and resource management. 
            Let's chart a course to efficiency and stability together!"
          </blockquote>
        </div>
      </div>
    </BaseAgentInterface>
  )
}
