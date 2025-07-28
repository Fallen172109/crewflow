/**
 * Response Formatting Utility for CrewFlow AI Agents
 * Improves readability by structuring responses with proper formatting
 */

export interface FormattingOptions {
  useMarkdown?: boolean
  maxLineLength?: number
  addSpacing?: boolean
  structureContent?: boolean
  maritimeTheming?: boolean
}

export interface ConversationContext {
  isFirstMessage?: boolean
  threadId?: string
  messageCount?: number
  agentName?: string
}

/**
 * Format AI agent responses for better readability
 */
export function formatAgentResponse(
  response: string,
  options: FormattingOptions = {},
  context: ConversationContext = {}
): string {
  const {
    useMarkdown = true,
    maxLineLength = 80,
    addSpacing = true,
    structureContent = true,
    maritimeTheming = true
  } = options

  let formattedResponse = response.trim()

  // Apply professional greeting logic (remove maritime greetings)
  if (maritimeTheming && context.agentName) {
    formattedResponse = applyMaritimeGreeting(formattedResponse, context)
  }

  // Structure content for better readability
  if (structureContent) {
    formattedResponse = structureResponseContent(formattedResponse, useMarkdown)
  }

  // Add proper spacing
  if (addSpacing) {
    formattedResponse = addProperSpacing(formattedResponse)
  }

  // Apply markdown formatting
  if (useMarkdown) {
    formattedResponse = enhanceMarkdownFormatting(formattedResponse)
  }

  return formattedResponse.trim()
}

/**
 * Apply professional greeting logic based on conversation context
 */
function applyMaritimeGreeting(response: string, context: ConversationContext): string {
  const { isFirstMessage = false, messageCount = 0, agentName = '' } = context

  // Remove all maritime greetings and emojis for professional communication
  const hasGreeting = /^⚓?\s*(Ahoy[^!]*!|Greetings[^!]*!|Welcome aboard[^!]*!|Aye,?\s*|Right away,?\s*|Understood,?\s*)/i.test(response)

  if (hasGreeting) {
    // Remove greeting entirely and start directly with the content
    response = response.replace(/^⚓?\s*(Ahoy[^!]*!|Greetings[^!]*!|Welcome aboard[^!]*!|Aye,?\s*|Right away,?\s*|Understood,?\s*)\s*/i, '')
  }

  // Also check for and replace repetitive "I'm [Agent Name]" introductions
  if (!isFirstMessage && agentName) {
    const introPattern = new RegExp(`I'm ${agentName}[^.]*\\.\\s*`, 'gi')
    response = response.replace(introPattern, '')

    // Remove any standalone agent name introductions
    const namePattern = new RegExp(`${agentName}[,\\s]+(here|ready|at your service)[^.]*\\.\\s*`, 'gi')
    response = response.replace(namePattern, '')
  }

  return response.trim()
}

/**
 * Structure content with proper headings, lists, and sections
 */
function structureResponseContent(content: string, useMarkdown: boolean): string {
  let structured = content

  // Convert numbered items to proper lists
  structured = structured.replace(/(\d+\.\s+)([^\n]+)/g, (match, number, text) => {
    return useMarkdown ? `${number}**${text.trim()}**` : `${number}${text.trim()}`
  })

  // Convert bullet-like patterns to proper bullets
  structured = structured.replace(/^[-•*]\s+/gm, '• ')

  // Add emphasis to key phrases
  if (useMarkdown) {
    // Emphasize action items
    structured = structured.replace(/\b(Action|Next steps?|Recommendations?|Key points?|Important|Note):/gi, '**$1:**')
    
    // Emphasize questions
    structured = structured.replace(/\b(Questions?|Considerations?|Factors?):/gi, '**$1:**')
  }

  // Structure long paragraphs
  structured = breakLongParagraphs(structured)

  return structured
}

/**
 * Break long paragraphs into more readable chunks
 */
