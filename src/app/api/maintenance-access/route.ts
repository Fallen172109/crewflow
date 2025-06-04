import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    const maintenancePassword = process.env.MAINTENANCE_PASSWORD
    
    if (!maintenancePassword) {
      return NextResponse.json(
        { error: 'Maintenance password not configured' },
        { status: 500 }
      )
    }
    
    if (password === maintenancePassword) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
