'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { AGENTS } from '@/lib/agents'
import CrewAbilityInputModal from '@/components/crew/CrewAbilityInputModal'
import { 
  ChefHat, 
  Dumbbell, 
  Image, 
  Compass, 
  Calculator, 
  Home, 
  Activity, 
  Camera, 
  Zap, 
  BookOpen,
  Brain,
  GraduationCap,
  FolderTree,
  Heart,
  Users,
  TrendingUp,
  Scale,
  PiggyBank,
  Receipt,
  Shield,
  Cog,
  FolderOpen,
  RefreshCw,
  Target,
  Layers,
  Award,
  Star,
  ImageIcon,
  Briefcase,
  MessageSquare,
  Trophy
} from 'lucide-react'

interface DailyTool {
  id: string
  label: string
  description: string
  icon: string
  category: string
  estimatedTime: string
  agentId: string
  agentName: string
  agentColor: string
}

const iconMap: Record<string, any> = {
  ChefHat, Dumbbell, Image, Compass, Calculator, Home, Activity, Camera, Zap, 
  BookOpen, Brain, GraduationCap, FolderTree, Heart, Users, TrendingUp, Scale,
  PiggyBank, Receipt, Shield, Cog, FolderOpen, RefreshCw, Target, Layers,
  Award, Star, ImageIcon, Briefcase, MessageSquare, Trophy
}

