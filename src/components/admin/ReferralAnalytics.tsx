'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, TrendingUp, Users, ArrowRight, BarChart3 } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { cn } from '@/lib/utils'

interface ReferralAnalytics {
  totalReferrals: number
  topSourceAgents: Array<{ agentId: string; count: number }>
  topTargetAgents: Array<{ agentId: string; count: number }>
  domainDistribution: Array<{ domain: string; count: number }>
  averageConfidence: number
  referralsByTimeframe: Array<{ date: string; count: number }>
}

interface ReferralEffectiveness {
  totalReferrals: number
  successfulReferrals: number
  averageConfidence: number
  topPerformingPairs: Array<{ source: string; target: string; count: number }>
}

const AGENT_NAMES: Record<string, string> = {
  coral: 'Coral (Customer Support)',
  splash: 'Splash (Social Media)',
  anchor: 'Anchor (Supply Chain)',
  sage: 'Sage (Knowledge)',
  helm: 'Helm (Content)',
  ledger: 'Ledger (Finance)',
  patch: 'Patch (IT Support)',
  pearl: 'Pearl (Research)',
  flint: 'Flint (Marketing)',
  beacon: 'Beacon (Project Mgmt)',
  drake: 'Drake (E-commerce)'
}

export default function ReferralAnalytics() {
  const [analytics, setAnalytics] = useState<ReferralAnalytics | null>(null)
  const [effectiveness, setEffectiveness] = useState<ReferralEffectiveness | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  })

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const startDate = format(dateRange.from, 'yyyy-MM-dd')
      const endDate = format(dateRange.to, 'yyyy-MM-dd')

      const [analyticsRes, effectivenessRes] = await Promise.all([
        fetch(`/api/admin/referral-analytics?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/admin/referral-effectiveness?startDate=${startDate}&endDate=${endDate}`)
      ])

      if (analyticsRes.ok && effectivenessRes.ok) {
        const analyticsData = await analyticsRes.json()
        const effectivenessData = await effectivenessRes.json()
        setAnalytics(analyticsData)
        setEffectiveness(effectivenessData)
      }
    } catch (error) {
      console.error('Error fetching referral analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatAgentName = (agentId: string) => AGENT_NAMES[agentId] || agentId

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Agent Referral Analytics</h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={dateRange}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to })
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalReferrals || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {effectiveness?.totalReferrals ? 
                Math.round((effectiveness.successfulReferrals / effectiveness.totalReferrals) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              High confidence referrals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((analytics?.averageConfidence || 0) * 100)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set([
                ...(analytics?.topSourceAgents.map(a => a.agentId) || []),
                ...(analytics?.topTargetAgents.map(a => a.agentId) || [])
              ]).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Source and Target Agents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Referring Agents</CardTitle>
            <CardDescription>Agents that make the most referrals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.topSourceAgents.slice(0, 5).map((agent, index) => (
                <div key={agent.agentId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                      {index + 1}
                    </Badge>
                    <span className="text-sm font-medium">{formatAgentName(agent.agentId)}</span>
                  </div>
                  <Badge variant="secondary">{agent.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Referred-To Agents</CardTitle>
            <CardDescription>Agents that receive the most referrals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.topTargetAgents.slice(0, 5).map((agent, index) => (
                <div key={agent.agentId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                      {index + 1}
                    </Badge>
                    <span className="text-sm font-medium">{formatAgentName(agent.agentId)}</span>
                  </div>
                  <Badge variant="secondary">{agent.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Domain Distribution and Top Performing Pairs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Domain Distribution</CardTitle>
            <CardDescription>Most common referral domains</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.domainDistribution.slice(0, 6).map((domain, index) => (
                <div key={domain.domain} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{domain.domain}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ 
                          width: `${(domain.count / (analytics?.totalReferrals || 1)) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <Badge variant="outline">{domain.count}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Referral Pairs</CardTitle>
            <CardDescription>Most common agent-to-agent referrals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {effectiveness?.topPerformingPairs.slice(0, 5).map((pair, index) => (
                <div key={`${pair.source}-${pair.target}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                      {index + 1}
                    </Badge>
                    <span className="font-medium">{formatAgentName(pair.source)}</span>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <span className="font-medium">{formatAgentName(pair.target)}</span>
                  </div>
                  <Badge variant="secondary">{pair.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
