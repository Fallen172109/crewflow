'use client'

import { useState, useEffect } from 'react'
import MaintenanceMode from './MaintenanceMode'

interface MaintenanceWrapperProps {
  children: React.ReactNode
}

export default function MaintenanceWrapper({ children }: MaintenanceWrapperProps) {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check maintenance mode status from API
    const checkMaintenanceMode = async () => {
      try {
        const response = await fetch('/api/maintenance-status')
        const data = await response.json()

        if (data.maintenanceMode) {
          setIsMaintenanceMode(true)
          // Check if user already has access in this session
          const sessionAccess = sessionStorage.getItem('maintenance_access')
          if (sessionAccess === 'granted') {
            setHasAccess(true)
          }
        }
      } catch (error) {
        console.error('Error checking maintenance mode:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkMaintenanceMode()
  }, [])

  const handleAccessGranted = () => {
    setHasAccess(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (isMaintenanceMode && !hasAccess) {
    return <MaintenanceMode onAccessGranted={handleAccessGranted} />
  }

  return <>{children}</>
}
