import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface AgentCollaboration {
  id: string
  userId: string
  initiatingAgentId: string
  targetAgentId: string
  collaborationType: 'delegation' | 'consultation' | 'data_sharing' | 'joint_task'
  taskDescription: string
  taskData: any
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected' | 'failed'
  result?: any
  feedback?: string
  requestedAt: Date
  respondedAt?: Date
  completedAt?: Date
  metadata: any
}

export interface AgentCapability {
  agentId: string
  capabilities: string[]
  specializations: string[]
  currentLoad: number
  maxConcurrentTasks: number
  averageResponseTime: number
  successRate: number
  availability: 'available' | 'busy' | 'offline'
}

export interface CollaborationRequest {
  taskType: string
  description: string
  data: any
  priority: 'low' | 'medium' | 'high' | 'urgent'
  requiredCapabilities: string[]
  deadline?: Date
  context: any
}

class AgentCollaborationManager {
  private static instance: AgentCollaborationManager
  private agentCapabilities: Map<string, AgentCapability> = new Map()
  private activeCollaborations: Map<string, AgentCollaboration> = new Map()

  static getInstance(): AgentCollaborationManager {
    if (!AgentCollaborationManager.instance) {
      AgentCollaborationManager.instance = new AgentCollaborationManager()
    }
    return AgentCollaborationManager.instance
  }

  async initialize() {
    console.log('🤝 Initializing Agent Collaboration Manager...')
    await this.loadAgentCapabilities()
    await this.loadActiveCollaborations()
    this.startCollaborationProcessor()
    console.log('✅ Agent Collaboration Manager initialized')
  }

  private async loadAgentCapabilities() {
    // Define agent capabilities based on their specializations
    const agentCapabilities: Record<string, AgentCapability> = {
      'anchor': {
        agentId: 'anchor',
        capabilities: ['shopify_management', 'product_creation', 'inventory_management', 'order_processing'],
        specializations: ['e-commerce', 'store_management', 'automation'],
        currentLoad: 0,
        maxConcurrentTasks: 5,
        averageResponseTime: 2000,
        successRate: 95,
        availability: 'available'
      },
      'pearl': {
        agentId: 'pearl',
        capabilities: ['data_analysis', 'market_research', 'trend_analysis', 'reporting'],
        specializations: ['analytics', 'insights', 'research'],
        currentLoad: 0,
        maxConcurrentTasks: 3,
        averageResponseTime: 5000,
        successRate: 98,
        availability: 'available'
      },
      'flint': {
        agentId: 'flint',
        capabilities: ['content_creation', 'marketing_automation', 'social_media', 'seo'],
        specializations: ['marketing', 'content', 'automation'],
        currentLoad: 0,
        maxConcurrentTasks: 4,
        averageResponseTime: 3000,
        successRate: 92,
        availability: 'available'
      },
      'splash': {
        agentId: 'splash',
        capabilities: ['customer_service', 'communication', 'support_tickets', 'chat_management'],
        specializations: ['customer_support', 'communication', 'service'],
        currentLoad: 0,
        maxConcurrentTasks: 8,
        averageResponseTime: 1500,
        successRate: 96,
        availability: 'available'
      },
      'drake': {
        agentId: 'drake',
        capabilities: ['financial_analysis', 'pricing_optimization', 'cost_management', 'reporting'],
        specializations: ['finance', 'pricing', 'optimization'],
        currentLoad: 0,
        maxConcurrentTasks: 3,
        averageResponseTime: 4000,
        successRate: 97,
        availability: 'available'
      }
    }

    for (const [agentId, capability] of Object.entries(agentCapabilities)) {
      this.agentCapabilities.set(agentId, capability)
    }

    console.log(`📋 Loaded capabilities for ${this.agentCapabilities.size} agents`)
  }

