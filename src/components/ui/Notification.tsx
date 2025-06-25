'use client'

import { useEffect, useState } from 'react'

interface NotificationProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
  onClose?: () => void
  className?: string
}

export default function Notification({
  type,
  title,
  message,
  duration = 5000,
  onClose,
  className = ''
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => {
          onClose?.()
        }, 300) // Wait for fade out animation
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose?.()
    }, 300)
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-green-50 border-green-200',
          text: 'text-green-700',
          titleText: 'text-green-800',
          icon: (
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )
        }
      case 'error':
        return {
          container: 'bg-red-50 border-red-200',
          text: 'text-red-700',
          titleText: 'text-red-800',
          icon: (
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )
        }
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          text: 'text-yellow-700',
          titleText: 'text-yellow-800',
          icon: (
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )
        }
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-200',
          text: 'text-blue-700',
          titleText: 'text-blue-800',
          icon: (
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        }
      default:
        return {
          container: 'bg-gray-50 border-gray-200',
          text: 'text-gray-700',
          titleText: 'text-gray-800',
          icon: null
        }
    }
  }

  const styles = getTypeStyles()

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={`
        ${styles.container}
        border rounded-lg p-4 mb-4 transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-2'}
        ${className}
      `}
    >
      <div className="flex items-start space-x-3">
        {styles.icon && (
          <div className="flex-shrink-0 mt-0.5">
            {styles.icon}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={`${styles.titleText} font-semibold text-sm mb-1`}>
              {title}
            </h4>
          )}
          <p className={`${styles.text} text-sm`}>
            {message}
          </p>
        </div>

        {onClose && (
          <button
            onClick={handleClose}
            className={`${styles.text} hover:opacity-75 transition-opacity flex-shrink-0`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// Maritime-themed notification variants
export function SuccessNotification(props: Omit<NotificationProps, 'type'>) {
  return <Notification {...props} type="success" />
}

export function ErrorNotification(props: Omit<NotificationProps, 'type'>) {
  return <Notification {...props} type="error" />
}

export function WarningNotification(props: Omit<NotificationProps, 'type'>) {
  return <Notification {...props} type="warning" />
}

export function InfoNotification(props: Omit<NotificationProps, 'type'>) {
  return <Notification {...props} type="info" />
}
