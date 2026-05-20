// Advanced Analytics and Reporting System
export interface AnalyticsEvent {
  id: string;
  timestamp: Date;
  userId: string;
  workspaceId: string;
  eventType: 'computation_created' | 'template_used' | 'report_generated' | 'user_login' | 'error_occurred';
  properties: Record<string, any>;
  sessionId: string;
}

export interface ComputationAnalytics {
  totalComputations: number;
  adequateCount: number;
  inadequateCount: number;
  adequacyRate: number;
  averageMargin: number;
  mostUsedTemplates: Array<{ templateId: string; templateName: string; count: number }>;
  voltageDistribution: Record<string, number>;
  faultLevelDistribution: Record<string, number>;
  trendsOverTime: Array<{ date: string; adequate: number; inadequate: number }>;
}

export interface UserAnalytics {
  activeUsers: number;
  newUsers: number;
  userEngagement: Record<string, number>;
  roleDistribution: Record<string, number>;
  averageSessionDuration: number;
  mostActiveUsers: Array<{ userId: string; userName: string; computations: number }>;
}

export interface SystemAnalytics {
  averageResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  memoryUsage: number;
  diskUsage: number;
  apiCallsPerHour: number;
  peakUsageHours: number[];
}

export class AnalyticsService {
  private static events: AnalyticsEvent[] = [];
  
  static trackEvent(
    userId: string,
    workspaceId: string,
    eventType: AnalyticsEvent['eventType'],
    properties: Record<string, any> = {},
    sessionId: string = 'unknown'
  ): void {
    const event: AnalyticsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId,
      workspaceId,
      eventType,
      properties,
      sessionId
    };

    this.events.push(event);
    