  private async loadActiveCollaborations() {
    try {
      const supabase = createSupabaseServerClient()
      
      const { data: collaborations, error } = await supabase
        .from('agent_collaborations')
        .select('*')
        .in('status', ['pending', 'accepted', 'in_progress'])

      if (error) {
        console.error('Error loading active collaborations:', error)
        return
      }

      for (const collab of collaborations || []) {
        const collaboration: AgentCollaboration = {
          id: collab.id,
          userId: collab.user_id,
          initiatingAgentId: collab.initiating_agent_id,
          targetAgentId: collab.target_agent_id,
          collaborationType: collab.collaboration_type,
          taskDescription: collab.task_description,
          taskData: collab.task_data,
          priority: collab.priority,
          status: collab.status,
          result: collab.result,
          feedback: collab.feedback,
          requestedAt: new Date(collab.requested_at),
          respondedAt: collab.responded_at ? new Date(collab.responded_at) : undefined,
          completedAt: collab.completed_at ? new Date(collab.completed_at) : undefined,
          metadata: collab.metadata
        }

        this.activeCollaborations.set(collaboration.id, collaboration)
      }

      console.log(`🔄 Loaded ${this.activeCollaborations.size} active collaborations`)
    } catch (error) {
      console.error('Error loading active collaborations:', error)
    }
  }

