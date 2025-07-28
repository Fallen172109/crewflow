// Working LangChain Implementation
import { ChatOpenAI } from '@langchain/openai'
import { getAIConfig } from './config'
import { createImageGenerationService, type ImageGenerationRequest, type ImageGenerationResponse } from './image-generation'
import { createMealPlanningService, type MealPlanRequest } from './meal-planning'
import { createFitnessPlanningService, type FitnessPlanRequest } from './fitness-planning'
import { createProductivityPlanningService, type ProductivityPlanRequest } from './productivity-planning'
import type { Agent } from '../agents'

export interface LangChainResponse {
  response: string
  tokensUsed: number
  latency: number
  model: string
  success: boolean
  error?: string
  metadata?: {
    sentiment?: 'positive' | 'negative' | 'neutral'
    urgency?: 'low' | 'medium' | 'high' | 'critical'
    category?: string
    escalationRequired?: boolean
    suggestedActions?: string[]
  }
}

export interface CustomerSupportContext {
  customerHistory?: string[]
  ticketId?: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
  category?: string
  previousInteractions?: number
  customerTier?: 'basic' | 'premium' | 'enterprise'
}

export class LangChainAgent {
  private agent: Agent
  private systemPrompt: string
  private llm: ChatOpenAI
  private userId?: string

  constructor(config: { agent: Agent; systemPrompt: string; userId?: string }) {
    this.agent = config.agent
    this.systemPrompt = config.systemPrompt
    this.userId = config.userId
    this.llm = this.initializeLLM()
  }

  private initializeLLM(): ChatOpenAI {
    const aiConfig = getAIConfig()
    return new ChatOpenAI({
      apiKey: aiConfig.openai.apiKey,
      model: aiConfig.openai.model,
      maxTokens: aiConfig.openai.maxTokens,
      temperature: aiConfig.openai.temperature
    })
  }

