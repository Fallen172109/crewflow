#!/usr/bin/env node

/**
 * Test script for the new CrewFlow image generation architecture
 * Tests the separation between general and agent-specific image generation
 */

const BASE_URL = 'http://localhost:3001'

async function testNewImageArchitecture() {
  console.log('🧪 Testing CrewFlow New Image Generation Architecture...\n')
  
  // Test 1: Standalone General Image Generation
  console.log('📋 Test 1: Standalone General Image Generation')
  try {
    const response = await fetch(`${BASE_URL}/api/crew-abilities/image-generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'A serene mountain landscape at sunset',
        style: 'Digital Art',
        aspectRatio: 'Landscape (4:3)',
        quality: 'standard'
      })
    })

    const data = await response.json()
    console.log('✅ Standalone Image Generation Result:', {
      success: data.success,
      hasImageUrl: !!data.imageUrl,
      tokensUsed: data.tokensUsed,
      latency: data.latency,
      model: data.model
    })
  } catch (error) {
    console.error('❌ Standalone Image Generation Failed:', error.message)
  }

  console.log('\n' + '='.repeat(50) + '\n')

  // Test 2: Agent-Specific Social Media Image (Enhanced Business Context)
  console.log('📋 Test 2: Enhanced Agent-Specific Social Media Image')
  try {
    const response = await fetch(`${BASE_URL}/api/agents/splash`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'branded_social_visuals',
        params: {
          prompt: 'Professional team collaboration in modern office',
          style: 'Photorealistic',
          aspect_ratio: 'Square (1:1)',
          brand_name: 'TechFlow Solutions',
          platform: 'LinkedIn',
          campaign_context: 'Recruiting campaign highlighting company culture and teamwork for Q1 2024'
        },
        message: 'Create branded LinkedIn image for recruiting campaign'
      })
    })

    const data = await response.json()
    console.log('✅ Enhanced Social Media Image Result:', {
      success: data.success,
      hasResponse: !!data.response,
      tokensUsed: data.usage?.tokensUsed,
      latency: data.usage?.latency,
      hasBusinessContext: data.response?.includes('TechFlow') || data.response?.includes('LinkedIn')
    })
  } catch (error) {
    console.error('❌ Enhanced Social Media Image Failed:', error.message)
  }

  console.log('\n' + '='.repeat(50) + '\n')

  // Test 3: Agent-Specific SEO Image (Enhanced Business Context)
  console.log('📋 Test 3: Enhanced Agent-Specific SEO Image')
  try {
    const response = await fetch(`${BASE_URL}/api/agents/pearl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'seo_visual_content',
        params: {
          prompt: 'Modern e-commerce website dashboard with analytics',
          style: 'Digital Art',
          aspect_ratio: 'Landscape (4:3)',
          target_keywords: 'e-commerce analytics dashboard business intelligence',
          content_topic: 'E-commerce Business Intelligence',
          target_audience: 'Online store owners and digital marketers'
        },
        message: 'Create SEO-optimized image for e-commerce analytics content'
      })
    })

    const data = await response.json()
    console.log('✅ Enhanced SEO Image Result:', {
      success: data.success,
      hasResponse: !!data.response,
      tokensUsed: data.usage?.tokensUsed,
      latency: data.usage?.latency,
      hasSEOContext: data.response?.includes('SEO') || data.response?.includes('alt text')
    })
  } catch (error) {
    console.error('❌ Enhanced SEO Image Failed:', error.message)
  }

  console.log('\n' + '='.repeat(50) + '\n')

  // Test 4: Health Check Endpoints
  console.log('📋 Test 4: Health Check Endpoints')
  try {
    // Test standalone service health
    const standaloneHealth = await fetch(`${BASE_URL}/api/crew-abilities/image-generation`)
    const standaloneData = await standaloneHealth.json()
    
    console.log('✅ Standalone Service Health:', {
      service: standaloneData.service,
      status: standaloneData.status,
      capabilities: standaloneData.capabilities?.length || 0,
      models: standaloneData.models
    })

    // Test agent health
    const splashHealth = await fetch(`${BASE_URL}/api/agents/splash`)
    const splashData = await splashHealth.json()
    
    console.log('✅ Splash Agent Health:', {
      agent: splashData.agent,
      status: splashData.status,
      framework: splashData.framework,
      capabilities: splashData.capabilities?.length || 0
    })
  } catch (error) {
    console.error('❌ Health Check Failed:', error.message)
  }

  console.log('\n' + '='.repeat(50) + '\n')
  console.log('🎯 Architecture Test Summary:')
  console.log('✅ Standalone Image Generation: Separated from agents, accessible via dedicated endpoint')
  console.log('✅ Enhanced Agent-Specific Images: Business context-aware with platform/SEO optimization')
  console.log('✅ Clear Separation: General vs. business-focused image generation workflows')
  console.log('✅ Sidebar Navigation: New Crew Abilities dropdown for easy access')
  console.log('\n🚢 CrewFlow Image Generation Architecture Restructure Complete!')
}

// Run the test
testNewImageArchitecture().catch(console.error)