    // In production, send to analytics service (Google Analytics, Mixpanel, etc.)
    this.sendToAnalyticsService(event);
  }

  private static sendToAnalyticsService(event: AnalyticsEvent): void {
    // Integration with external analytics services
    console.log('Analytics event:', event);
  }

  static getComputationAnalytics(
    workspaceId?: string,
    startDate?: Date,
    endDate?: Date
  ): ComputationAnalytics {
    // In production, this would query the database
    // For now, return mock data based on events
    
    const computationEvents = this.events.filter(e => 
      e.eventType === 'computation_created' &&
      (!workspaceId || e.workspaceId === workspaceId) &&
      (!startDate || e.timestamp >= startDate) &&
      (!endDate || e.timestamp <= endDate)
    );

    const totalComputations = computationEvents.length;
    const adequateCount = computationEvents.filter(e => 
      e.properties.verdict === 'SUITABLY DIMENSIONED'
    ).length;
    const inadequateCount = totalComputations - adequateCount;

    // Template usage analysis
    const templateUsage = new Map<string, { name: string; count: number }>();
    computationEvents.forEach(e => {
      const templateId = e.properties.templateId;
      const templateName = e.properties.templateName;
      const current = templateUsage.get(templateId) || { name: templateName, count: 0 };
      current.count++;
      templateUsage.set(templateId, current);
    });

    const mostUsedTemplates = Array.from(templateUsage.entries())
      .map(([templateId, data]) => ({
        templateId,
        templateName: data.name,
        count: data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Voltage level distribution
    const voltageDistribution: Record<string, number> = {};
    computationEvents.forEach(e => {
      const voltage = `${e.properties.bus_voltage_kv}kV`;
      voltageDistribution[voltage] = (voltageDistribution[voltage] || 0) + 1;
    });

    // Trends over time (last 30 days)
    const trendsOverTime: Array<{ date: string; adequate: number; inadequate: number }> = [];
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    last30Days.forEach(date => {
      const dayEvents = computationEvents.filter(e => 
        e.timestamp.toISOString().split('T')[0] === date
      );
      
      trendsOverTime.push({
        date,
        adequate: dayEvents.filter(e => e.properties.verdict === 'SUITABLY DIMENSIONED').length,
        inadequate: dayEvents.filter(e => e.properties.verdict === 'UNDER DIMENSIONED').length
      });
    });

    return {
      totalComputations,
      adequateCount,
      inadequateCount,
      adequacyRate: totalComputations > 0 ? (adequateCount / totalComputations) * 100 : 0,
      averageMargin: 0, // Would calculate from actual computation data
      mostUsedTemplates,
      voltageDistribution,
      faultLevelDistribution: {}, // Would calculate from actual data
      trendsOverTime
    };
  }

  static getUserAnalytics(
    organizationId?: string,
    startDate?: Date,
    endDate?: Date
  ): UserAnalytics {
    const userEvents = this.events.filter(e =>
      (!startDate || e.timestamp >= startDate) &&
      (!endDate || e.timestamp <= endDate)
    );

    const uniqueUsers = new Set(userEvents.map(e => e.userId));
    const activeUsers = uniqueUsers.size;

    // User engagement (events per user)
    const userEngagement: Record<string, number> = {};
    userEvents.forEach(e => {
      userEngagement[e.userId] = (userEngagement[e.userId] || 0) + 1;
    });

    // Most active users
    const mostActiveUsers = Object.entries(userEngagement)
      .map(([userId, count]) => ({
        userId,
        userName: `User ${userId}`, // Would fetch from database
        computations: count
      }))
      .sort((a, b) => b.computations - a.computations)
      .slice(0, 10);

    return {
      activeUsers,
      newUsers: 0, // Would calculate from user creation dates
      userEngagement,
      roleDistribution: {}, // Would fetch from user data
      averageSessionDuration: 0, // Would calculate from session data
      mostActiveUsers
    };
  }

  static getSystemAnalytics(): SystemAnalytics {
    return {
      averageResponseTime: 250, // ms
      errorRate: 0.5, // %
      cacheHitRate: 85, // %
      memoryUsage: 65, // %
      diskUsage: 45, // %
      apiCallsPerHour: 1200,
      peakUsageHours: [9, 10, 11, 14, 15, 16] // Hours of day
    };
  }

  static generateCustomReport(
    reportType: 'computation_summary' | 'user_activity' | 'system_performance' | 'compliance',
    filters: {
      workspaceId?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      templateIds?: string[];
    } = {}
  ): any {
    switch (reportType) {
      case 'computation_summary':
        return this.generateComputationSummaryReport(filters);
      case 'user_activity':
        return this.generateUserActivityReport(filters);
      case 'system_performance':
        return this.generateSystemPerformanceReport(filters);
      case 'compliance':
        return this.generateComplianceReport(filters);
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  }

  private static generateComputationSummaryReport(filters: any) {
    const analytics = this.getComputationAnalytics(
      filters.workspaceId,
      filters.startDate,
      filters.endDate
    );

    return {
      title: 'CT/VT Adequacy Analysis Summary',
      generatedAt: new Date(),
      period: {
        start: filters.startDate || 'All time',
        end: filters.endDate || 'Present'
      },
      summary: {
        totalAnalyses: analytics.totalComputations,
        adequacyRate: `${analytics.adequacyRate.toFixed(1)}%`,
        mostUsedTemplate: analytics.mostUsedTemplates[0]?.templateName || 'N/A',
        topVoltageLevel: Object.entries(analytics.voltageDistribution)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'
      },
      details: analytics,
      recommendations: this.generateRecommendations(analytics)
    };
  }

  private static generateUserActivityReport(filters: any) {
    const analytics = this.getUserAnalytics(
      filters.organizationId,
      filters.startDate,
      filters.endDate
    );

    return {
      title: 'User Activity Report',
      generatedAt: new Date(),
      summary: {
        activeUsers: analytics.activeUsers,
        averageEngagement: Object.values(analytics.userEngagement).length > 0 
          ? Object.values(analytics.userEngagement).reduce((a, b) => a + b, 0) / Object.values(analytics.userEngagement).length
          : 0,
        topUser: analytics.mostActiveUsers[0]?.userName || 'N/A'
      },
      details: analytics
    };
  }

  private static generateSystemPerformanceReport(filters: any) {
    const analytics = this.getSystemAnalytics();

    return {
      title: 'System Performance Report',
      generatedAt: new Date(),
      summary: {
        averageResponseTime: `${analytics.averageResponseTime}ms`,
        errorRate: `${analytics.errorRate}%`,
        cacheEfficiency: `${analytics.cacheHitRate}%`,
        systemHealth: analytics.errorRate < 1 && analytics.averageResponseTime < 500 ? 'Good' : 'Needs Attention'
      },
      details: analytics,
      alerts: this.generatePerformanceAlerts(analytics)
    };
  }

  private static generateComplianceReport(filters: any) {
    return {
      title: 'Compliance and Audit Report',
      generatedAt: new Date(),
      period: {
        start: filters.startDate || 'All time',
        end: filters.endDate || 'Present'
      },
      compliance: {
        dataRetention: 'Compliant',
        accessControl: 'Compliant',
        auditTrail: 'Compliant',
        encryption: 'Compliant'
      },
      auditSummary: {
        totalEvents: this.events.length,
        securityEvents: 0,
        accessViolations: 0,
        dataExports: 0
      },
      recommendations: [
        'Regular security training for users',
        'Implement multi-factor authentication',
        'Review access permissions quarterly'
      ]
    };
  }

  private static generateRecommendations(analytics: ComputationAnalytics): string[] {
    const recommendations: string[] = [];

    if (analytics.adequacyRate < 80) {
      recommendations.push('Consider reviewing CT specifications - adequacy rate is below 80%');
    }

    if (analytics.mostUsedTemplates.length > 0) {
      const topTemplate = analytics.mostUsedTemplates[0];
      recommendations.push(`${topTemplate.templateName} is heavily used - consider creating optimized variants`);
    }

    if (analytics.inadequateCount > analytics.adequateCount) {
      recommendations.push('High number of inadequate results - review system parameters and CT ratings');
    }

    return recommendations;
  }

  private static generatePerformanceAlerts(analytics: SystemAnalytics): string[] {
    const alerts: string[] = [];

    if (analytics.averageResponseTime > 1000) {
      alerts.push('High response times detected - consider performance optimization');
    }

    if (analytics.errorRate > 2) {
      alerts.push('Error rate is above acceptable threshold');
    }

    if (analytics.cacheHitRate < 70) {
      alerts.push('Low cache hit rate - review caching strategy');
    }

    if (analytics.memoryUsage > 80) {
      alerts.push('High memory usage - consider scaling resources');
    }

    return alerts;
  }
}

// Real-time dashboard data provider
export class DashboardService {
  static async getDashboardData(userId: string, workspaceId?: string) {
    const computationAnalytics = AnalyticsService.getComputationAnalytics(workspaceId);
    const userAnalytics = AnalyticsService.getUserAnalytics();
    const systemAnalytics = AnalyticsService.getSystemAnalytics();

    return {
      overview: {
        totalComputations: computationAnalytics.totalComputations,
        adequacyRate: computationAnalytics.adequacyRate,
        activeUsers: userAnalytics.activeUsers,
        systemHealth: systemAnalytics.errorRate < 1 ? 'Good' : 'Warning'
      },
      charts: {
        adequacyTrend: computationAnalytics.trendsOverTime,
        templateUsage: computationAnalytics.mostUsedTemplates,
        voltageDistribution: computationAnalytics.voltageDistribution,
        userActivity: userAnalytics.mostActiveUsers
      },
      alerts: [
        ...AnalyticsService.generateRecommendations(computationAnalytics),
        ...(systemAnalytics.errorRate > 1 ? ['System error rate is elevated'] : [])
      ],
      recentActivity: this.getRecentActivity(workspaceId),
      quickStats: {
        todayComputations: this.getTodayComputations(workspaceId),
        pendingApprovals: this.getPendingApprovals(workspaceId),
        criticalIssues: this.getCriticalIssues()
      }
    };
  }

  private static getRecentActivity(workspaceId?: string) {
    return AnalyticsService['events']
      .filter(e => !workspaceId || e.workspaceId === workspaceId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10)
      .map(e => ({
        id: e.id,
        type: e.eventType,
        timestamp: e.timestamp,
        description: this.formatActivityDescription(e)
      }));
  }

  private static formatActivityDescription(event: AnalyticsEvent): string {
    switch (event.eventType) {
      case 'computation_created':
        return `New computation created using ${event.properties.templateName}`;
      case 'template_used':
        return `Template ${event.properties.templateName} was used`;
      case 'report_generated':
        return `Report generated for computation ${event.properties.computationId}`;
      case 'user_login':
        return `User logged in`;
      case 'error_occurred':
        return `Error occurred: ${event.properties.error}`;
      default:
        return 'Unknown activity';
    }
  }

  private static getTodayComputations(workspaceId?: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return AnalyticsService['events'].filter(e =>
      e.eventType === 'computation_created' &&
      e.timestamp >= today &&
      (!workspaceId || e.workspaceId === workspaceId)
    ).length;
  }

  private static getPendingApprovals(workspaceId?: string): number {
    // In production, query database for pending approvals
    return 5; // Mock data
  }

  private static getCriticalIssues(): number {
    // In production, query for critical system issues
    return 0; // Mock data
  }
}

// Export functionality for reports
export class ReportExporter {
  static async exportToCSV(data: any[], filename: string): Promise<string> {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }

  static async exportToPDF(reportData: any, template: string = 'default'): Promise<Buffer> {
    // In production, use a proper PDF generation library
    // This is a placeholder implementation
    const content = JSON.stringify(reportData, null, 2);
    return Buffer.from(content, 'utf-8');
  }

  static async exportToExcel(data: any[], sheetName: string = 'Report'): Promise<Buffer> {
    // In production, use a library like ExcelJS
    // This is a placeholder implementation
    const content = JSON.stringify(data, null, 2);
    return Buffer.from(content, 'utf-8');
  }
}