  async requestCollaboration(
    userId: string,
    initiatingAgentId: string,
    request: CollaborationRequest
  ): Promise<string> {
    try {
      // Find the best agent for this task
      const targetAgent = await this.findBestAgent(request)
      
      if (!targetAgent) {
        throw new Error('No suitable agent found for this task')
      }

      // Create collaboration record
      const collaboration: Omit<AgentCollaboration, 'id'> = {
        userId,
        initiatingAgentId,
        targetAgentId: targetAgent.agentId,
        collaborationType: this.determineCollaborationType(request),
        taskDescription: request.description,
        taskData: request.data,
        priority: request.priority,
        status: 'pending',
        requestedAt: new Date(),
        metadata: {
          requiredCapabilities: request.requiredCapabilities,
          deadline: request.deadline,
          context: request.context
        }
      }

      // Save to database
      const supabase = createSupabaseServerClient()
      const { data: savedCollab, error } = await supabase
        .from('agent_collaborations')
        .insert({
          user_id: collaboration.userId,
          initiating_agent_id: collaboration.initiatingAgentId,
          target_agent_id: collaboration.targetAgentId,
          collaboration_type: collaboration.collaborationType,
          task_description: collaboration.taskDescription,
          task_data: collaboration.taskData,
          priority: collaboration.priority,
          status: collaboration.status,
          requested_at: collaboration.requestedAt.toISOString(),
          metadata: collaboration.metadata
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create collaboration: ${error.message}`)
      }

      const fullCollaboration: AgentCollaboration = {
        ...collaboration,
        id: savedCollab.id
      }

      // Add to active collaborations
      this.activeCollaborations.set(fullCollaboration.id, fullCollaboration)

      // Update agent load
      this.updateAgentLoad(targetAgent.agentId, 1)

      // Notify target agent (this would integrate with the agent's processing system)
      await this.notifyAgent(targetAgent.agentId, fullCollaboration)

      console.log(`🤝 Created collaboration ${fullCollaboration.id}: ${initiatingAgentId} → ${targetAgent.agentId}`)

      return fullCollaboration.id
    } catch (error) {
      console.error('Error requesting collaboration:', error)
      throw error
    }
  }

  private async findBestAgent(request: CollaborationRequest): Promise<AgentCapability | null> {
    const availableAgents = Array.from(this.agentCapabilities.values())
      .filter(agent => 
        agent.availability === 'available' &&
        agent.currentLoad < agent.maxConcurrentTasks &&
        this.hasRequiredCapabilities(agent, request.requiredCapabilities)
      )

    if (availableAgents.length === 0) {
      return null
    }

    // Score agents based on multiple factors
    const scoredAgents = availableAgents.map(agent => ({
      agent,
      score: this.calculateAgentScore(agent, request)
    }))

    // Sort by score (highest first)
    scoredAgents.sort((a, b) => b.score - a.score)

    return scoredAgents[0].agent
  }

  private hasRequiredCapabilities(agent: AgentCapability, requiredCapabilities: string[]): boolean {
    return requiredCapabilities.every(capability => 
      agent.capabilities.includes(capability) || 
      agent.specializations.includes(capability)
    )
  }

  private calculateAgentScore(agent: AgentCapability, request: CollaborationRequest): number {
    let score = 0

    // Success rate (0-100)
    score += agent.successRate

    // Availability (lower load is better)
    const loadFactor = 1 - (agent.currentLoad / agent.maxConcurrentTasks)
    score += loadFactor * 50

    // Response time (faster is better, max 10 points)
    const responseTimeFactor = Math.max(0, 10 - (agent.averageResponseTime / 1000))
    score += responseTimeFactor

    // Capability match bonus
    const capabilityMatches = request.requiredCapabilities.filter(cap => 
      agent.capabilities.includes(cap) || agent.specializations.includes(cap)
    ).length
    score += capabilityMatches * 10

    // Priority bonus for urgent tasks
    if (request.priority === 'urgent') {
      score += 20
    } else if (request.priority === 'high') {
      score += 10
    }

    return score
  }

  private determineCollaborationType(request: CollaborationRequest): AgentCollaboration['collaborationType'] {
    // Simple heuristic to determine collaboration type
    if (request.taskType.includes('analyze') || request.taskType.includes('research')) {
      return 'consultation'
    } else if (request.taskType.includes('share') || request.taskType.includes('sync')) {
      return 'data_sharing'
    } else if (request.taskType.includes('joint') || request.taskType.includes('collaborate')) {
      return 'joint_task'
    } else {
      return 'delegation'
    }
  }

  async respondToCollaboration(
    collaborationId: string,
    response: 'accept' | 'reject',
    feedback?: string
  ): Promise<void> {
    const collaboration = this.activeCollaborations.get(collaborationId)
    if (!collaboration) {
      throw new Error('Collaboration not found')
    }

    const newStatus = response === 'accept' ? 'accepted' : 'rejected'
    
    // Update collaboration
    collaboration.status = newStatus
    collaboration.respondedAt = new Date()
    collaboration.feedback = feedback

    // Save to database
    const supabase = createSupabaseServerClient()
    await supabase
      .from('agent_collaborations')
      .update({
        status: newStatus,
        responded_at: collaboration.respondedAt.toISOString(),
        feedback
      })
      .eq('id', collaborationId)

    if (response === 'accept') {
      // Start processing the task
      await this.startCollaborationTask(collaboration)
    } else {
      // Remove from active collaborations and update agent load
      this.activeCollaborations.delete(collaborationId)
      this.updateAgentLoad(collaboration.targetAgentId, -1)
    }

    console.log(`📝 Collaboration ${collaborationId} ${response}ed by ${collaboration.targetAgentId}`)
  }

  private async startCollaborationTask(collaboration: AgentCollaboration): Promise<void> {
    try {
      collaboration.status = 'in_progress'
      
      // Update database
      const supabase = createSupabaseServerClient()
      await supabase
        .from('agent_collaborations')
        .update({ status: 'in_progress' })
        .eq('id', collaboration.id)

      // Execute the task based on collaboration type
      const result = await this.executeCollaborationTask(collaboration)
      
      // Complete the collaboration
      await this.completeCollaboration(collaboration.id, result)

    } catch (error) {
      console.error(`Error executing collaboration ${collaboration.id}:`, error)
      await this.failCollaboration(collaboration.id, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async executeCollaborationTask(collaboration: AgentCollaboration): Promise<any> {
    // This would integrate with the actual agent processing systems
    // For now, simulate task execution
    
    console.log(`🔄 Executing ${collaboration.collaborationType} task: ${collaboration.taskDescription}`)
    
    // Simulate processing time based on task complexity
    const processingTime = Math.random() * 5000 + 1000 // 1-6 seconds
    await new Promise(resolve => setTimeout(resolve, processingTime))

    // Return mock result based on collaboration type
    switch (collaboration.collaborationType) {
      case 'delegation':
        return {
          taskCompleted: true,
          result: `Task "${collaboration.taskDescription}" completed successfully`,
          processingTime,
          agentId: collaboration.targetAgentId
        }
      
      case 'consultation':
        return {
          advice: `Based on analysis, I recommend: ${collaboration.taskDescription}`,
          confidence: Math.random() * 0.3 + 0.7, // 70-100%
          alternatives: ['Option A', 'Option B', 'Option C'],
          processingTime,
          agentId: collaboration.targetAgentId
        }
      
      case 'data_sharing':
        return {
          dataShared: true,
          recordsProcessed: Math.floor(Math.random() * 1000) + 100,
          format: 'JSON',
          processingTime,
          agentId: collaboration.targetAgentId
        }
      
      case 'joint_task':
        return {
          jointTaskCompleted: true,
          contributingAgents: [collaboration.initiatingAgentId, collaboration.targetAgentId],
          result: `Joint task "${collaboration.taskDescription}" completed with collaboration`,
          processingTime,
          agentId: collaboration.targetAgentId
        }
      
      default:
        return {
          completed: true,
          processingTime,
          agentId: collaboration.targetAgentId
        }
    }
  }

  async completeCollaboration(collaborationId: string, result: any): Promise<void> {
    const collaboration = this.activeCollaborations.get(collaborationId)
    if (!collaboration) {
      throw new Error('Collaboration not found')
    }

    collaboration.status = 'completed'
    collaboration.completedAt = new Date()
    collaboration.result = result

    // Update database
    const supabase = createSupabaseServerClient()
    await supabase
      .from('agent_collaborations')
      .update({
        status: 'completed',
        completed_at: collaboration.completedAt.toISOString(),
        result
      })
      .eq('id', collaborationId)

    // Update agent statistics
    this.updateAgentStats(collaboration.targetAgentId, true)
    this.updateAgentLoad(collaboration.targetAgentId, -1)

    // Remove from active collaborations
    this.activeCollaborations.delete(collaborationId)

    // Notify initiating agent of completion
    await this.notifyCollaborationComplete(collaboration)

    console.log(`✅ Collaboration ${collaborationId} completed successfully`)
  }

  async failCollaboration(collaborationId: string, error: string): Promise<void> {
    const collaboration = this.activeCollaborations.get(collaborationId)
    if (!collaboration) {
      throw new Error('Collaboration not found')
    }

    collaboration.status = 'failed'
    collaboration.completedAt = new Date()
    collaboration.feedback = error

    // Update database
    const supabase = createSupabaseServerClient()
    await supabase
      .from('agent_collaborations')
      .update({
        status: 'failed',
        completed_at: collaboration.completedAt.toISOString(),
        feedback: error
      })
      .eq('id', collaborationId)

    // Update agent statistics
    this.updateAgentStats(collaboration.targetAgentId, false)
    this.updateAgentLoad(collaboration.targetAgentId, -1)

    // Remove from active collaborations
    this.activeCollaborations.delete(collaborationId)

    console.log(`❌ Collaboration ${collaborationId} failed: ${error}`)
  }

  private updateAgentLoad(agentId: string, delta: number): void {
    const agent = this.agentCapabilities.get(agentId)
    if (agent) {
      agent.currentLoad = Math.max(0, agent.currentLoad + delta)
      
      // Update availability based on load
      if (agent.currentLoad >= agent.maxConcurrentTasks) {
        agent.availability = 'busy'
      } else {
        agent.availability = 'available'
      }
    }
  }

  private updateAgentStats(agentId: string, success: boolean): void {
    const agent = this.agentCapabilities.get(agentId)
    if (agent) {
      // Simple moving average for success rate
      const weight = 0.1
      if (success) {
        agent.successRate = agent.successRate * (1 - weight) + 100 * weight
      } else {
        agent.successRate = agent.successRate * (1 - weight) + 0 * weight
      }
    }
  }

  private async notifyAgent(agentId: string, collaboration: AgentCollaboration): Promise<void> {
    // This would integrate with the agent's notification system
    console.log(`📬 Notifying ${agentId} of new collaboration request: ${collaboration.id}`)
  }

  private async notifyCollaborationComplete(collaboration: AgentCollaboration): Promise<void> {
    // This would notify the initiating agent that the collaboration is complete
    console.log(`📬 Notifying ${collaboration.initiatingAgentId} that collaboration ${collaboration.id} is complete`)
  }

  private startCollaborationProcessor(): void {
    // Process pending collaborations every 30 seconds
    setInterval(() => {
      this.processCollaborationQueue()
    }, 30000)
  }

  private async processCollaborationQueue(): Promise<void> {
    const pendingCollaborations = Array.from(this.activeCollaborations.values())
      .filter(collab => collab.status === 'pending')

    for (const collaboration of pendingCollaborations) {
      // Auto-accept low priority delegations after 5 minutes
      const waitTime = Date.now() - collaboration.requestedAt.getTime()
      if (collaboration.priority === 'low' && 
          collaboration.collaborationType === 'delegation' && 
          waitTime > 5 * 60 * 1000) {
        
        await this.respondToCollaboration(collaboration.id, 'accept', 'Auto-accepted low priority delegation')
      }
    }
  }

  // Public API methods
  async getCollaborationHistory(userId: string, agentId?: string): Promise<AgentCollaboration[]> {
    const supabase = createSupabaseServerClient()
    
    let query = supabase
      .from('agent_collaborations')
      .select('*')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false })

    if (agentId) {
      query = query.or(`initiating_agent_id.eq.${agentId},target_agent_id.eq.${agentId}`)
    }

    const { data: collaborations, error } = await query

    if (error) {
      throw new Error(`Failed to fetch collaboration history: ${error.message}`)
    }

    return collaborations?.map(collab => ({
      id: collab.id,
      userId: collab.user_id,
      initiatingAgentId: collab.initiating_agent_id,
      targetAgentId: collab.target_agent_id,
      collaborationType: collab.collaboration_type,
      taskDescription: collab.task_description,
      taskData: collab.task_data,
      priority: collab.priority,
      status: collab.status,
      result: collab.result,
      feedback: collab.feedback,
      requestedAt: new Date(collab.requested_at),
      respondedAt: collab.responded_at ? new Date(collab.responded_at) : undefined,
      completedAt: collab.completed_at ? new Date(collab.completed_at) : undefined,
      metadata: collab.metadata
    })) || []
  }

  getAgentCapabilities(): AgentCapability[] {
    return Array.from(this.agentCapabilities.values())
  }

  getActiveCollaborations(): AgentCollaboration[] {
    return Array.from(this.activeCollaborations.values())
  }

  async getCollaborationStats(userId: string): Promise<any> {
    const supabase = createSupabaseServerClient()
    
    const { data: stats, error } = await supabase
      .from('agent_collaborations')
      .select('status, collaboration_type, initiating_agent_id, target_agent_id')
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to fetch collaboration stats: ${error.message}`)
    }

    const totalCollaborations = stats?.length || 0
    const completedCollaborations = stats?.filter(s => s.status === 'completed').length || 0
    const successRate = totalCollaborations > 0 ? (completedCollaborations / totalCollaborations) * 100 : 0

    const collaborationsByType = stats?.reduce((acc, stat) => {
      acc[stat.collaboration_type] = (acc[stat.collaboration_type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const collaborationsByAgent = stats?.reduce((acc, stat) => {
      acc[stat.initiating_agent_id] = (acc[stat.initiating_agent_id] || 0) + 1
      acc[stat.target_agent_id] = (acc[stat.target_agent_id] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return {
      totalCollaborations,
      completedCollaborations,
      successRate,
      collaborationsByType,
      collaborationsByAgent,
      activeCollaborations: this.activeCollaborations.size
    }
  }
}

// Export singleton instance
export const collaborationManager = AgentCollaborationManager.getInstance()

// Initialize collaboration manager when module is imported
if (typeof window === 'undefined') { // Server-side only
  collaborationManager.initialize().catch(console.error)
}
