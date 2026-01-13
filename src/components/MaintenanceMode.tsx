'use client'

import { useState } from 'react'
import { Particles } from '@/components/ui/particles'
import FixedMaintenanceTypewriter from '@/components/ui/FixedMaintenanceTypewriter'

interface MaintenanceModeProps {
  onAccessGranted: () => void
}

export default function MaintenanceMode({ onAccessGranted }: MaintenanceModeProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPasswordInput, setShowPasswordInput] = useState(false)

  const handleTypewriterComplete = () => {
    // Show password input after typewriter animation completes
    setTimeout(() => {
      setShowPasswordInput(true)
    }, 1000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/maintenance-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      if (response.ok) {
        // Store access in session
        sessionStorage.setItem('maintenance_access', 'granted')
        onAccessGranted()
      } else {
        setError('Invalid password. Please try again.')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-black text-white flex items-center justify-center overflow-hidden">
      {/* Green particles background */}
      <Particles
        className="absolute inset-0"
        quantity={150}
        ease={80}
        color="#5BBF46"
        size={1.2}
        staticity={60}
        refresh
      />

      {/* Content - Perfectly centered */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4">
        <div className="flex flex-col items-center justify-center text-center space-y-8">
          {/* Typewriter Effect */}
          <div className="w-full">
            <FixedMaintenanceTypewriter
              onComplete={handleTypewriterComplete}
              typingSpeed={60}
            />
          </div>

          {/* Password Input - Only show after typewriter completes */}
          {showPasswordInput && (
            <div className="w-full max-w-md">
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password to continue"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent backdrop-blur-sm text-center"
                  disabled={isLoading}
                  autoFocus
                />

                {error && (
                  <p className="text-red-400 text-sm text-center">
                    {error}
                  </p>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
