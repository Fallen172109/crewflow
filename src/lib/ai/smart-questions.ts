// Smart Questions System
// Intelligent questioning that asks only what's needed, when needed

import { IntentAnalysis, RequiredInfo } from './advanced-intent-recognition'
import { ConversationContext } from './enhanced-memory'
import { getShopifyContextData } from '@/lib/agents/shopify-context'

export interface SmartQuestion {
  id: string
  type: 'clarification' | 'information' | 'confirmation' | 'choice' | 'validation'
  priority: 'critical' | 'important' | 'optional'
  question: string
  context: string
  expectedAnswerType: 'text' | 'number' | 'selection' | 'boolean' | 'file'
  options?: QuestionOption[]
  validation?: ValidationRule
  followUpQuestions?: SmartQuestion[]
  skipConditions?: SkipCondition[]
  helpText?: string
  examples?: string[]
}

export interface QuestionOption {
  value: string
  label: string
  description?: string
  recommended?: boolean
  consequences?: string
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom'
  value?: any
  message: string
}

export interface SkipCondition {
  field: string
  operator: 'equals' | 'contains' | 'exists' | 'greater_than' | 'less_than'
  value: any
}

export interface QuestionFlow {
  questions: SmartQuestion[]
  currentQuestionIndex: number
  collectedAnswers: Record<string, any>
  canProceed: boolean
  completionPercentage: number
}

export class SmartQuestionGenerator {
  private context: ConversationContext
  private intentAnalysis: IntentAnalysis

  constructor(context: ConversationContext, intentAnalysis: IntentAnalysis) {
    this.context = context
    this.intentAnalysis = intentAnalysis
  }

  async generateQuestionFlow(): Promise<QuestionFlow> {
    const questions = await this.generateQuestions()
    const prioritizedQuestions = this.prioritizeQuestions(questions)
    const filteredQuestions = this.filterQuestions(prioritizedQuestions)
    
    return {
      questions: filteredQuestions,
      currentQuestionIndex: 0,
      collectedAnswers: {},
      canProceed: false,
      completionPercentage: 0
    }
  }

  private async generateQuestions(): Promise<SmartQuestion[]> {
    const questions: SmartQuestion[] = []
    const { primaryIntent, requiredInformation } = this.intentAnalysis
    
    // Generate questions based on missing required information
    for (const info of requiredInformation) {
      const question = await this.generateQuestionForRequiredInfo(info)
      if (question) {
        questions.push(question)
      }
    }
    
    // Generate intent-specific questions
    const intentQuestions = await this.generateIntentSpecificQuestions(primaryIntent)
    questions.push(...intentQuestions)
    
    // Generate contextual clarification questions
    const clarificationQuestions = await this.generateClarificationQuestions()
    questions.push(...clarificationQuestions)
    
    return questions
  }

  private async generateQuestionForRequiredInfo(info: RequiredInfo): Promise<SmartQuestion | null> {
    // Check if we already have this information from context
    if (await this.hasInformationFromContext(info.field)) {
      return null
    }

    const question: SmartQuestion = {
      id: `req_${info.field}`,
      type: 'information',
      priority: info.priority,
      question: this.generateQuestionText(info),
      context: info.description,
      expectedAnswerType: info.type,
      validation: this.generateValidation(info),
      helpText: this.generateHelpText(info),
      examples: this.generateExamples(info)
    }

    // Add options for selection type questions
    if (info.type === 'selection' && info.options) {
      question.options = info.options.map(option => ({
        value: option,
        label: option,
        recommended: false
      }))
    }

    // Add smart options based on context
    if (info.field === 'product_category') {
      question.options = await this.getProductCategoryOptions()
    } else if (info.field === 'location_id') {
      question.options = await this.getLocationOptions()
    }

    return question
  }

  private async generateIntentSpecificQuestions(intent: any): Promise<SmartQuestion[]> {
    const questions: SmartQuestion[] = []
    
    if (intent.type.includes('product_create')) {
      questions.push(...await this.generateProductCreationQuestions())
    } else if (intent.type.includes('inventory_update')) {
      questions.push(...await this.generateInventoryQuestions())
    } else if (intent.type.includes('order_process')) {
      questions.push(...await this.generateOrderQuestions())
    }
    
    return questions
  }

