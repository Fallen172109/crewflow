import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    const maintenancePassword = process.env.MAINTENANCE_PASSWORD

    // Enhanced debugging for production issues
    console.log('🔐 Maintenance password check:', {
      passwordProvided: !!password,
      passwordLength: password ? password.length : 0,
      envPasswordSet: !!maintenancePassword,
      envPasswordLength: maintenancePassword ? maintenancePassword.length : 0,
      timestamp: new Date().toISOString()
    })

    if (!maintenancePassword) {
      console.error('❌ MAINTENANCE_PASSWORD environment variable not set')
      return NextResponse.json(
        { error: 'Maintenance password not configured' },
        { status: 500 }
      )
    }

    // Trim whitespace from both passwords to handle any formatting issues
    const trimmedPassword = password?.trim()
    const trimmedEnvPassword = maintenancePassword.trim()

    if (trimmedPassword === trimmedEnvPassword) {
      console.log('✅ Maintenance password accepted')
      return NextResponse.json({ success: true })
    } else {
      console.log('❌ Maintenance password rejected:', {
        inputPreview: trimmedPassword ? trimmedPassword.substring(0, 4) + '***' : '[EMPTY]',
        expectedPreview: trimmedEnvPassword ? trimmedEnvPassword.substring(0, 4) + '***' : '[EMPTY]'
      })
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('❌ Maintenance access error:', error)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
