import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Test authentication without redirect
    const { getUser } = await import('@/lib/auth')
    const user = await getUser()
    
    if (!user) {
      return NextResponse.json({ 
        authenticated: false, 
        message: 'No user found' 
      }, { status: 401 })
    }
    
    return NextResponse.json({ 
      authenticated: true, 
      user: {
        id: user.id,
        email: user.email
      }
    })
    
  } catch (error) {
    console.error('Auth test error:', error)
    return NextResponse.json({ 
      authenticated: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Authentication test failed'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Test authentication without redirect
    const { getUser } = await import('@/lib/auth')
    const user = await getUser()
    
    if (!user) {
      return NextResponse.json({ 
        authenticated: false, 
        message: 'No user found',
        requestBody: body
      }, { status: 401 })
    }
    
    return NextResponse.json({ 
      authenticated: true, 
      user: {
        id: user.id,
        email: user.email
      },
      requestBody: body,
      message: 'Authentication successful'
    })
    
  } catch (error) {
    console.error('Auth test error:', error)
    return NextResponse.json({ 
      authenticated: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Authentication test failed'
    }, { status: 500 })
  }
}