  private async generateProductCreationQuestions(): Promise<SmartQuestion[]> {
    const questions: SmartQuestion[] = []
    
    // Check if user wants to use AI for product description
    questions.push({
      id: 'use_ai_description',
      type: 'choice',
      priority: 'optional',
      question: 'Would you like me to generate an optimized product description using AI?',
      context: 'AI can create SEO-friendly descriptions based on your product details',
      expectedAnswerType: 'boolean',
      options: [
        { value: 'yes', label: 'Yes, generate AI description', recommended: true },
        { value: 'no', label: 'No, I\'ll provide my own' }
      ]
    })
    
    // Ask about inventory tracking
    questions.push({
      id: 'track_inventory',
      type: 'choice',
      priority: 'important',
      question: 'Do you want to track inventory for this product?',
      context: 'Inventory tracking helps manage stock levels and prevents overselling',
      expectedAnswerType: 'boolean',
      options: [
        { value: 'yes', label: 'Yes, track inventory', recommended: true },
        { value: 'no', label: 'No, unlimited stock' }
      ]
    })
    
    return questions
  }

  private async generateInventoryQuestions(): Promise<SmartQuestion[]> {
    const questions: SmartQuestion[] = []
    
    // Ask about inventory operation type if not clear
    questions.push({
      id: 'inventory_operation',
      type: 'choice',
      priority: 'critical',
      question: 'What type of inventory update do you want to perform?',
      context: 'Choose the operation that matches your needs',
      expectedAnswerType: 'selection',
      options: [
        { value: 'set', label: 'Set exact quantity', description: 'Replace current stock with new amount' },
        { value: 'add', label: 'Add to current stock', description: 'Increase current quantity' },
        { value: 'subtract', label: 'Remove from stock', description: 'Decrease current quantity' }
      ]
    })
    
    return questions
  }

  private async generateOrderQuestions(): Promise<SmartQuestion[]> {
    const questions: SmartQuestion[] = []
    
    // Ask about fulfillment method
    questions.push({
      id: 'fulfillment_method',
      type: 'choice',
      priority: 'important',
      question: 'How would you like to fulfill this order?',
      context: 'Choose the fulfillment method for this order',
      expectedAnswerType: 'selection',
      options: [
        { value: 'manual', label: 'Manual fulfillment', description: 'Handle shipping yourself' },
        { value: 'automatic', label: 'Automatic fulfillment', description: 'Use configured shipping rules' },
        { value: 'third_party', label: 'Third-party fulfillment', description: 'Use external fulfillment service' }
      ]
    })
    
    return questions
  }

  private async generateClarificationQuestions(): Promise<SmartQuestion[]> {
    const questions: SmartQuestion[] = []
    const { complexity, confidence } = this.intentAnalysis
    
    // Ask for clarification if confidence is low
    if (confidence < 0.7) {
      questions.push({
        id: 'intent_clarification',
        type: 'clarification',
        priority: 'important',
        question: 'I want to make sure I understand correctly. Could you clarify what you\'d like me to help you with?',
        context: 'This helps me provide more accurate assistance',
        expectedAnswerType: 'text',
        helpText: 'Please provide more details about your specific goal or task'
      })
    }
    
    // Ask about scope for complex requests
    if (complexity === 'complex') {
      questions.push({
        id: 'task_scope',
        type: 'choice',
        priority: 'important',
        question: 'This seems like a complex task. Would you like me to break it down into smaller steps?',
        context: 'Breaking complex tasks into steps makes them easier to manage',
        expectedAnswerType: 'boolean',
        options: [
          { value: 'yes', label: 'Yes, break it down', recommended: true },
          { value: 'no', label: 'No, handle it all at once' }
        ]
      })
    }
    
    return questions
  }

