#!/usr/bin/env node

/**
 * Test script for the new unified image generation system in CrewFlow
 * Tests both general image generation and project-aware capabilities
 */

const BASE_URL = 'http://localhost:3001'

async function testUnifiedImageGeneration() {
  console.log('🧪 Testing CrewFlow Unified Image Generation System...\n')
  
  // Test 1: General Image Generation (Coral Agent - Unified)
  console.log('📋 Test 1: General Image Generation (Unified)')
  try {
    const response = await fetch(`${BASE_URL}/api/agents/coral`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'unified_image_generator',
        params: {
          prompt: 'A cute cat working out at the gym, lifting weights',
          style: 'Digital Art',
          aspect_ratio: 'Square (1:1)',
          quality: 'standard'
        },
        message: 'Create a general image for personal use'
      })
    })

    const data = await response.json()
    console.log('✅ General Image Generation Result:', {
      success: data.success,
      hasImage: data.response?.includes('!['),
      tokensUsed: data.usage?.tokensUsed,
      latency: data.usage?.latency
    })
  } catch (error) {
    console.error('❌ General Image Generation Failed:', error.message)
  }

  console.log('\n' + '='.repeat(50) + '\n')

  // Test 2: Project-Aware Social Media Image (Splash Agent)
  console.log('📋 Test 2: Project-Aware Social Media Image')
  try {
    const response = await fetch(`${BASE_URL}/api/agents/splash`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'branded_social_visuals',
        params: {
          prompt: 'Professional fitness motivation post',
          style: 'Digital Art',
          aspect_ratio: 'Square (1:1)',
          brand_name: 'FitLife Pro',
          platform: 'Instagram',
          campaign_context: 'New Year fitness motivation campaign targeting young professionals'
        },
        message: 'Create branded social media visual'
      })
    })

    const data = await response.json()
    console.log('✅ Branded Social Media Image Result:', {
      success: data.success,
      hasImage: data.response?.includes('!['),
      tokensUsed: data.usage?.tokensUsed,
      latency: data.usage?.latency
    })
  } catch (error) {
    console.error('❌ Branded Social Media Image Failed:', error.message)
  }

  console.log('\n' + '='.repeat(50) + '\n')

  // Test 3: SEO-Optimized Content Image (Pearl Agent)
  console.log('📋 Test 3: SEO-Optimized Content Image')
  try {
    const response = await fetch(`${BASE_URL}/api/agents/pearl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'seo_visual_content',
        params: {
          prompt: 'Professional home office setup for productivity',
          style: 'Photorealistic',
          aspect_ratio: 'Landscape (4:3)',
          target_keywords: 'home office productivity workspace',
          content_topic: 'Remote Work Productivity',
          target_audience: 'Remote workers and entrepreneurs'
        },
        message: 'Create SEO-optimized content image'
      })
    })

    const data = await response.json()
    console.log('✅ SEO-Optimized Image Result:', {
      success: data.success,
      hasImage: data.response?.includes('!['),
      tokensUsed: data.usage?.tokensUsed,
      latency: data.usage?.latency
    })
  } catch (error) {
    console.error('❌ SEO-Optimized Image Failed:', error.message)
  }

  console.log('\n' + '='.repeat(50) + '\n')
  console.log('🎯 Test Summary:')
  console.log('- General Image Generation: Unified tool on Crew Abilities page')
  console.log('- Branded Social Media: Project-aware with business context')
  console.log('- SEO Content Images: Optimized with metadata and suggestions')
  console.log('\n✨ CrewFlow Image Generation Restructure Complete!')
}

// Run the test
testUnifiedImageGeneration().catch(console.error)
