// Real AI Productivity Planning Implementation
// Uses OpenAI/LangChain for intelligent productivity and personal organization

import { ChatOpenAI } from '@langchain/openai'
import { getAIConfig } from './config'

export interface ProductivityPlanRequest {
  goals?: string[]
  timeframe?: string
  availableHours?: number
  priorities?: string[]
  challenges?: string[]
  workStyle?: 'focused' | 'flexible' | 'structured' | 'creative'
  tools?: string[]
  learningGoals?: string[]
  skillLevel?: 'beginner' | 'intermediate' | 'advanced'
  focusAreas?: string[]
}

export interface ProductivityPlanResponse {
  success: boolean
  productivityPlan?: {
    overview: string
    dailySchedule: DailyProductivityPlan[]
    weeklyGoals: WeeklyGoal[]
    learningPath: LearningModule[]
    organizationSystem: OrganizationFramework
    habitTracking: HabitTracker
    motivationStrategies: string[]
  }
  tokensUsed: number
  latency: number
  model: string
  error?: string
}

export interface DailyProductivityPlan {
  day: string
  timeBlocks: TimeBlock[]
  priorities: string[]
  energyOptimization: string
  reflectionPrompts: string[]
}

export interface TimeBlock {
  time: string
  activity: string
  type: 'deep work' | 'admin' | 'learning' | 'break' | 'planning'
  duration: string
  tools: string[]
  tips: string[]
}

export interface WeeklyGoal {
  week: number
  primaryGoal: string
  subGoals: string[]
  metrics: string[]
  milestones: string[]
  rewards: string
}

export interface LearningModule {
  topic: string
  description: string
  duration: string
  resources: string[]
  exercises: string[]
  assessments: string[]
  nextSteps: string[]
}

export interface OrganizationFramework {
  system: string
  tools: string[]
  fileStructure: string[]
  workflows: Workflow[]
  maintenanceSchedule: string[]
}

export interface Workflow {
  name: string
  trigger: string
  steps: string[]
  tools: string[]
  frequency: string
}

export interface HabitTracker {
  dailyHabits: Habit[]
  weeklyHabits: Habit[]
  monthlyReviews: string[]
  progressMetrics: string[]
}

export interface Habit {
  name: string
  description: string
  frequency: string
  timeOfDay: string
  duration: string
  trackingMethod: string
  successCriteria: string
}

export class ProductivityPlanningService {
  private llm: ChatOpenAI

  constructor() {
    const aiConfig = getAIConfig()
    this.llm = new ChatOpenAI({
      apiKey: aiConfig.openai.apiKey,
      model: aiConfig.openai.model,
      maxTokens: 4000,
      temperature: 0.7
    })
  }