  private prioritizeQuestions(questions: SmartQuestion[]): SmartQuestion[] {
    return questions.sort((a, b) => {
      const priorityOrder = { critical: 0, important: 1, optional: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }

  private filterQuestions(questions: SmartQuestion[]): SmartQuestion[] {
    // Filter out questions that should be skipped based on context
    return questions.filter(question => {
      if (!question.skipConditions) return true
      
      return !question.skipConditions.some(condition => 
        this.evaluateSkipCondition(condition)
      )
    })
  }

  private evaluateSkipCondition(condition: SkipCondition): boolean {
    const contextValue = this.getContextValue(condition.field)
    
    switch (condition.operator) {
      case 'equals':
        return contextValue === condition.value
      case 'contains':
        return String(contextValue).includes(condition.value)
      case 'exists':
        return contextValue !== undefined && contextValue !== null
      case 'greater_than':
        return Number(contextValue) > Number(condition.value)
      case 'less_than':
        return Number(contextValue) < Number(condition.value)
      default:
        return false
    }
  }

  private getContextValue(field: string): any {
    // Get value from conversation context
    const { conversationState, storeContext } = this.context
    
    if (conversationState.contextVariables[field]) {
      return conversationState.contextVariables[field]
    }
    
    if (storeContext && (storeContext as any)[field]) {
      return (storeContext as any)[field]
    }
    
    return null
  }

  private async hasInformationFromContext(field: string): Promise<boolean> {
    // Check if we can derive this information from existing context
    const contextValue = this.getContextValue(field)
    if (contextValue) return true
    
    // Check if we can get it from store data
    if (field.includes('location') && this.context.storeContext) {
      return true // We can get locations from store context
    }
    
    return false
  }

  private generateQuestionText(info: RequiredInfo): string {
    const questionTemplates = {
      product_title: 'What would you like to name this product?',
      product_price: 'What price would you like to set for this product?',
      product_description: 'Please provide a description for this product:',
      quantity: 'What quantity would you like to set?',
      location_id: 'Which location should this apply to?',
      product_category: 'What category does this product belong to?'
    }
    
    return questionTemplates[info.field as keyof typeof questionTemplates] || 
           `Please provide ${info.description.toLowerCase()}:`
  }

  private generateValidation(info: RequiredInfo): ValidationRule | undefined {
    if (info.priority === 'critical') {
      return {
        type: 'required',
        message: `${info.description} is required to proceed`
      }
    }
    
    if (info.field.includes('price') || info.field.includes('quantity')) {
      return {
        type: 'min',
        value: 0,
        message: 'Value must be greater than 0'
      }
    }
    
    return undefined
  }

  private generateHelpText(info: RequiredInfo): string | undefined {
    const helpTexts = {
      product_title: 'Choose a clear, descriptive name that customers will search for',
      product_price: 'Enter the price in your store\'s currency',
      quantity: 'Enter the number of items in stock',
      location_id: 'Select the warehouse or store location'
    }
    
    return helpTexts[info.field as keyof typeof helpTexts]
  }

  private generateExamples(info: RequiredInfo): string[] | undefined {
    const examples = {
      product_title: ['Wireless Bluetooth Headphones', 'Organic Cotton T-Shirt', 'Stainless Steel Water Bottle'],
      product_description: ['High-quality wireless headphones with noise cancellation', 'Comfortable organic cotton shirt in multiple colors'],
      quantity: ['50', '100', '25']
    }
    
    return examples[info.field as keyof typeof examples]
  }

  private async getProductCategoryOptions(): Promise<QuestionOption[]> {
    // Get categories from store context or use common categories
    return [
      { value: 'electronics', label: 'Electronics' },
      { value: 'clothing', label: 'Clothing & Apparel' },
      { value: 'home', label: 'Home & Garden' },
      { value: 'sports', label: 'Sports & Outdoors' },
      { value: 'books', label: 'Books & Media' },
      { value: 'other', label: 'Other' }
    ]
  }

  private async getLocationOptions(): Promise<QuestionOption[]> {
    // Get locations from store context
    if (this.context.storeContext) {
      // In a real implementation, this would fetch actual store locations
      return [
        { value: 'main', label: 'Main Warehouse', recommended: true },
        { value: 'retail', label: 'Retail Store' },
        { value: 'online', label: 'Online Only' }
      ]
    }
    
    return [
      { value: 'default', label: 'Default Location', recommended: true }
    ]
  }

  // Update question flow with user answer
  static updateQuestionFlow(
    flow: QuestionFlow, 
    questionId: string, 
    answer: any
  ): QuestionFlow {
    const updatedFlow = { ...flow }
    updatedFlow.collectedAnswers[questionId] = answer
    
    // Move to next question
    const currentQuestion = flow.questions[flow.currentQuestionIndex]
    if (currentQuestion && currentQuestion.id === questionId) {
      updatedFlow.currentQuestionIndex++
    }
    
    // Calculate completion percentage
    const totalCriticalQuestions = flow.questions.filter(q => q.priority === 'critical').length
    const answeredCriticalQuestions = flow.questions
      .filter(q => q.priority === 'critical' && updatedFlow.collectedAnswers[q.id])
      .length
    
    updatedFlow.completionPercentage = totalCriticalQuestions > 0 
      ? (answeredCriticalQuestions / totalCriticalQuestions) * 100 
      : 100
    
    // Check if we can proceed
    updatedFlow.canProceed = answeredCriticalQuestions === totalCriticalQuestions
    
    return updatedFlow
  }

  // Get next question to ask
  static getNextQuestion(flow: QuestionFlow): SmartQuestion | null {
    if (flow.currentQuestionIndex >= flow.questions.length) {
      return null
    }
    
    return flow.questions[flow.currentQuestionIndex]
  }

  // Check if all critical questions are answered
  static isFlowComplete(flow: QuestionFlow): boolean {
    const criticalQuestions = flow.questions.filter(q => q.priority === 'critical')
    return criticalQuestions.every(q => flow.collectedAnswers[q.id] !== undefined)
  }
}
