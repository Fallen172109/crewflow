// Session Management System for CrewFlow Enhanced Context
// Handles session-based context tracking, automatic restoration, and cross-tab synchronization

import { getContextManager, ConversationSession } from './ContextManager'
import { useShopifyStore } from '@/contexts/ShopifyStoreContext'

export interface SessionState {
  sessionId: string
  userId: string
  activeThreadId?: string
  storeContext: any
  conversationPhase: 'introduction' | 'working' | 'handoff' | 'completion'
  lastActivity: string
  metadata: {
    userAgent: string
    startTime: string
    pageRefreshCount: number
    interactionCount: number
    lastStoreAction?: string
    currentPage: string
  }
}

export interface SessionStorageData {
  sessionState: SessionState
  conversationHistory: any[]
  contextCache: any
  lastSyncTime: string
}

export class SessionManager {
  private sessionId: string
  private userId: string
  private contextManager: any
  private storageKey: string
  private syncInterval: NodeJS.Timeout | null = null
  private eventListeners: Map<string, Function[]> = new Map()

  constructor(userId: string) {
    this.userId = userId
    this.sessionId = this.generateSessionId()
    this.storageKey = `crewflow_session_${userId}`
    this.contextManager = getContextManager(false)
    
    this.initializeSession()
    this.setupEventListeners()
    this.startSyncInterval()
  }

  // =====================================================
  // Session Initialization and Management
  // =====================================================