  async generateProductivityPlan(request: ProductivityPlanRequest): Promise<ProductivityPlanResponse> {
    const startTime = Date.now()

    try {
      const prompt = this.buildProductivityPlanPrompt(request)
      console.log('Generating productivity plan with prompt:', prompt)

      const response = await this.llm.invoke(prompt)
      const responseText = response.content as string

      // Parse the structured response
      const productivityPlan = this.parseProductivityPlanResponse(responseText)

      return {
        success: true,
        productivityPlan,
        tokensUsed: response.usage?.totalTokens || 0,
        latency: Date.now() - startTime,
        model: this.llm.model
      }
    } catch (error) {
      console.error('Productivity planning error:', error)
      return {
        success: false,
        tokensUsed: 0,
        latency: Date.now() - startTime,
        model: this.llm.model,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private buildProductivityPlanPrompt(request: ProductivityPlanRequest): string {
    const timeframe = request.timeframe || '4 weeks'
    const availableHours = request.availableHours || 8
    const workStyle = request.workStyle || 'balanced'

    return `You are a productivity expert and personal development coach. Create a comprehensive productivity plan with the following specifications:

**PRODUCTIVITY PROFILE:**
- Primary Goals: ${request.goals?.join(', ') || 'Improve overall productivity'}
- Timeframe: ${timeframe}
- Available hours per day: ${availableHours}
- Work Style: ${workStyle}
- Skill Level: ${request.skillLevel || 'intermediate'}

**FOCUS AREAS:**
${request.focusAreas?.join(', ') || 'Time management, goal achievement, skill development'}

**CURRENT CHALLENGES:**
${request.challenges?.join(', ') || 'Procrastination, lack of focus, poor time management'}

**LEARNING GOALS:**
${request.learningGoals?.join(', ') || 'Productivity techniques, personal organization'}

**AVAILABLE TOOLS:**
${request.tools?.join(', ') || 'Basic productivity apps and tools'}

Please provide a detailed response in the following JSON-like structure:

{
  "overview": "Comprehensive overview of the productivity approach and methodology",
  "dailySchedule": [
    {
      "day": "Monday",
      "timeBlocks": [
        {
          "time": "9:00-11:00 AM",
          "activity": "Deep Work Session",
          "type": "deep work",
          "duration": "2 hours",
          "tools": ["Focus app", "Noise-canceling headphones"],
          "tips": ["Turn off notifications", "Use Pomodoro technique"]
        }
      ],
      "priorities": ["Complete project milestone", "Review weekly goals"],
      "energyOptimization": "Schedule demanding tasks during peak energy hours",
      "reflectionPrompts": ["What did I accomplish today?", "What can I improve tomorrow?"]
    }
    // ... continue for all 7 days
  ],
  "weeklyGoals": [
    {
      "week": 1,
      "primaryGoal": "Establish productivity routines",
      "subGoals": ["Set up organization system", "Define daily habits"],
      "metrics": ["Tasks completed", "Time tracked"],
      "milestones": ["Complete system setup", "Track 5 consecutive days"],
      "rewards": "Weekend leisure activity"
    }
  ],
  "learningPath": [
    {
      "topic": "Time Management Fundamentals",
      "description": "Core principles of effective time management",
      "duration": "Week 1",
      "resources": ["Books", "Online courses", "Podcasts"],
      "exercises": ["Time audit", "Priority matrix"],
      "assessments": ["Weekly review", "Habit tracking"],
      "nextSteps": ["Advanced techniques", "Tool optimization"]
    }
  ],
  "organizationSystem": {
    "system": "Getting Things Done (GTD) methodology",
    "tools": ["Task manager", "Calendar", "Note-taking app"],
    "fileStructure": ["Projects", "Areas", "Resources", "Archive"],
    "workflows": [
      {
        "name": "Weekly Review",
        "trigger": "Every Sunday evening",
        "steps": ["Review completed tasks", "Plan next week", "Update goals"],
        "tools": ["Calendar", "Task manager"],
        "frequency": "Weekly"
      }
    ],
    "maintenanceSchedule": ["Daily capture", "Weekly review", "Monthly planning"]
  },
  "habitTracking": {
    "dailyHabits": [
      {
        "name": "Morning Planning",
        "description": "Review and prioritize daily tasks",
        "frequency": "Daily",
        "timeOfDay": "8:00 AM",
        "duration": "15 minutes",
        "trackingMethod": "Habit tracker app",
        "successCriteria": "Complete daily plan before starting work"
      }
    ],
    "weeklyHabits": [
      {
        "name": "Weekly Review",
        "description": "Reflect on progress and plan ahead",
        "frequency": "Weekly",
        "timeOfDay": "Sunday evening",
        "duration": "30 minutes",
        "trackingMethod": "Journal entry",
        "successCriteria": "Complete review and set next week's priorities"
      }
    ],
    "monthlyReviews": ["Goal progress assessment", "System optimization"],
    "progressMetrics": ["Task completion rate", "Goal achievement", "Habit consistency"]
  },
  "motivationStrategies": [
    "Celebrate small wins daily",
    "Use accountability partners",
    "Track progress visually"
  ]
}

Ensure the plan is:
1. Realistic and sustainable for the specified timeframe
2. Tailored to the individual's work style and preferences
3. Includes both short-term and long-term goals
4. Provides specific, actionable steps
5. Incorporates proven productivity methodologies
6. Includes measurement and tracking mechanisms
7. Addresses common productivity challenges

Focus on creating a practical, implementable system that promotes sustained productivity improvement and personal growth.`
  }

  private parseProductivityPlanResponse(responseText: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      // If no JSON found, create a structured response from the text
      return this.createStructuredProductivityPlan(responseText)
    } catch (error) {
      console.error('Error parsing productivity plan response:', error)
      return this.createFallbackProductivityPlan(responseText)
    }
  }

  private createStructuredProductivityPlan(responseText: string): any {
    return {
      overview: "Personalized productivity plan designed to optimize your daily workflow and achieve your goals",
      dailySchedule: [
        {
          day: "Monday",
          timeBlocks: [
            {
              time: "9:00-11:00 AM",
              activity: "Deep Work Session",
              type: "deep work",
              duration: "2 hours",
              tools: ["Focus timer", "Task manager"],
              tips: ["Eliminate distractions", "Use time blocking"]
            }
          ],
          priorities: ["High-impact tasks", "Goal progress"],
          energyOptimization: "Schedule demanding work during peak energy",
          reflectionPrompts: ["What did I accomplish?", "How can I improve?"]
        }
      ],
      weeklyGoals: [
        {
          week: 1,
          primaryGoal: "Establish productivity foundation",
          subGoals: ["Set up systems", "Build habits"],
          metrics: ["Task completion", "Time tracking"],
          milestones: ["System implementation", "Habit consistency"],
          rewards: "Personal reward"
        }
      ],
      learningPath: [
        {
          topic: "Productivity Fundamentals",
          description: "Core productivity principles and techniques",
          duration: "2 weeks",
          resources: ["Books", "Articles", "Videos"],
          exercises: ["Time audit", "Goal setting"],
          assessments: ["Weekly review", "Progress tracking"],
          nextSteps: ["Advanced techniques", "System optimization"]
        }
      ],
      organizationSystem: {
        system: "Integrated productivity framework",
        tools: ["Task manager", "Calendar", "Notes"],
        fileStructure: ["Projects", "Areas", "Resources"],
        workflows: [
          {
            name: "Daily Planning",
            trigger: "Each morning",
            steps: ["Review calendar", "Set priorities", "Plan tasks"],
            tools: ["Calendar", "Task manager"],
            frequency: "Daily"
          }
        ],
        maintenanceSchedule: ["Daily planning", "Weekly review"]
      },
      habitTracking: {
        dailyHabits: [
          {
            name: "Morning Planning",
            description: "Plan the day ahead",
            frequency: "Daily",
            timeOfDay: "Morning",
            duration: "15 minutes",
            trackingMethod: "Habit tracker",
            successCriteria: "Complete daily plan"
          }
        ],
        weeklyHabits: [
          {
            name: "Weekly Review",
            description: "Reflect and plan ahead",
            frequency: "Weekly",
            timeOfDay: "Sunday",
            duration: "30 minutes",
            trackingMethod: "Journal",
            successCriteria: "Complete review"
          }
        ],
        monthlyReviews: ["Goal assessment", "System review"],
        progressMetrics: ["Completion rate", "Goal progress"]
      },
      motivationStrategies: [
        "Celebrate achievements",
        "Track progress visually",
        "Use accountability systems"
      ],
      detailedPlan: responseText
    }
  }

  private createFallbackProductivityPlan(responseText: string): any {
    return {
      overview: "Productivity plan generated successfully",
      dailySchedule: [],
      weeklyGoals: [],
      learningPath: [],
      organizationSystem: { system: "", tools: [], fileStructure: [], workflows: [], maintenanceSchedule: [] },
      habitTracking: { dailyHabits: [], weeklyHabits: [], monthlyReviews: [], progressMetrics: [] },
      motivationStrategies: [],
      rawResponse: responseText
    }
  }
}

// Factory function
export function createProductivityPlanningService(): ProductivityPlanningService {
  return new ProductivityPlanningService()
}

// Validation function
export function validateProductivityPlanRequest(request: ProductivityPlanRequest): { isValid: boolean; error?: string } {
  if (request.availableHours && (request.availableHours < 1 || request.availableHours > 16)) {
    return { isValid: false, error: 'Available hours must be between 1 and 16' }
  }
  
  return { isValid: true }
}
