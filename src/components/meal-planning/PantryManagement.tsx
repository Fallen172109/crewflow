'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  Calendar,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'

interface PantryItem {
  id?: string
  ingredient_name: string
  quantity?: number
  unit?: string
  category: string
  expiration_date?: string
  purchase_date?: string
  status: string
  include_in_meal_plans?: boolean
}

interface PantryManagementProps {
  className?: string
}

const CATEGORIES = [
  'protein',
  'vegetables', 
  'fruits',
  'grains',
  'dairy',
  'pantry_staples',
  'spices',
  'condiments',
  'frozen',
  'canned'
]

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available', color: 'green' },
  { value: 'running_low', label: 'Running Low', color: 'yellow' },
  { value: 'expired', label: 'Expired', color: 'red' },
  { value: 'used_up', label: 'Used Up', color: 'gray' }
]

const UNIT_OPTIONS = [
  { value: 'kg', label: 'kg (kilograms)' },
  { value: 'g', label: 'g (grams)' },
  { value: 'cups', label: 'cups' },
  { value: 'liters', label: 'liters' },
  { value: 'ml', label: 'ml (milliliters)' },
  { value: 'pieces', label: 'pieces' },
  { value: 'bottles', label: 'bottles' },
  { value: 'cans', label: 'cans' },
  { value: 'packages', label: 'packages' }
]