  private generateSessionId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    return `session_${timestamp}_${random}`
  }

  private async initializeSession(): Promise<void> {
    try {
      // Try to restore existing session
      const existingSession = this.getStoredSession()
      
      if (existingSession && this.isSessionValid(existingSession)) {
        console.log('🔄 SESSION MANAGER: Restoring existing session:', existingSession.sessionState.sessionId)
        this.sessionId = existingSession.sessionState.sessionId
        await this.restoreSession(existingSession)
      } else {
        console.log('🆕 SESSION MANAGER: Creating new session:', this.sessionId)
        await this.createNewSession()
      }

      // Update page refresh count
      this.incrementPageRefreshCount()
      
    } catch (error) {
      console.error('🔄 SESSION MANAGER: Failed to initialize session:', error)
      await this.createNewSession()
    }
  }

  private async createNewSession(): Promise<void> {
    try {
      const sessionState: SessionState = {
        sessionId: this.sessionId,
        userId: this.userId,
        storeContext: {},
        conversationPhase: 'introduction',
        lastActivity: new Date().toISOString(),
        metadata: {
          userAgent: navigator.userAgent,
          startTime: new Date().toISOString(),
          pageRefreshCount: 0,
          interactionCount: 0,
          currentPage: window.location.pathname
        }
      }

      // Create session in database
      await this.contextManager.createOrUpdateSession(
        this.userId,
        this.sessionId,
        sessionState.storeContext,
        sessionState.metadata
      )

      // Store in browser storage
      this.storeSession({
        sessionState,
        conversationHistory: [],
        contextCache: {},
        lastSyncTime: new Date().toISOString()
      })

      this.emit('sessionCreated', sessionState)
      
    } catch (error) {
      console.error('🆕 SESSION MANAGER: Failed to create new session:', error)
      throw error
    }
  }

  private async restoreSession(sessionData: SessionStorageData): Promise<void> {
    try {
      // Update session activity in database
      await this.contextManager.updateSessionActivity(
        this.userId,
        this.sessionId,
        'session_restored',
        'page_refresh'
      )

      // Update current page in metadata
      const updatedState = {
        ...sessionData.sessionState,
        lastActivity: new Date().toISOString(),
        metadata: {
          ...sessionData.sessionState.metadata,
          currentPage: window.location.pathname
        }
      }

      this.storeSession({
        ...sessionData,
        sessionState: updatedState,
        lastSyncTime: new Date().toISOString()
      })

      this.emit('sessionRestored', updatedState)
      
    } catch (error) {
      console.error('🔄 SESSION MANAGER: Failed to restore session:', error)
      throw error
    }
  }

  // =====================================================
  // Session Storage and Retrieval
  // =====================================================

  private getStoredSession(): SessionStorageData | null {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (!stored) return null

      const sessionData = JSON.parse(stored) as SessionStorageData
      return sessionData
    } catch (error) {
      console.error('🔄 SESSION MANAGER: Failed to get stored session:', error)
      return null
    }
  }

  private storeSession(sessionData: SessionStorageData): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(sessionData))
      
      // Also store in sessionStorage for cross-tab detection
      sessionStorage.setItem(`${this.storageKey}_active`, this.sessionId)
      
    } catch (error) {
      console.error('🔄 SESSION MANAGER: Failed to store session:', error)
    }
  }

  private isSessionValid(sessionData: SessionStorageData): boolean {
    try {
      const lastActivity = new Date(sessionData.sessionState.lastActivity)
      const now = new Date()
      const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)
      
      // Session is valid if last activity was within 24 hours
      return hoursSinceActivity < 24
    } catch (error) {
      console.error('🔄 SESSION MANAGER: Failed to validate session:', error)
      return false
    }
  }

  // =====================================================
  // Session State Management
  // =====================================================

  async updateStoreContext(storeContext: any): Promise<void> {
    try {
      const sessionData = this.getStoredSession()
      if (!sessionData) return

      const updatedState = {
        ...sessionData.sessionState,
        storeContext,
        lastActivity: new Date().toISOString()
      }

      // Update in database
      await this.contextManager.createOrUpdateSession(
        this.userId,
        this.sessionId,
        storeContext,
        updatedState.metadata
      )

      // Update in storage
      this.storeSession({
        ...sessionData,
        sessionState: updatedState,
        lastSyncTime: new Date().toISOString()
      })

      this.emit('storeContextUpdated', storeContext)
      
    } catch (error) {
      console.error('🔄 SESSION MANAGER: Failed to update store context:', error)
    }
  }

  async updateConversationPhase(phase: SessionState['conversationPhase']): Promise<void> {
    try {
      const sessionData = this.getStoredSession()
      if (!sessionData) return

      const updatedState = {
        ...sessionData.sessionState,
        conversationPhase: phase,
        lastActivity: new Date().toISOString()
      }

      this.storeSession({
        ...sessionData,
        sessionState: updatedState,
        lastSyncTime: new Date().toISOString()
      })

      this.emit('conversationPhaseChanged', phase)
      
    } catch (error) {
      console.error('🔄 SESSION MANAGER: Failed to update conversation phase:', error)
    }
  }

  async setActiveThread(threadId: string): Promise<void> {
    try {
      const sessionData = this.getStoredSession()
      if (!sessionData) return

      const updatedState = {
        ...sessionData.sessionState,
        activeThreadId: threadId,
        lastActivity: new Date().toISOString()
      }

      // Update in database
      await this.contextManager.updateSessionActivity(
        this.userId,
        this.sessionId,
        'thread_activated',
        `thread_${threadId}`
      )

      this.storeSession({
        ...sessionData,
        sessionState: updatedState,
        lastSyncTime: new Date().toISOString()
      })

      this.emit('activeThreadChanged', threadId)
      
    } catch (error) {
      console.error('🔄 SESSION MANAGER: Failed to set active thread:', error)
    }
  }

  async recordInteraction(interactionType: string, details?: any): Promise<void> {
    try {
      const sessionData = this.getStoredSession()
      if (!sessionData) return

      const updatedMetadata = {
        ...sessionData.sessionState.metadata,
        interactionCount: sessionData.sessionState.metadata.interactionCount + 1,
        lastStoreAction: interactionType
      }

      const updatedState = {
        ...sessionData.sessionState,
        metadata: updatedMetadata,
        lastActivity: new Date().toISOString()
      }

      // Update in database
      await this.contextManager.updateSessionActivity(
        this.userId,
        this.sessionId,
        interactionType,
        details ? JSON.stringify(details) : undefined
      )

      this.storeSession({
        ...sessionData,
        sessionState: updatedState,
        lastSyncTime: new Date().toISOString()
      })

      this.emit('interactionRecorded', { type: interactionType, details })
      
    } catch (error) {
      console.error('🔄 SESSION MANAGER: Failed to record interaction:', error)
    }
  }

  // =====================================================
  // Cross-Tab Synchronization
  // =====================================================

  private setupEventListeners(): void {
    // Listen for storage changes (cross-tab communication)
    window.addEventListener('storage', this.handleStorageChange.bind(this))
    
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    
    // Listen for beforeunload to cleanup
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this))
  }

  private handleStorageChange(event: StorageEvent): void {
    if (event.key === this.storageKey && event.newValue) {
      try {
        const newSessionData = JSON.parse(event.newValue) as SessionStorageData
        
        // Check if this is a different session
        if (newSessionData.sessionState.sessionId !== this.sessionId) {
          console.log('🔄 SESSION MANAGER: Detected session change from another tab')
          this.emit('sessionSyncDetected', newSessionData.sessionState)
        }
      } catch (error) {
        console.error('🔄 SESSION MANAGER: Failed to handle storage change:', error)
      }
    }
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      // Tab became visible - sync session
      this.syncSession()
    }
  }

  private handleBeforeUnload(): void {
    // Update last activity before page unload
    this.recordInteraction('page_unload')
    this.stopSyncInterval()
  }

  private startSyncInterval(): void {
    // Sync session every 30 seconds
    this.syncInterval = setInterval(() => {
      this.syncSession()
    }, 30000)
  }

  private stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  private async syncSession(): Promise<void> {
    try {
      const sessionData = this.getStoredSession()
      if (!sessionData) return

      // Update last sync time
      this.storeSession({
        ...sessionData,
        lastSyncTime: new Date().toISOString()
      })

      // Update activity in database
      await this.contextManager.updateSessionActivity(
        this.userId,
        this.sessionId,
        'session_sync'
      )

    } catch (error) {
      console.error('🔄 SESSION MANAGER: Failed to sync session:', error)
    }
  }

  // =====================================================
  // Event System
  // =====================================================

  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`🔄 SESSION MANAGER: Event listener error for ${event}:`, error)
        }
      })
    }
  }

  // =====================================================
  // Utility Methods
  // =====================================================

  private incrementPageRefreshCount(): void {
    const sessionData = this.getStoredSession()
    if (!sessionData) return

    const updatedMetadata = {
      ...sessionData.sessionState.metadata,
      pageRefreshCount: sessionData.sessionState.metadata.pageRefreshCount + 1
    }

    const updatedState = {
      ...sessionData.sessionState,
      metadata: updatedMetadata
    }

    this.storeSession({
      ...sessionData,
      sessionState: updatedState
    })
  }

  // =====================================================
  // Public API
  // =====================================================

  getSessionId(): string {
    return this.sessionId
  }

  getSessionState(): SessionState | null {
    const sessionData = this.getStoredSession()
    return sessionData?.sessionState || null
  }

  getActiveThreadId(): string | undefined {
    const sessionState = this.getSessionState()
    return sessionState?.activeThreadId
  }

  getStoreContext(): any {
    const sessionState = this.getSessionState()
    return sessionState?.storeContext || {}
  }

  getConversationPhase(): SessionState['conversationPhase'] {
    const sessionState = this.getSessionState()
    return sessionState?.conversationPhase || 'introduction'
  }

  async clearSession(): Promise<void> {
    try {
      localStorage.removeItem(this.storageKey)
      sessionStorage.removeItem(`${this.storageKey}_active`)
      this.stopSyncInterval()
      
      this.emit('sessionCleared')
      
    } catch (error) {
      console.error('🔄 SESSION MANAGER: Failed to clear session:', error)
    }
  }

  destroy(): void {
    this.stopSyncInterval()
    window.removeEventListener('storage', this.handleStorageChange.bind(this))
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this))
    this.eventListeners.clear()
  }
}

// Singleton instance for session management
let sessionManagerInstance: SessionManager | null = null

export function getSessionManager(userId: string): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager(userId)
  }
  return sessionManagerInstance
}

export function clearSessionManager(): void {
  if (sessionManagerInstance) {
    sessionManagerInstance.destroy()
    sessionManagerInstance = null
  }
}

export default SessionManager