export default function CrewAbilitiesPage() {
  const { userProfile } = useAuth()
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedAbility, setSelectedAbility] = useState<DailyTool | null>(null)
  const [loading, setLoading] = useState(false)

  // Extract all daily-use tools from all agents
  const dailyTools: DailyTool[] = []
  Object.values(AGENTS).forEach(agent => {
    agent.presetActions
      .filter(action => action.category === 'daily_tools')
      .forEach(action => {
        dailyTools.push({
          ...action,
          agentId: agent.id,
          agentName: agent.name,
          agentColor: agent.color
        })
      })
  })

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(dailyTools.map(tool => {
    if (tool.label.toLowerCase().includes('meal') || tool.label.toLowerCase().includes('galley')) return 'meal_planning'
    if (tool.label.toLowerCase().includes('fitness') || tool.label.toLowerCase().includes('workout')) return 'fitness'
    if (tool.label.toLowerCase().includes('image') || tool.label.toLowerCase().includes('visual') || tool.label.toLowerCase().includes('content')) return 'image_generation'
    return 'productivity'
  })))]

  const categoryLabels: Record<string, string> = {
    all: 'All Abilities',
    meal_planning: '🍽️ Meal Planning',
    fitness: '💪 Fitness & Wellness',
    image_generation: '🎨 Visual Content',
    productivity: '⚡ Productivity'
  }

  // Filter tools by category
  const filteredTools = selectedCategory === 'all' 
    ? dailyTools 
    : dailyTools.filter(tool => {
        if (selectedCategory === 'meal_planning') return tool.label.toLowerCase().includes('meal') || tool.label.toLowerCase().includes('galley')
        if (selectedCategory === 'fitness') return tool.label.toLowerCase().includes('fitness') || tool.label.toLowerCase().includes('workout')
        if (selectedCategory === 'image_generation') return tool.label.toLowerCase().includes('image') || tool.label.toLowerCase().includes('visual') || tool.label.toLowerCase().includes('content')
        if (selectedCategory === 'productivity') return !tool.label.toLowerCase().includes('meal') && !tool.label.toLowerCase().includes('fitness') && !tool.label.toLowerCase().includes('image') && !tool.label.toLowerCase().includes('visual')
        return true
      })

  const handleStartTask = (tool: DailyTool) => {
    setSelectedAbility(tool)
    setModalOpen(true)
  }

  const handleModalSubmit = async (prompt: string, additionalData?: Record<string, any>) => {
    if (!selectedAbility) return

    setLoading(true)

    try {
      // Create a structured message that includes action and parameters for proper routing
      const params: Record<string, any> = {
        prompt: prompt,
        ...additionalData
      }

      // Clean up empty parameters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || (Array.isArray(params[key]) && params[key].length === 0)) {
          delete params[key]
        }
      })

      // Format message for action-based routing
      const fullPrompt = `Action: ${selectedAbility.id}
Parameters: ${JSON.stringify(params)}

${selectedAbility.label} Request: ${prompt}

${additionalData && Object.keys(additionalData).length > 0 ?
  'Additional Details:\n' + Object.entries(additionalData)
    .filter(([key, value]) => value && value !== '' && (!Array.isArray(value) || value.length > 0))
    .map(([key, value]) => `- ${key.replace(/_/g, ' ')}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join('\n') : ''}`

      // Navigate to the agent page with the task type and pre-populated message
      const agentUrl = `/dashboard/agents/${selectedAbility.agentId}?task=${encodeURIComponent(selectedAbility.id)}&message=${encodeURIComponent(fullPrompt)}&taskType=crew_ability`

      setModalOpen(false)
      setSelectedAbility(null)
      router.push(agentUrl)

    } catch (error) {
      console.error('Error starting task:', error)
      alert('Failed to start task. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setSelectedAbility(null)
    setLoading(false)
  }

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Target
    return <IconComponent className="w-5 h-5" />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-2xl">⚓</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Crew Abilities
              </h1>
              <p className="text-gray-600">
                Your personal maritime toolkit for daily productivity and wellness
              </p>
            </div>
          </div>
          {/* New Image Generation Notice */}
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200 mb-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Camera className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">🎨 Image Generation Now Available in Sidebar!</h3>
                <p className="text-gray-700 text-sm">
                  General image generation has moved to the <strong>Crew Abilities</strong> dropdown in the sidebar for easier access.
                  Agent-specific image tools (with business context) remain available within individual agent chats.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-blue-50 rounded-lg p-4 border border-orange-200">
            <p className="text-gray-700 text-sm">
              🚢 <strong>Welcome aboard, Captain!</strong> These daily-use tools are powered by real AI technology including OpenAI DALL-E for image generation,
              advanced meal planning with nutritional analysis, personalized fitness routines, and intelligent productivity systems.
              Each tool leverages your crew's specialized AI agents for immediate, professional-quality results.
            </p>
          </div>
        </div>

        {/* Available Actions Summary */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">🧭</span>
            Available Daily-Use Tools
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-3xl mb-2">🍽️</div>
              <div className="text-2xl font-bold text-orange-600">{dailyTools.filter(t => t.label.toLowerCase().includes('meal') || t.label.toLowerCase().includes('galley')).length}</div>
              <div className="text-gray-600 font-medium">Meal Planning</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-3xl mb-2">💪</div>
              <div className="text-2xl font-bold text-blue-600">{dailyTools.filter(t => t.label.toLowerCase().includes('fitness') || t.label.toLowerCase().includes('workout')).length}</div>
              <div className="text-gray-600 font-medium">Fitness & Wellness</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-3xl mb-2">🎨</div>
              <div className="text-2xl font-bold text-purple-600">{dailyTools.filter(t => t.label.toLowerCase().includes('image') || t.label.toLowerCase().includes('visual') || t.label.toLowerCase().includes('content')).length}</div>
              <div className="text-gray-600 font-medium">Visual Content</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-3xl mb-2">⚡</div>
              <div className="text-2xl font-bold text-green-600">{dailyTools.length}</div>
              <div className="text-gray-600 font-medium">Total Abilities</div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {categoryLabels[category] || category}
              </button>
            ))}
          </div>
        </div>

        {/* Tools Grid */}
        {filteredTools.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tools Found</h3>
            <p className="text-gray-600 mb-4">
              No daily-use tools match your current filter selection.
            </p>
            <button
              onClick={() => setSelectedCategory('all')}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Show All Tools
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map((tool) => (
            <div
              key={`${tool.agentId}-${tool.id}`}
              className="bg-white rounded-lg shadow-sm border hover:shadow-lg hover:border-orange-200 transition-all duration-200 group"
            >
              <div className="p-6">
                <div className="flex items-start space-x-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow"
                    style={{ backgroundColor: tool.agentColor }}
                  >
                    {getIcon(tool.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-orange-700 transition-colors">
                      {tool.label}
                    </h3>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm text-gray-600">by</span>
                      <span
                        className="text-sm font-medium px-2 py-1 rounded-full text-white text-xs"
                        style={{ backgroundColor: tool.agentColor }}
                      >
                        {tool.agentName}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <span>⏱️</span>
                    <span>{tool.estimatedTime}</span>
                  </div>
                  <button
                    onClick={() => handleStartTask(tool)}
                    disabled={loading}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center space-x-2">
                      <span>🚀</span>
                      <span>Start Task</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}

        {/* Input Modal */}
        {selectedAbility && (
          <CrewAbilityInputModal
            isOpen={modalOpen}
            onClose={handleModalClose}
            onSubmit={handleModalSubmit}
            ability={{
              id: selectedAbility.id,
              label: selectedAbility.label,
              description: selectedAbility.description,
              agentName: selectedAbility.agentName,
              agentColor: selectedAbility.agentColor,
              icon: selectedAbility.icon
            }}
            loading={loading}
          />
        )}
      </div>
    </div>
  )
}