export default function PantryManagement({ className = '' }: PantryManagementProps) {
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null)

  const [newItem, setNewItem] = useState<PantryItem>({
    ingredient_name: '',
    quantity: undefined,
    unit: '',
    category: 'pantry_staples',
    expiration_date: '',
    status: 'available',
    include_in_meal_plans: true
  })

  useEffect(() => {
    loadPantryItems()
  }, [selectedCategory, selectedStatus])

  const loadPantryItems = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)

      const response = await fetch(`/api/meal-planning/pantry?${params}`)
      const data = await response.json()

      if (response.ok) {
        setPantryItems(data.items || [])
      } else {
        console.error('Failed to load pantry items:', data.error)
      }
    } catch (error) {
      console.error('Error loading pantry items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async () => {
    if (!newItem.ingredient_name || !newItem.category) {
      alert('Please fill in the ingredient name and category.')
      return
    }

    try {
      const response = await fetch('/api/meal-planning/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [newItem] })
      })

      const data = await response.json()

      if (response.ok) {
        await loadPantryItems()
        setNewItem({
          ingredient_name: '',
          quantity: undefined,
          unit: '',
          category: 'pantry_staples',
          expiration_date: '',
          status: 'available'
        })
        setShowAddForm(false)
      } else {
        alert(`Failed to add item: ${data.error}`)
      }
    } catch (error) {
      console.error('Error adding item:', error)
      alert('Error adding item')
    }
  }

  const handleUpdateItem = async (item: PantryItem) => {
    try {
      const response = await fetch('/api/meal-planning/pantry', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [item] })
      })

      const data = await response.json()

      if (response.ok) {
        await loadPantryItems()
        setEditingItem(null)
      } else {
        alert(`Failed to update item: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating item:', error)
      alert('Error updating item')
    }
  }

  const handleToggleIncludeInMealPlans = async (item: PantryItem) => {
    const updatedItem = {
      ...item,
      include_in_meal_plans: !item.include_in_meal_plans
    }

    try {
      const response = await fetch('/api/meal-planning/pantry', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [updatedItem] })
      })

      const data = await response.json()

      if (response.ok) {
        await loadPantryItems()
      } else {
        alert(`Failed to update item: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating item:', error)
      alert('Error updating item')
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const response = await fetch(`/api/meal-planning/pantry?id=${itemId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadPantryItems()
      } else {
        const data = await response.json()
        alert(`Failed to delete item: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Error deleting item')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'running_low': return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'expired': return <X className="w-4 h-4 text-red-600" />
      case 'used_up': return <Clock className="w-4 h-4 text-gray-600" />
      default: return <Package className="w-4 h-4 text-gray-600" />
    }
  }

  const isExpiringSoon = (expirationDate: string) => {
    if (!expirationDate) return false
    const expDate = new Date(expirationDate)
    const today = new Date()
    const diffTime = expDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 7 && diffDays >= 0
  }

  const isExpired = (expirationDate: string) => {
    if (!expirationDate) return false
    const expDate = new Date(expirationDate)
    const today = new Date()
    return expDate < today
  }

  const filteredItems = pantryItems.filter(item => 
    item.ingredient_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const groupedItems = filteredItems.reduce((acc: any, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Pantry Management</h3>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search ingredients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(category => (
              <option key={category} value={category}>
                {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading pantry items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No items found</h4>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No items match your search.' : 'Your pantry is empty. Start by adding some ingredients!'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Add Your First Item
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([category, items]: [string, any]) => (
              <div key={category}>
                <h4 className="text-lg font-medium text-gray-900 mb-3 capitalize">
                  {category.replace('_', ' ')} ({items.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item: PantryItem) => (
                    <div
                      key={item.id}
                      className={`border rounded-lg p-4 ${
                        isExpired(item.expiration_date || '') 
                          ? 'border-red-200 bg-red-50' 
                          : isExpiringSoon(item.expiration_date || '')
                          ? 'border-yellow-200 bg-yellow-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-gray-900">{item.ingredient_name}</h5>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(item.status)}
                          <button
                            onClick={() => setEditingItem(item)}
                            className="text-gray-400 hover:text-gray-600 p-1"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id!)}
                            className="text-gray-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {item.quantity && (
                        <p className="text-sm text-gray-600 mb-1">
                          Quantity: {item.quantity} {item.unit}
                        </p>
                      )}
                      
                      {item.expiration_date && (
                        <p className={`text-sm mb-1 ${
                          isExpired(item.expiration_date)
                            ? 'text-red-600 font-medium'
                            : isExpiringSoon(item.expiration_date)
                            ? 'text-yellow-600 font-medium'
                            : 'text-gray-600'
                        }`}>
                          Expires: {new Date(item.expiration_date).toLocaleDateString()}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          STATUS_OPTIONS.find(s => s.value === item.status)?.color === 'green'
                            ? 'bg-green-100 text-green-800'
                            : STATUS_OPTIONS.find(s => s.value === item.status)?.color === 'yellow'
                            ? 'bg-yellow-100 text-yellow-800'
                            : STATUS_OPTIONS.find(s => s.value === item.status)?.color === 'red'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {STATUS_OPTIONS.find(s => s.value === item.status)?.label}
                        </span>
                      </div>

                      {/* Include in Meal Plans Toggle */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                        <span className="text-sm text-gray-700">Include in Meal Plans</span>
                        <button
                          onClick={() => handleToggleIncludeInMealPlans(item)}
                          className={`flex items-center transition-colors ${
                            item.include_in_meal_plans
                              ? 'text-orange-600 hover:text-orange-700'
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                          title={item.include_in_meal_plans ? 'Included in meal plans' : 'Excluded from meal plans'}
                        >
                          {item.include_in_meal_plans ? (
                            <ToggleRight className="w-6 h-6" />
                          ) : (
                            <ToggleLeft className="w-6 h-6" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">Add Pantry Item</h4>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ingredient Name *
                </label>
                <input
                  type="text"
                  value={newItem.ingredient_name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, ingredient_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g., Chicken breast"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={newItem.quantity || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, quantity: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={newItem.unit || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Select unit</option>
                    {UNIT_OPTIONS.map(unit => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={newItem.expiration_date || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, expiration_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={newItem.status}
                  onChange={(e) => setNewItem(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {STATUS_OPTIONS.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Include in Meal Plans
                </label>
                <button
                  type="button"
                  onClick={() => setNewItem(prev => ({ ...prev, include_in_meal_plans: !prev.include_in_meal_plans }))}
                  className={`flex items-center transition-colors ${
                    newItem.include_in_meal_plans
                      ? 'text-orange-600 hover:text-orange-700'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {newItem.include_in_meal_plans ? (
                    <ToggleRight className="w-6 h-6" />
                  ) : (
                    <ToggleLeft className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">Edit Pantry Item</h4>
              <button
                onClick={() => setEditingItem(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ingredient Name *
                </label>
                <input
                  type="text"
                  value={editingItem.ingredient_name}
                  onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, ingredient_name: e.target.value }) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={editingItem.quantity || ''}
                    onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, quantity: e.target.value ? parseFloat(e.target.value) : undefined }) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={editingItem.unit || ''}
                    onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, unit: e.target.value }) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Select unit</option>
                    {UNIT_OPTIONS.map(unit => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={editingItem.category}
                  onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, category: e.target.value }) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={editingItem.expiration_date || ''}
                  onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, expiration_date: e.target.value }) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={editingItem.status}
                  onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, status: e.target.value }) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {STATUS_OPTIONS.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Include in Meal Plans
                </label>
                <button
                  type="button"
                  onClick={() => setEditingItem(prev => prev ? ({ ...prev, include_in_meal_plans: !prev.include_in_meal_plans }) : null)}
                  className={`flex items-center transition-colors ${
                    editingItem.include_in_meal_plans
                      ? 'text-orange-600 hover:text-orange-700'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {editingItem.include_in_meal_plans ? (
                    <ToggleRight className="w-6 h-6" />
                  ) : (
                    <ToggleLeft className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateItem(editingItem)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
