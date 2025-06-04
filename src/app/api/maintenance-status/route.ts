import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const maintenanceMode = process.env.MAINTENANCE_MODE === 'true'
    
    return NextResponse.json({ 
      maintenanceMode 
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check maintenance status' },
      { status: 500 }
    )
  }
}
