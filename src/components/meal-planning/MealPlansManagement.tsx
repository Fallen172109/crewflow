'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, 
  Clock, 
  Download, 
  Eye, 
  Trash2, 
  Star, 
  StarOff,
  ChefHat,
  AlertTriangle,
  CheckCircle,
  Filter,
  Search,
  Plus
} from 'lucide-react'
import MealPlanDisplay from './MealPlanDisplay'
import MealPlanExport from './MealPlanExport'

interface MealPlan {
  id: string
  plan_name: string
  plan_duration_days: number
  generated_for_date: string
  plan_data: any
  is_active: boolean
  completion_status: string
  created_at: string
  preferences_snapshot?: any
}

interface MealPlansManagementProps {
  className?: string
  onCreateNew?: () => void
}

export default function MealPlansManagement({ 
  className = '',
  onCreateNew 
}: MealPlansManagementProps) {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportPlan, setExportPlan] = useState<MealPlan | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadMealPlans()
  }, [])

  const loadMealPlans = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/meal-planning/history')
      const data = await response.json()

      console.log('MealPlansManagement - API response:', { response: response.ok, data })

      if (response.ok) {
        setMealPlans(data.meal_plans || [])
        console.log('MealPlansManagement - Set meal plans:', data.meal_plans?.length || 0)
      } else {
        console.error('Failed to load meal plans:', data.error)
      }
    } catch (error) {
      console.error('Error loading meal plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFullPlanData = async (planId: string) => {
    try {
      // Fetch the specific plan by ID with full data
      const response = await fetch(`/api/meal-planning/history?include_data=true&plan_id=${planId}`)
      const data = await response.json()

      if (response.ok) {
        // The API should return the specific plan when plan_id is provided
        const fullPlan = data.meal_plans?.[0] || data.meal_plan
        if (fullPlan && fullPlan.id === planId) {
          setSelectedPlan(fullPlan)
        } else {
          console.error('Plan not found with full data for ID:', planId)
        }
      } else {
        console.error('Failed to load full plan data:', data.error)
      }
    } catch (error) {
      console.error('Error loading full plan data:', error)
    }
  }

  const handleSetActive = async (planId: string) => {
    try {
      const response = await fetch('/api/meal-planning/history', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId, is_active: true })
      })

      if (response.ok) {
        await loadMealPlans()
      } else {
        const data = await response.json()
        alert(`Failed to set plan as active: ${data.error}`)
      }
    } catch (error) {
      console.error('Error setting plan as active:', error)
      alert('Error setting plan as active')
    }
  }

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this meal plan? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/meal-planning/history?id=${planId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadMealPlans()
        if (selectedPlan?.id === planId) {
          setSelectedPlan(null)
        }
      } else {
        const data = await response.json()
        alert(`Failed to delete meal plan: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting meal plan:', error)
      alert('Error deleting meal plan')
    }
  }

  const handleExport = (plan: MealPlan) => {
    console.log('Export button clicked for plan:', plan.id)
    setExportPlan(plan)
    setShowExportModal(true)
    console.log('Export modal should now be visible')
  }

  const getDaysUntilExpiry = (createdAt: string) => {
    const created = new Date(createdAt)
    const expiry = new Date(created.getTime() + (30 * 24 * 60 * 60 * 1000)) // 30 days
    const now = new Date()
    const diffTime = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const isExpiringSoon = (createdAt: string) => {
    const daysLeft = getDaysUntilExpiry(createdAt)
    return daysLeft <= 7 && daysLeft > 0
  }

  const isExpired = (createdAt: string) => {
    return getDaysUntilExpiry(createdAt) <= 0
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'completed': return 'text-blue-600 bg-blue-100'
      case 'paused': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const filteredPlans = mealPlans.filter(plan => {
    const matchesSearch = plan.plan_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || plan.completion_status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (selectedPlan) {
    return (
      <div className={`${className}`}>
        <div className="mb-4">
          <button
            onClick={() => setSelectedPlan(null)}
            className="text-orange-600 hover:text-orange-700 font-medium"
          >
            ← Back to Meal Plans
          </button>
        </div>
        <MealPlanDisplay
          mealPlan={selectedPlan.plan_data}
          planId={selectedPlan.id}
          planName={selectedPlan.plan_name}
          isActive={selectedPlan.is_active}
        />
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Saved Meal Plans</h3>
          {onCreateNew && (
            <button
              onClick={onCreateNew}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Plan</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search meal plans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading meal plans...</p>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="text-center py-8">
            <ChefHat className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No meal plans found</h4>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No plans match your search.' : 'You haven\'t created any meal plans yet.'}
            </p>
            {!searchTerm && onCreateNew && (
              <button
                onClick={onCreateNew}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Create Your First Plan
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPlans.map((plan) => {
              const daysLeft = getDaysUntilExpiry(plan.created_at)
              const expiringSoon = isExpiringSoon(plan.created_at)
              const expired = isExpired(plan.created_at)

              return (
                <div
                  key={plan.id}
                  className={`border rounded-lg p-4 ${
                    expired 
                      ? 'border-red-200 bg-red-50' 
                      : expiringSoon
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">{plan.plan_name}</h4>
                        {plan.is_active && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium flex items-center space-x-1">
                            <Star className="w-3 h-3" />
                            <span>Active</span>
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(plan.completion_status)}`}>
                          {plan.completion_status.charAt(0).toUpperCase() + plan.completion_status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{plan.plan_duration_days} days</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>Created {new Date(plan.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Retention Warning */}
                      {(expiringSoon || expired) && (
                        <div className={`flex items-center space-x-2 text-sm ${
                          expired ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          <AlertTriangle className="w-4 h-4" />
                          <span>
                            {expired 
                              ? 'Plan expired - will be auto-deleted soon'
                              : `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
                            }
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => loadFullPlanData(plan.id)}
                        className="text-gray-600 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="View Plan"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleExport(plan)}
                        className="text-gray-600 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Export Plan"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {!plan.is_active && (
                        <button
                          onClick={() => handleSetActive(plan.id)}
                          className="text-orange-600 hover:text-orange-700 p-2 rounded-lg hover:bg-orange-50 transition-colors"
                          title="Set as Active"
                        >
                          <StarOff className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="text-gray-600 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete Plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && exportPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <MealPlanExport
              planId={exportPlan.id}
              planName={exportPlan.plan_name}
              onClose={() => setShowExportModal(false)}
            />
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setShowExportModal(false)}
                className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
