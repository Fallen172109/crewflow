import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    const planId = searchParams.get('planId')
    const format = searchParams.get('format') || 'csv' // csv, json, or html
    
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Fetch the meal plan
    const { data: mealPlan, error } = await supabase
      .from('user_meal_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', user.id)
      .single()

    if (error || !mealPlan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }

    // Generate filename
    const planName = mealPlan.plan_name.replace(/[^a-zA-Z0-9]/g, '_')
    const date = new Date().toISOString().split('T')[0]
    
    switch (format) {
      case 'csv':
        return exportAsCSV(mealPlan, `${planName}_${date}.csv`)
      case 'json':
        return exportAsJSON(mealPlan, `${planName}_${date}.json`)
      case 'html':
        return exportAsHTML(mealPlan, `${planName}_${date}.html`)
      default:
        return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export meal plan' },
      { status: 500 }
    )
  }
}

function exportAsCSV(mealPlan: any, filename: string): NextResponse {
  const planData = mealPlan.plan_data
  const csvRows: string[] = []

  // Header
  csvRows.push('Meal Plan Export')
  csvRows.push(`Plan Name,${mealPlan.plan_name}`)
  csvRows.push(`Duration,${mealPlan.plan_duration_days} days`)
  csvRows.push(`Created,${new Date(mealPlan.created_at).toLocaleDateString()}`)
  csvRows.push('')

  // Overview
  if (planData.overview) {
    csvRows.push('Overview')
    csvRows.push(`"${planData.overview}"`)
    csvRows.push('')
  }

  // Daily Plans
  csvRows.push('Daily Meal Plans')
  csvRows.push('Day,Meal Type,Meal Name,Description,Prep Time,Cook Time,Servings,Calories,Protein,Carbs,Fat,Fiber')
  
  if (planData.dailyPlans) {
    planData.dailyPlans.forEach((day: any) => {
      const dayName = day.day || 'Unknown Day'
      
      // Process each meal type
      Object.entries(day.meals || {}).forEach(([mealType, meal]: [string, any]) => {
        if (meal && typeof meal === 'object') {
          csvRows.push([
            dayName,
            mealType.charAt(0).toUpperCase() + mealType.slice(1),
            meal.name || '',
            `"${meal.description || ''}"`,
            meal.prepTime || '',
            meal.cookTime || '',
            meal.servings || '',
            meal.nutrition?.calories || '',
            meal.nutrition?.protein || '',
            meal.nutrition?.carbs || '',
            meal.nutrition?.fat || '',
            meal.nutrition?.fiber || ''
          ].join(','))
        }
      })
    })
  }

  csvRows.push('')

  // Shopping List
  if (planData.shoppingList) {
    csvRows.push('Shopping List')
    csvRows.push('Category,Items')
    
    Object.entries(planData.shoppingList.categories || {}).forEach(([category, items]: [string, any]) => {
      if (Array.isArray(items)) {
        csvRows.push(`${category},"${items.join('; ')}"`)
      }
    })
    
    if (planData.shoppingList.estimatedCost) {
      csvRows.push('')
      csvRows.push(`Estimated Cost,${planData.shoppingList.estimatedCost}`)
    }
  }

  csvRows.push('')

  // Nutritional Summary
  if (planData.nutritionalSummary) {
    csvRows.push('Nutritional Summary')
    const summary = planData.nutritionalSummary
    
    if (summary.dailyAverages) {
      csvRows.push('Daily Averages')
      csvRows.push(`Calories,${summary.dailyAverages.calories || ''}`)
      csvRows.push(`Protein,${summary.dailyAverages.protein || ''}`)
      csvRows.push(`Carbs,${summary.dailyAverages.carbs || ''}`)
      csvRows.push(`Fat,${summary.dailyAverages.fat || ''}`)
      csvRows.push(`Fiber,${summary.dailyAverages.fiber || ''}`)
    }
    
    if (summary.healthInsights && Array.isArray(summary.healthInsights)) {
      csvRows.push('')
      csvRows.push('Health Insights')
      summary.healthInsights.forEach((insight: string) => {
        csvRows.push(`"${insight}"`)
      })
    }
  }

  // Cooking Tips
  if (planData.cookingTips && Array.isArray(planData.cookingTips)) {
    csvRows.push('')
    csvRows.push('Cooking Tips')
    planData.cookingTips.forEach((tip: string) => {
      csvRows.push(`"${tip}"`)
    })
  }

  const csvContent = csvRows.join('\n')

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache'
    }
  })
}

function exportAsJSON(mealPlan: any, filename: string): NextResponse {
  const exportData = {
    plan_info: {
      name: mealPlan.plan_name,
      duration_days: mealPlan.plan_duration_days,
      created_at: mealPlan.created_at,
      generated_for_date: mealPlan.generated_for_date
    },
    plan_data: mealPlan.plan_data,
    preferences_snapshot: mealPlan.preferences_snapshot
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache'
    }
  })
}