function breakLongParagraphs(content: string): string {
  const paragraphs = content.split('\n\n')
  
  return paragraphs.map(paragraph => {
    // If paragraph is very long (>300 chars), try to break it at logical points
    if (paragraph.length > 300) {
      // Look for sentence breaks
      const sentences = paragraph.split(/(?<=[.!?])\s+/)
      
      if (sentences.length > 2) {
        const midPoint = Math.floor(sentences.length / 2)
        return sentences.slice(0, midPoint).join(' ') + '\n\n' + sentences.slice(midPoint).join(' ')
      }
    }
    return paragraph
  }).join('\n\n')
}

/**
 * Add proper spacing between sections
 */
function addProperSpacing(content: string): string {
  let spaced = content

  // Add spacing before lists
  spaced = spaced.replace(/([.!?])\s*\n(•|\d+\.)/g, '$1\n\n$2')

  // Add spacing before headings (markdown)
  spaced = spaced.replace(/([.!?])\s*\n(#{1,6}\s)/g, '$1\n\n$2')

  // Add spacing before emphasized sections
  spaced = spaced.replace(/([.!?])\s*\n(\*\*[^*]+\*\*:)/g, '$1\n\n$2')

  // Clean up excessive spacing
  spaced = spaced.replace(/\n{3,}/g, '\n\n')

  return spaced
}

/**
 * Enhance markdown formatting for better visual hierarchy
 */
function enhanceMarkdownFormatting(content: string): string {
  let enhanced = content

  // Convert ALL CAPS words to bold (but preserve maritime terms)
  enhanced = enhanced.replace(/\b[A-Z]{3,}\b/g, (match) => {
    // Don't format common maritime abbreviations
    const maritimeTerms = ['GPS', 'ETA', 'SOS', 'API', 'URL', 'PDF', 'CSV', 'JSON']
    if (maritimeTerms.includes(match)) {
      return match
    }
    return `**${match}**`
  })

  // Add emphasis to important phrases
  const importantPhrases = [
    'important to note',
    'key consideration',
    'critical factor',
    'essential step',
    'recommended approach',
    'best practice'
  ]

  importantPhrases.forEach(phrase => {
    const regex = new RegExp(`\\b${phrase}\\b`, 'gi')
    enhanced = enhanced.replace(regex, `**${phrase}**`)
  })

  // Format code-like terms
  enhanced = enhanced.replace(/\b(API|URL|JSON|CSV|PDF|HTML|CSS|JavaScript|TypeScript)\b/g, '`$1`')

  return enhanced
}

/**
 * Create a structured response template for specific types of content
 */
export function createStructuredResponse(
  title: string,
  sections: { heading: string; content: string; type?: 'list' | 'text' | 'steps' }[],
  conclusion?: string,
  maritimeClosing: boolean = true
): string {
  let response = `## ${title}\n\n`

  sections.forEach((section, index) => {
    response += `### ${section.heading}\n\n`

    if (section.type === 'list') {
      const items = section.content.split('\n').filter(item => item.trim())
      items.forEach(item => {
        response += `• ${item.trim()}\n`
      })
    } else if (section.type === 'steps') {
      const steps = section.content.split('\n').filter(step => step.trim())
      steps.forEach((step, stepIndex) => {
        response += `${stepIndex + 1}. ${step.trim()}\n`
      })
    } else {
      response += `${section.content}\n`
    }

    response += '\n'
  })

  if (conclusion) {
    response += `### Summary\n\n${conclusion}\n\n`
  }

  if (maritimeClosing) {
    response += `*Ready to chart the next course when you are!*`
  }

  return response
}

/**
 * Format error messages in a user-friendly way
 */
export function formatErrorResponse(
  error: string,
  agentName: string,
  suggestions: string[] = []
): string {
  let response = `⚠️ **Navigation Challenge Encountered**\n\n`
  response += `I encountered an issue while processing your request: ${error}\n\n`

  if (suggestions.length > 0) {
    response += `**Suggested Actions:**\n`
    suggestions.forEach(suggestion => {
      response += `• ${suggestion}\n`
    })
    response += '\n'
  }

  response += `*${agentName} stands ready to assist once the issue is resolved.*`

  return response
}
