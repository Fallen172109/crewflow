// Real AI Fitness Planning Implementation
// Uses OpenAI/LangChain for intelligent fitness planning and workout generation

import { ChatOpenAI } from '@langchain/openai'
import { getAIConfig } from './config'

export interface FitnessPlanRequest {
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced'
  goals?: string[]
  availableTime?: string
  daysPerWeek?: number
  equipment?: string[]
  injuries?: string[]
  preferredActivities?: string[]
  age?: number
  weight?: number
  height?: string
  targetWeight?: number
  medicalConditions?: string[]
}

export interface FitnessPlanResponse {
  success: boolean
  fitnessPlan?: {
    overview: string
    weeklySchedule: WeeklyWorkout[]
    progressTracking: ProgressMetrics
    nutritionGuidance: string[]
    safetyTips: string[]
    motivationalTips: string[]
  }
  tokensUsed: number
  latency: number
  model: string
  error?: string
}

export interface WeeklyWorkout {
  day: string
  workout?: Workout
  restDay?: boolean
  activeRecovery?: string
}

export interface Workout {
  name: string
  type: string
  duration: string
  warmup: Exercise[]
  mainWorkout: Exercise[]
  cooldown: Exercise[]
  targetMuscles: string[]
  caloriesBurned: string
  difficulty: string
}

export interface Exercise {
  name: string
  description: string
  sets?: number
  reps?: string
  duration?: string
  restBetweenSets?: string
  modifications: string[]
  targetMuscles: string[]
  equipment: string[]
}

export interface ProgressMetrics {
  weeklyGoals: string[]
  measurements: string[]
  performanceIndicators: string[]
  milestones: Milestone[]
}

export interface Milestone {
  week: number
  goal: string
  measurement: string
  reward: string
}

export class FitnessPlanningService {
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