function exportAsHTML(mealPlan: any, filename: string): NextResponse {
  const planData = mealPlan.plan_data
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${mealPlan.plan_name}</title>
    <style>
        body { font-family: 'Source Sans Pro', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 3px solid #ea580c; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #ea580c; margin: 0; }
        .meta-info { background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #ea580c; border-bottom: 2px solid #fed7aa; padding-bottom: 5px; }
        .day-plan { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .meal { margin-bottom: 20px; padding: 15px; background: #f9fafb; border-radius: 6px; }
        .meal h4 { color: #374151; margin: 0 0 10px 0; }
        .nutrition { display: flex; gap: 15px; flex-wrap: wrap; margin-top: 10px; }
        .nutrition span { background: #ea580c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.9em; }
        .shopping-list { columns: 2; column-gap: 30px; }
        .shopping-category { break-inside: avoid; margin-bottom: 20px; }
        .shopping-category h4 { color: #ea580c; margin-bottom: 10px; }
        .shopping-category ul { margin: 0; padding-left: 20px; }
        .tips { background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; }
        @media print { body { margin: 0; } .header { page-break-after: avoid; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>${mealPlan.plan_name}</h1>
        <p>Generated by CrewFlow Meal Planning Assistant</p>
    </div>
    
    <div class="meta-info">
        <strong>Duration:</strong> ${mealPlan.plan_duration_days} days<br>
        <strong>Created:</strong> ${new Date(mealPlan.created_at).toLocaleDateString()}<br>
        <strong>Generated for:</strong> ${new Date(mealPlan.generated_for_date).toLocaleDateString()}
    </div>

    ${planData.overview ? `
    <div class="section">
        <h2>Overview</h2>
        <p>${planData.overview}</p>
    </div>
    ` : ''}

    ${planData.dailyPlans ? `
    <div class="section">
        <h2>Daily Meal Plans</h2>
        ${planData.dailyPlans.map((day: any) => `
            <div class="day-plan">
                <h3>${day.day}</h3>
                ${Object.entries(day.meals || {}).map(([mealType, meal]: [string, any]) => 
                    meal && typeof meal === 'object' ? `
                    <div class="meal">
                        <h4>${mealType.charAt(0).toUpperCase() + mealType.slice(1)}: ${meal.name}</h4>
                        <p>${meal.description || ''}</p>
                        <p><strong>Prep:</strong> ${meal.prepTime || 'N/A'} | <strong>Cook:</strong> ${meal.cookTime || 'N/A'} | <strong>Servings:</strong> ${meal.servings || 'N/A'}</p>
                        ${meal.nutrition ? `
                        <div class="nutrition">
                            <span>Calories: ${meal.nutrition.calories || 'N/A'}</span>
                            <span>Protein: ${meal.nutrition.protein || 'N/A'}</span>
                            <span>Carbs: ${meal.nutrition.carbs || 'N/A'}</span>
                            <span>Fat: ${meal.nutrition.fat || 'N/A'}</span>
                        </div>
                        ` : ''}
                        ${meal.ingredients && meal.ingredients.length > 0 ? `
                        <p><strong>Ingredients:</strong> ${meal.ingredients.join(', ')}</p>
                        ` : ''}
                    </div>
                    ` : ''
                ).join('')}
            </div>
        `).join('')}
    </div>
    ` : ''}

    ${planData.shoppingList ? `
    <div class="section">
        <h2>Shopping List</h2>
        <div class="shopping-list">
            ${Object.entries(planData.shoppingList.categories || {}).map(([category, items]: [string, any]) => `
                <div class="shopping-category">
                    <h4>${category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                    <ul>
                        ${Array.isArray(items) ? items.map((item: string) => `<li>${item}</li>`).join('') : ''}
                    </ul>
                </div>
            `).join('')}
        </div>
        ${planData.shoppingList.estimatedCost ? `<p><strong>Estimated Cost:</strong> ${planData.shoppingList.estimatedCost}</p>` : ''}
    </div>
    ` : ''}

    ${planData.cookingTips && planData.cookingTips.length > 0 ? `
    <div class="section">
        <h2>Cooking Tips</h2>
        <div class="tips">
            <ul>
                ${planData.cookingTips.map((tip: string) => `<li>${tip}</li>`).join('')}
            </ul>
        </div>
    </div>
    ` : ''}

    <div class="section">
        <p style="text-align: center; color: #6b7280; font-size: 0.9em; margin-top: 40px;">
            Generated by CrewFlow - Your Maritime AI Automation Platform
        </p>
    </div>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache'
    }
  })
}