  async processMessage(message: string, context?: string | CustomerSupportContext): Promise<LangChainResponse> {
    const startTime = Date.now()

    try {
      const systemMessage = this.buildSystemPrompt()
      const contextStr = this.formatContext(context)

      // Use the correct format for ChatOpenAI - it expects a string input
      const fullPrompt = `${systemMessage}\n\nUser: ${contextStr}${message}\n\nAssistant:`

      console.log('Sending prompt to LangChain:', fullPrompt)
      const response = await this.llm.invoke(fullPrompt)
      console.log('LangChain response:', response)
      const responseText = response.content as string

      // Enhanced response processing for customer support
      const metadata = this.agent.id === 'coral' ? this.analyzeCustomerMessage(message, responseText) : undefined

      return {
        response: responseText,
        tokensUsed: response.usage?.totalTokens || 0,
        latency: Date.now() - startTime,
        model: this.llm.model,
        success: true,
        metadata,
        apiResponse: response // Include the full API response for real usage tracking
      }
    } catch (error) {
      console.error('LangChain error:', error)
      return {
        response: 'I apologize, but I encountered an error while processing your request. Please try again.',
        tokensUsed: 0,
        latency: Date.now() - startTime,
        model: this.llm.model,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private formatContext(context?: string | CustomerSupportContext): string {
    if (!context) return ''

    if (typeof context === 'string') {
      return `Context: ${context}\n\n`
    }

    // Format CustomerSupportContext
    let contextStr = 'Customer Support Context:\n'
    if (context.ticketId) contextStr += `- Ticket ID: ${context.ticketId}\n`
    if (context.priority) contextStr += `- Priority: ${context.priority}\n`
    if (context.category) contextStr += `- Category: ${context.category}\n`
    if (context.customerTier) contextStr += `- Customer Tier: ${context.customerTier}\n`
    if (context.previousInteractions) contextStr += `- Previous Interactions: ${context.previousInteractions}\n`
    if (context.customerHistory?.length) {
      contextStr += `- Recent History:\n${context.customerHistory.map(h => `  • ${h}`).join('\n')}\n`
    }
    return contextStr + '\n'
  }

  private analyzeCustomerMessage(message: string, response: string): LangChainResponse['metadata'] {
    // Simple sentiment analysis based on keywords
    const negativeWords = ['angry', 'frustrated', 'terrible', 'awful', 'hate', 'worst', 'broken', 'useless', 'disappointed']
    const urgentWords = ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'down', 'not working', 'broken']
    const escalationWords = ['manager', 'supervisor', 'cancel', 'refund', 'lawsuit', 'complaint']

    const messageLower = message.toLowerCase()

    const sentiment = negativeWords.some(word => messageLower.includes(word)) ? 'negative' :
                     messageLower.includes('thank') || messageLower.includes('great') || messageLower.includes('good') ? 'positive' : 'neutral'

    const urgency = urgentWords.some(word => messageLower.includes(word)) ? 'high' :
                   messageLower.includes('when') || messageLower.includes('how long') ? 'medium' : 'low'

    const escalationRequired = escalationWords.some(word => messageLower.includes(word)) ||
                              (sentiment === 'negative' && urgency === 'high')

    const suggestedActions = []
    if (escalationRequired) suggestedActions.push('Consider escalation to human agent')
    if (sentiment === 'negative') suggestedActions.push('Follow up with customer satisfaction survey')
    if (urgency === 'high') suggestedActions.push('Prioritize response and resolution')

    return {
      sentiment,
      urgency: urgency as 'low' | 'medium' | 'high',
      escalationRequired,
      suggestedActions
    }
  }

  private buildSystemPrompt(): string {
    if (this.agent.id === 'coral') {
      return this.buildCoralSystemPrompt()
    }

    return `You are ${this.agent.name}, a ${this.agent.title} specialist in the CrewFlow maritime AI automation platform.

${this.agent.description}

Your role and capabilities:
- Framework: LangChain with ${this.agent.optimalAiModules.join(', ')}
- Specialization: ${this.agent.category}
- Available integrations: ${this.agent.integrations.join(', ')}

System Instructions:
${this.systemPrompt}

Key Guidelines:
- Provide expert-level assistance in ${this.agent.category}
- Use your specialized knowledge and integrations
- Maintain a professional, helpful tone with maritime theming
- Focus on practical, actionable solutions
- Use maritime terminology naturally (navigate, chart course, anchor, set sail, etc.)

Response Formatting Instructions:
- Structure responses with clear sections, bullet points, and numbered lists
- Use proper spacing between paragraphs and sections
- Break up long text blocks for better readability
- Use markdown formatting for emphasis and structure
- Always reference attached files when relevant to the conversation

Communication Protocol:
- Communicate in a direct, professional manner without emojis, excessive formatting, or conversational flourishes
- Provide concise, well-reasoned responses that demonstrate clear understanding of the user's request
- Get straight to the point without unnecessary introductions or conclusions
- Focus solely on what the user asked for without suggesting additional work
- Use clear, technical language appropriate for a development context
- Ask specific clarifying questions only when essential information is missing
- Avoid redundant explanations or overly detailed background information
- Use maritime terminology naturally but sparingly (navigate, chart course, anchor, set sail, etc.)
- Focus on being helpful and direct rather than ceremonial`
  }

  private buildCoralSystemPrompt(): string {
    return `You are Coral, the Customer Support specialist in the CrewFlow maritime AI automation platform.

CORE IDENTITY & MISSION:
You are an expert customer support agent with deep knowledge of customer service best practices, policy compliance, and workflow management. Your mission is to provide exceptional, empathetic, and efficient customer support while maintaining company policies and standards.

SPECIALIZED CAPABILITIES:
- Advanced sentiment analysis and emotional intelligence
- Policy compliance and escalation protocols
- Multi-channel support coordination (email, chat, phone, social media)
- Customer data management and CRM integration
- Knowledge base creation and maintenance
- Workflow automation for support processes

AVAILABLE INTEGRATIONS:
${this.agent.integrations.join(', ')} - Use these to provide comprehensive support solutions

CUSTOMER SUPPORT PROTOCOLS:

1. GREETING & ACKNOWLEDGMENT:
   - Always acknowledge the customer's concern immediately
   - Use empathetic language and show understanding
   - Confirm details to ensure accuracy

2. PROBLEM ANALYSIS:
   - Ask clarifying questions to fully understand the issue
   - Categorize the problem type (technical, billing, product, etc.)
   - Assess urgency and impact on the customer

3. SOLUTION DELIVERY:
   - Provide clear, step-by-step solutions
   - Offer multiple options when possible
   - Explain the reasoning behind recommendations
   - Set realistic expectations for resolution times

4. ESCALATION CRITERIA:
   - Technical issues beyond first-level support
   - Billing disputes over $500
   - Customer requests for manager/supervisor
   - Threats of legal action or complaints to authorities
   - Repeated unresolved issues (3+ interactions)

5. FOLLOW-UP & CLOSURE:
   - Confirm the solution resolved the issue
   - Provide additional resources or documentation
   - Schedule follow-up if needed
   - Document the interaction for future reference

COMMUNICATION STYLE:
- Professional yet warm and approachable
- Clear and concise explanations
- Avoid technical jargon unless necessary
- Use positive language and solution-focused responses
- Show genuine concern for customer satisfaction

POLICY COMPLIANCE:
- Always follow company policies and procedures
- Protect customer privacy and data security
- Document all interactions according to standards
- Escalate when policies require management approval
- Never make promises outside your authority

${this.systemPrompt ? `\nADDITIONAL INSTRUCTIONS:\n${this.systemPrompt}` : ''}

Remember: Your goal is not just to solve problems, but to create positive customer experiences that build loyalty and trust.`
  }

  async handlePresetAction(actionId: string, params: any = {}): Promise<LangChainResponse> {
    const action = this.agent.presetActions.find(a => a.id === actionId)
    if (!action) {
      return this.processMessage(`Execute action: ${actionId}`, JSON.stringify(params))
    }

    // Enhanced preset action handling for Coral
    if (this.agent.id === 'coral') {
      return this.handleCoralPresetAction(actionId, params, action)
    }

    const message = `Execute the preset action "${action.label}": ${action.description}. Parameters: ${JSON.stringify(params)}`
    return this.processMessage(message)
  }

  private async handleCoralPresetAction(actionId: string, params: any, action: any): Promise<LangChainResponse> {
    const startTime = Date.now()

    try {
      // Handle image generation separately
      if (actionId === 'image_generator') {
        return this.handleImageGeneration(params, startTime)
      }

      // Handle meal planning separately
      if (actionId === 'pearl_meal_planner' || actionId === 'sage_meal_wisdom' ||
          actionId === 'crew_meal_planner' || actionId === 'meal_prep_workflow' ||
          actionId === 'meal_cost_optimizer') {
        return this.handleMealPlanning(params, startTime)
      }

      // Handle fitness planning separately
      if (actionId === 'crew_fitness_planner' || actionId === 'fitness_research' ||
          actionId === 'fitness_content_creator' || actionId === 'fitness_automation' ||
          actionId === 'health_project_manager' || actionId === 'team_fitness_coordinator' ||
          actionId === 'fitness_knowledge_base') {
        return this.handleFitnessPlanning(params, startTime)
      }

      // Handle productivity planning separately
      if (actionId === 'productivity_compass' || actionId === 'productivity_optimizer' ||
          actionId === 'daily_routine_automation' || actionId === 'productivity_orchestrator' ||
          actionId === 'learning_path_creator' || actionId === 'knowledge_organizer' ||
          actionId === 'personal_project_beacon' || actionId === 'career_compass' ||
          actionId === 'work_life_balance' || actionId === 'productivity_automation' ||
          actionId === 'goal_achievement_strategist') {
        return this.handleProductivityPlanning(params, startTime)
      }

      let prompt = ''

      switch (actionId) {
        case 'generate_response':
          prompt = `Create a professional customer support response template for the following scenario:

Customer Issue: ${params.issue || 'General inquiry'}
Customer Tone: ${params.tone || 'neutral'}
Priority: ${params.priority || 'medium'}
Category: ${params.category || 'general'}

Generate a comprehensive response that includes:
1. Acknowledgment and empathy
2. Clear explanation or solution
3. Next steps or follow-up actions
4. Professional closing

Make it adaptable for similar situations.`
          break

        case 'escalate_ticket':
          prompt = `Prepare an escalation summary for the following customer support case:

Issue Details: ${params.issue || 'Not specified'}
Customer Information: ${params.customer || 'Not provided'}
Previous Actions Taken: ${params.actions || 'None specified'}
Escalation Reason: ${params.reason || 'Customer request'}

Create a comprehensive escalation summary that includes:
1. Clear problem statement
2. Customer impact assessment
3. Actions already attempted
4. Recommended next steps
5. Urgency level and justification`
          break

        case 'analyze_sentiment':
          prompt = `Analyze the customer sentiment and provide insights for the following interaction:

Customer Message: "${params.message || 'No message provided'}"
Context: ${params.context || 'No additional context'}

Provide analysis including:
1. Overall sentiment (positive/negative/neutral)
2. Emotional indicators
3. Urgency level
4. Satisfaction likelihood
5. Recommended response approach`
          break

        case 'update_customer':
          prompt = `Generate a customer record update summary for:

Customer ID: ${params.customerId || 'Not provided'}
Update Type: ${params.updateType || 'General update'}
Changes Made: ${params.changes || 'Not specified'}
Integration Target: ${params.integration || 'CRM system'}

Create an update summary that includes:
1. Customer identification
2. Changes made and rationale
3. System synchronization notes
4. Follow-up requirements`
          break

        case 'create_knowledge':
          prompt = `Create a knowledge base entry for the following support case:

Issue Type: ${params.issueType || 'General'}
Problem Description: ${params.problem || 'Not specified'}
Solution Applied: ${params.solution || 'Not provided'}
Category: ${params.category || 'General'}

Generate a knowledge base article that includes:
1. Clear problem title and description
2. Step-by-step solution
3. Alternative approaches
4. Prevention tips
5. Related articles or resources`
          break

        default:
          prompt = `Execute the customer support action "${action.label}": ${action.description}. Parameters: ${JSON.stringify(params)}`
      }

      const response = await this.llm.invoke([{ role: 'user', content: prompt }])

      return {
        response: response.content as string,
        tokensUsed: response.usage?.totalTokens || 0,
        latency: Date.now() - startTime,
        model: this.llm.model,
        success: true,
        metadata: {
          actionId,
          category: action.category,
          estimatedTime: action.estimatedTime
        }
      }
    } catch (error) {
      console.error('Coral preset action error:', error)
      return {
        response: `I apologize, but I encountered an error while executing the ${action.label} action. Please try again.`,
        tokensUsed: 0,
        latency: Date.now() - startTime,
        model: this.llm.model,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async handleMealPlanning(params: any, startTime: number): Promise<LangChainResponse> {
    try {
      const mealPlanningService = createMealPlanningService()

      // Extract parameters from the request
      const mealPlanRequest: MealPlanRequest = {
        dietaryPreferences: params.dietary_preferences || params.dietaryPreferences || [],
        allergies: params.allergies || [],
        cuisinePreferences: params.cuisine_preferences || params.cuisinePreferences || [],
        mealCount: parseInt(params.meal_count || params.mealCount || '3'),
        days: parseInt(params.days || '7'),
        budgetRange: params.budget_range || params.budgetRange || 'moderate',
        cookingTime: params.cooking_time || params.cookingTime || 'varied',
        servingSize: parseInt(params.serving_size || params.servingSize || '2'),
        healthGoals: params.health_goals || params.healthGoals || [],
        excludeIngredients: params.exclude_ingredients || params.excludeIngredients || []
      }

      console.log('Generating meal plan with request:', mealPlanRequest)
      const mealPlanResult = await mealPlanningService.generateMealPlan(mealPlanRequest)

      if (mealPlanResult.success && mealPlanResult.mealPlan) {
        const plan = mealPlanResult.mealPlan

        let response = `🍽️ **Personalized Meal Plan Generated Successfully!**

**Plan Overview:** ${plan.overview}

**Daily Plans:**
${plan.dailyPlans.map((day, index) => `
**${day.day}:**
- **Breakfast:** ${day.meals.breakfast.name} (${day.meals.breakfast.nutrition.calories} cal)
- **Lunch:** ${day.meals.lunch.name} (${day.meals.lunch.nutrition.calories} cal)
- **Dinner:** ${day.meals.dinner.name} (${day.meals.dinner.nutrition.calories} cal)
- **Daily Total:** ${day.dailyNutrition.calories} calories`).join('\n')}

**Shopping List:**
${Object.entries(plan.shoppingList.categories).map(([category, items]) =>
  `**${category}:** ${Array.isArray(items) ? items.join(', ') : items}`
).join('\n')}

**Estimated Cost:** ${plan.shoppingList.estimatedCost}

**Nutritional Summary:**
- **Daily Average:** ${plan.nutritionalSummary.dailyAverages.calories} calories, ${plan.nutritionalSummary.dailyAverages.protein} protein, ${plan.nutritionalSummary.dailyAverages.carbs} carbs, ${plan.nutritionalSummary.dailyAverages.fat} fat

**Health Insights:**
${plan.nutritionalSummary.healthInsights.map(insight => `- ${insight}`).join('\n')}

**Cooking Tips:**
${plan.cookingTips.map(tip => `- ${tip}`).join('\n')}

This meal plan has been customized based on your preferences and nutritional needs. Each meal includes detailed ingredients and cooking instructions for easy preparation.`

        return {
          response,
          tokensUsed: mealPlanResult.tokensUsed,
          latency: Date.now() - startTime,
          model: mealPlanResult.model,
          success: true,
          metadata: {
            mealPlanning: true,
            mealPlan: plan,
            dailyCalories: plan.nutritionalSummary.dailyAverages.calories,
            planDays: plan.dailyPlans.length
          }
        }
      } else {
        return {
          response: `I apologize, but I encountered an error while generating your meal plan: ${mealPlanResult.error || 'Unknown error'}. Please try again with different preferences or contact support if the issue persists.`,
          tokensUsed: 0,
          latency: Date.now() - startTime,
          model: 'gpt-4-turbo-preview',
          success: false,
          error: mealPlanResult.error
        }
      }
    } catch (error) {
      console.error('Meal planning error:', error)
      return {
        response: 'I apologize, but I encountered an error while generating your meal plan. Please try again.',
        tokensUsed: 0,
        latency: Date.now() - startTime,
        model: 'gpt-4-turbo-preview',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async handleFitnessPlanning(params: any, startTime: number): Promise<LangChainResponse> {
    try {
      const fitnessService = createFitnessPlanningService()

      // Extract parameters from the request
      const fitnessRequest: FitnessPlanRequest = {
        fitnessLevel: params.fitness_level || params.fitnessLevel || 'beginner',
        goals: params.goals || params.fitness_goals || ['general fitness'],
        availableTime: params.available_time || params.availableTime || '30-45 minutes',
        daysPerWeek: parseInt(params.days_per_week || params.daysPerWeek || '3'),
        equipment: params.equipment || [],
        injuries: params.injuries || [],
        preferredActivities: params.preferred_activities || params.preferredActivities || [],
        age: params.age ? parseInt(params.age) : undefined,
        weight: params.weight ? parseInt(params.weight) : undefined,
        height: params.height,
        targetWeight: params.target_weight ? parseInt(params.target_weight) : undefined,
        medicalConditions: params.medical_conditions || params.medicalConditions || []
      }

      console.log('Generating fitness plan with request:', fitnessRequest)
      const fitnessResult = await fitnessService.generateFitnessPlan(fitnessRequest)

      if (fitnessResult.success && fitnessResult.fitnessPlan) {
        const plan = fitnessResult.fitnessPlan

        let response = `💪 **Personalized Fitness Plan Generated Successfully!**

**Plan Overview:** ${plan.overview}

**Weekly Schedule:**
${plan.weeklySchedule.map(day => {
  if (day.restDay) {
    return `**${day.day}:** Rest Day - ${day.activeRecovery}`
  } else if (day.workout) {
    return `**${day.day}:** ${day.workout.name} (${day.workout.duration})
- Type: ${day.workout.type}
- Target: ${day.workout.targetMuscles.join(', ')}
- Calories: ${day.workout.caloriesBurned}
- Difficulty: ${day.workout.difficulty}`
  }
  return `**${day.day}:** No workout scheduled`
}).join('\n\n')}

**Progress Tracking:**
**Weekly Goals:**
${plan.progressTracking.weeklyGoals.map(goal => `- ${goal}`).join('\n')}

**Measurements to Track:**
${plan.progressTracking.measurements.map(measurement => `- ${measurement}`).join('\n')}

**Milestones:**
${plan.progressTracking.milestones.map(milestone =>
  `- Week ${milestone.week}: ${milestone.goal} (${milestone.measurement}) - Reward: ${milestone.reward}`
).join('\n')}

**Nutrition Guidance:**
${plan.nutritionGuidance.map(tip => `- ${tip}`).join('\n')}

**Safety Tips:**
${plan.safetyTips.map(tip => `- ${tip}`).join('\n')}

**Motivational Tips:**
${plan.motivationalTips.map(tip => `- ${tip}`).join('\n')}

This fitness plan has been customized based on your fitness level, goals, and available time. Each workout includes detailed exercises with proper form instructions and modifications for different fitness levels.`

        return {
          response,
          tokensUsed: fitnessResult.tokensUsed,
          latency: Date.now() - startTime,
          model: fitnessResult.model,
          success: true,
          metadata: {
            fitnessPlanning: true,
            fitnessPlan: plan,
            workoutDays: plan.weeklySchedule.filter(day => !day.restDay).length,
            fitnessLevel: fitnessRequest.fitnessLevel
          }
        }
      } else {
        return {
          response: `I apologize, but I encountered an error while generating your fitness plan: ${fitnessResult.error || 'Unknown error'}. Please try again with different preferences or contact support if the issue persists.`,
          tokensUsed: 0,
          latency: Date.now() - startTime,
          model: 'gpt-4-turbo-preview',
          success: false,
          error: fitnessResult.error
        }
      }
    } catch (error) {
      console.error('Fitness planning error:', error)
      return {
        response: 'I apologize, but I encountered an error while generating your fitness plan. Please try again.',
        tokensUsed: 0,
        latency: Date.now() - startTime,
        model: 'gpt-4-turbo-preview',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async handleProductivityPlanning(params: any, startTime: number): Promise<LangChainResponse> {
    try {
      const productivityService = createProductivityPlanningService()

      // Extract parameters from the request
      const productivityRequest: ProductivityPlanRequest = {
        goals: params.goals || params.productivity_goals || ['improve productivity'],
        timeframe: params.timeframe || '4 weeks',
        availableHours: params.available_hours ? parseInt(params.available_hours) : 8,
        priorities: params.priorities || [],
        challenges: params.challenges || [],
        workStyle: params.work_style || params.workStyle || 'balanced',
        tools: params.tools || [],
        learningGoals: params.learning_goals || params.learningGoals || [],
        skillLevel: params.skill_level || params.skillLevel || 'intermediate',
        focusAreas: params.focus_areas || params.focusAreas || ['time management']
      }

      console.log('Generating productivity plan with request:', productivityRequest)
      const productivityResult = await productivityService.generateProductivityPlan(productivityRequest)

      if (productivityResult.success && productivityResult.productivityPlan) {
        const plan = productivityResult.productivityPlan

        let response = `⚡ **Personalized Productivity Plan Generated Successfully!**

**Plan Overview:** ${plan.overview}

**Daily Schedule Framework:**
${plan.dailySchedule.map(day => `
**${day.day}:**
${day.timeBlocks.map(block =>
  `- ${block.time}: ${block.activity} (${block.type}) - ${block.duration}`
).join('\n')}
**Priorities:** ${day.priorities.join(', ')}
**Energy Optimization:** ${day.energyOptimization}`).join('\n')}

**Weekly Goals:**
${plan.weeklyGoals.map(week => `
**Week ${week.week}:** ${week.primaryGoal}
- Sub-goals: ${week.subGoals.join(', ')}
- Metrics: ${week.metrics.join(', ')}
- Reward: ${week.rewards}`).join('\n')}

**Learning Path:**
${plan.learningPath.map(module => `
**${module.topic}** (${module.duration})
- ${module.description}
- Resources: ${module.resources.join(', ')}
- Exercises: ${module.exercises.join(', ')}`).join('\n')}

**Organization System:**
- **Framework:** ${plan.organizationSystem.system}
- **Tools:** ${plan.organizationSystem.tools.join(', ')}
- **Key Workflows:** ${plan.organizationSystem.workflows.map(w => w.name).join(', ')}

**Habit Tracking:**
**Daily Habits:**
${plan.habitTracking.dailyHabits.map(habit =>
  `- ${habit.name}: ${habit.description} (${habit.timeOfDay}, ${habit.duration})`
).join('\n')}

**Weekly Habits:**
${plan.habitTracking.weeklyHabits.map(habit =>
  `- ${habit.name}: ${habit.description} (${habit.timeOfDay})`
).join('\n')}

**Motivation Strategies:**
${plan.motivationStrategies.map(strategy => `- ${strategy}`).join('\n')}

This productivity plan has been customized to your work style and goals. It includes specific time blocks, habit formation strategies, and progress tracking mechanisms to help you achieve sustained productivity improvement.`

        return {
          response,
          tokensUsed: productivityResult.tokensUsed,
          latency: Date.now() - startTime,
          model: productivityResult.model,
          success: true,
          metadata: {
            productivityPlanning: true,
            productivityPlan: plan,
            timeframe: productivityRequest.timeframe,
            workStyle: productivityRequest.workStyle
          }
        }
      } else {
        return {
          response: `I apologize, but I encountered an error while generating your productivity plan: ${productivityResult.error || 'Unknown error'}. Please try again with different preferences or contact support if the issue persists.`,
          tokensUsed: 0,
          latency: Date.now() - startTime,
          model: 'gpt-4-turbo-preview',
          success: false,
          error: productivityResult.error
        }
      }
    } catch (error) {
      console.error('Productivity planning error:', error)
      return {
        response: 'I apologize, but I encountered an error while generating your productivity plan. Please try again.',
        tokensUsed: 0,
        latency: Date.now() - startTime,
        model: 'gpt-4-turbo-preview',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async handleImageGeneration(params: any, startTime: number): Promise<LangChainResponse> {
    try {
      const imageService = createImageGenerationService()

      // Extract parameters from the request
      const imageRequest: ImageGenerationRequest = {
        prompt: params.prompt || params.description || 'A professional image',
        style: params.style,
        aspectRatio: params.aspect_ratio || params.aspectRatio,
        quality: params.quality === 'high' ? 'hd' : 'standard',
        userId: this.userId
      }

      console.log('Generating image with request:', imageRequest)
      const imageResult = await imageService.generateImage(imageRequest)

      if (imageResult.success && imageResult.imageUrl) {
        const response = `🎨 **Image Generated Successfully!**

![${imageResult.metadata?.originalPrompt || 'Generated Image'}](${imageResult.imageUrl})

**Original Prompt:** ${imageResult.metadata?.originalPrompt}
**Enhanced Prompt:** ${imageResult.metadata?.enhancedPrompt}
**Style:** ${imageResult.metadata?.style}
**Aspect Ratio:** ${imageResult.metadata?.aspectRatio}

**Image URL:** ${imageResult.imageUrl}

${imageResult.revisedPrompt ? `**DALL-E Revised Prompt:** ${imageResult.revisedPrompt}` : ''}

The image has been generated using OpenAI's DALL-E 3 model. You can view and download the image using the URL above. The image will be available for a limited time.`

        return {
          response,
          tokensUsed: imageResult.tokensUsed,
          latency: Date.now() - startTime,
          model: imageResult.model,
          success: true,
          metadata: {
            imageGeneration: true,
            imageUrl: imageResult.imageUrl,
            originalPrompt: imageResult.metadata?.originalPrompt,
            enhancedPrompt: imageResult.metadata?.enhancedPrompt,
            revisedPrompt: imageResult.revisedPrompt
          }
        }
      } else {
        return {
          response: `I apologize, but I encountered an error while generating the image: ${imageResult.error || 'Unknown error'}. Please try again with a different prompt or contact support if the issue persists.`,
          tokensUsed: 0,
          latency: Date.now() - startTime,
          model: 'dall-e-3',
          success: false,
          error: imageResult.error
        }
      }
    } catch (error) {
      console.error('Image generation error:', error)
      return {
        response: 'I apologize, but I encountered an error while generating the image. Please try again.',
        tokensUsed: 0,
        latency: Date.now() - startTime,
        model: 'dall-e-3',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export function createLangChainAgent(agent: Agent, systemPrompt: string, userId?: string): LangChainAgent {
  return new LangChainAgent({ agent, systemPrompt, userId })
}