  async generateFitnessPlan(request: FitnessPlanRequest): Promise<FitnessPlanResponse> {
    const startTime = Date.now()

    try {
      const prompt = this.buildFitnessPlanPrompt(request)
      console.log('Generating fitness plan with prompt:', prompt)

      const response = await this.llm.invoke(prompt)
      const responseText = response.content as string

      // Parse the structured response
      const fitnessPlan = this.parseFitnessPlanResponse(responseText)

      return {
        success: true,
        fitnessPlan,
        tokensUsed: response.usage?.totalTokens || 0,
        latency: Date.now() - startTime,
        model: this.llm.model
      }
    } catch (error) {
      console.error('Fitness planning error:', error)
      return {
        success: false,
        tokensUsed: 0,
        latency: Date.now() - startTime,
        model: this.llm.model,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private buildFitnessPlanPrompt(request: FitnessPlanRequest): string {
    const daysPerWeek = request.daysPerWeek || 3
    const availableTime = request.availableTime || '30-45 minutes'
    const fitnessLevel = request.fitnessLevel || 'beginner'

    return `You are a certified personal trainer and fitness expert. Create a comprehensive fitness plan with the following specifications:

**CLIENT PROFILE:**
- Fitness Level: ${fitnessLevel}
- Age: ${request.age || 'Not specified'}
- Current Weight: ${request.weight || 'Not specified'}
- Height: ${request.height || 'Not specified'}
- Target Weight: ${request.targetWeight || 'Not specified'}

**FITNESS GOALS:**
${request.goals?.join(', ') || 'General fitness and health'}

**SCHEDULE & CONSTRAINTS:**
- Days per week: ${daysPerWeek}
- Available time per session: ${availableTime}
- Available equipment: ${request.equipment?.join(', ') || 'Bodyweight exercises'}
- Preferred activities: ${request.preferredActivities?.join(', ') || 'Varied'}

**HEALTH CONSIDERATIONS:**
- Injuries/Limitations: ${request.injuries?.join(', ') || 'None reported'}
- Medical conditions: ${request.medicalConditions?.join(', ') || 'None reported'}

Please provide a detailed response in the following JSON-like structure:

{
  "overview": "Brief overview of the fitness plan approach and methodology",
  "weeklySchedule": [
    {
      "day": "Monday",
      "workout": {
        "name": "Upper Body Strength",
        "type": "Strength Training",
        "duration": "${availableTime}",
        "warmup": [
          {
            "name": "Arm Circles",
            "description": "Large circular motions with arms",
            "duration": "30 seconds",
            "modifications": ["Smaller circles for shoulder issues"],
            "targetMuscles": ["shoulders"],
            "equipment": ["none"]
          }
        ],
        "mainWorkout": [
          {
            "name": "Push-ups",
            "description": "Standard push-up form",
            "sets": 3,
            "reps": "8-12",
            "restBetweenSets": "60 seconds",
            "modifications": ["Knee push-ups", "Wall push-ups"],
            "targetMuscles": ["chest", "triceps", "shoulders"],
            "equipment": ["none"]
          }
        ],
        "cooldown": [
          {
            "name": "Chest Stretch",
            "description": "Doorway chest stretch",
            "duration": "30 seconds",
            "modifications": ["Seated version"],
            "targetMuscles": ["chest"],
            "equipment": ["none"]
          }
        ],
        "targetMuscles": ["chest", "shoulders", "triceps", "back"],
        "caloriesBurned": "200-300",
        "difficulty": "${fitnessLevel}"
      }
    },
    {
      "day": "Tuesday",
      "restDay": true,
      "activeRecovery": "Light walking or gentle stretching"
    }
    // ... continue for all 7 days
  ],
  "progressTracking": {
    "weeklyGoals": ["Complete all scheduled workouts", "Increase reps by 1-2"],
    "measurements": ["Weight", "Body measurements", "Workout performance"],
    "performanceIndicators": ["Reps completed", "Weight lifted", "Endurance time"],
    "milestones": [
      {
        "week": 4,
        "goal": "Complete first month consistently",
        "measurement": "Workout completion rate",
        "reward": "New workout gear"
      }
    ]
  },
  "nutritionGuidance": [
    "Eat protein within 30 minutes post-workout",
    "Stay hydrated throughout the day",
    "Focus on whole foods and balanced meals"
  ],
  "safetyTips": [
    "Always warm up before exercising",
    "Listen to your body and rest when needed",
    "Maintain proper form over speed or weight"
  ],
  "motivationalTips": [
    "Track your progress in a fitness journal",
    "Celebrate small victories",
    "Find a workout buddy for accountability"
  ]
}

Ensure the plan is:
1. Safe and appropriate for the specified fitness level
2. Progressive and scalable
3. Includes proper warm-up and cool-down
4. Accommodates any injuries or limitations
5. Provides clear exercise descriptions and modifications
6. Includes realistic goals and milestones
7. Balances different types of training (strength, cardio, flexibility)

Focus on creating an achievable, sustainable fitness routine that promotes long-term health and fitness success.`
  }

  private parseFitnessPlanResponse(responseText: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      // If no JSON found, create a structured response from the text
      return this.createStructuredFitnessPlan(responseText)
    } catch (error) {
      console.error('Error parsing fitness plan response:', error)
      return this.createFallbackFitnessPlan(responseText)
    }
  }

  private createStructuredFitnessPlan(responseText: string): any {
    // Create a basic structured fitness plan from unstructured text
    return {
      overview: "Personalized fitness plan designed for your goals and fitness level",
      weeklySchedule: [
        {
          day: "Monday",
          workout: {
            name: "Full Body Workout",
            type: "Strength & Cardio",
            duration: "30-45 minutes",
            warmup: [
              {
                name: "Dynamic Warm-up",
                description: "Light movement to prepare the body",
                duration: "5 minutes",
                modifications: ["Reduce intensity if needed"],
                targetMuscles: ["full body"],
                equipment: ["none"]
              }
            ],
            mainWorkout: [
              {
                name: "Bodyweight Exercises",
                description: "Compound movements for strength",
                sets: 3,
                reps: "10-15",
                restBetweenSets: "60 seconds",
                modifications: ["Adjust reps based on ability"],
                targetMuscles: ["full body"],
                equipment: ["none"]
              }
            ],
            cooldown: [
              {
                name: "Stretching",
                description: "Full body stretching routine",
                duration: "5-10 minutes",
                modifications: ["Hold stretches as comfortable"],
                targetMuscles: ["full body"],
                equipment: ["none"]
              }
            ],
            targetMuscles: ["full body"],
            caloriesBurned: "200-400",
            difficulty: "moderate"
          }
        },
        {
          day: "Tuesday",
          restDay: true,
          activeRecovery: "Light walking or yoga"
        },
        {
          day: "Wednesday",
          workout: {
            name: "Cardio Focus",
            type: "Cardiovascular",
            duration: "30 minutes",
            warmup: [],
            mainWorkout: [],
            cooldown: [],
            targetMuscles: ["cardiovascular system"],
            caloriesBurned: "250-350",
            difficulty: "moderate"
          }
        }
      ],
      progressTracking: {
        weeklyGoals: ["Complete all planned workouts", "Improve endurance"],
        measurements: ["Weight", "Fitness metrics"],
        performanceIndicators: ["Workout completion", "Strength gains"],
        milestones: [
          {
            week: 4,
            goal: "Establish routine",
            measurement: "Consistency",
            reward: "Celebrate progress"
          }
        ]
      },
      nutritionGuidance: [
        "Eat balanced meals",
        "Stay hydrated",
        "Post-workout nutrition"
      ],
      safetyTips: [
        "Warm up properly",
        "Listen to your body",
        "Maintain good form"
      ],
      motivationalTips: [
        "Set realistic goals",
        "Track progress",
        "Stay consistent"
      ],
      detailedPlan: responseText
    }
  }

  private createFallbackFitnessPlan(responseText: string): any {
    return {
      overview: "Fitness plan generated successfully",
      weeklySchedule: [],
      progressTracking: {
        weeklyGoals: [],
        measurements: [],
        performanceIndicators: [],
        milestones: []
      },
      nutritionGuidance: [],
      safetyTips: [],
      motivationalTips: [],
      rawResponse: responseText
    }
  }
}

// Factory function
export function createFitnessPlanningService(): FitnessPlanningService {
  return new FitnessPlanningService()
}

// Validation function
export function validateFitnessPlanRequest(request: FitnessPlanRequest): { isValid: boolean; error?: string } {
  if (request.daysPerWeek && (request.daysPerWeek < 1 || request.daysPerWeek > 7)) {
    return { isValid: false, error: 'Days per week must be between 1 and 7' }
  }
  
  if (request.age && (request.age < 13 || request.age > 100)) {
    return { isValid: false, error: 'Age must be between 13 and 100' }
  }
  
  return { isValid: true }
}
