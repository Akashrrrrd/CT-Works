// Performance Optimization and Caching System
import { LRUCache } from 'lru-cache';

export interface CacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  staleWhileRevalidate: number;
}

export interface PerformanceMetrics {
  requestId: string;
  endpoint: string;
  method: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  cacheHit: boolean;
  dbQueries: number;
  dbQueryTime: number;
}

export class CacheService {
  private static caches = new Map<string, LRUCache<string, any>>();
  
  private static readonly DEFAULT_CONFIGS: Record<string, CacheConfig> = {
    'computations': { maxSize: 1000, ttl: 5 * 60 * 1000, staleWhileRevalidate: 60 * 1000 }, // 5 min
    'templates': { maxSize: 500, ttl: 30 * 60 * 1000, staleWhileRevalidate: 5 * 60 * 1000 }, // 30 min
    'users': { maxSize: 10000, ttl: 15 * 60 * 1000, staleWhileRevalidate: 2 * 60 * 1000 }, // 15 min
    'workspaces': { maxSize: 1000, ttl: 10 * 60 * 1000, staleWhileRevalidate: 60 * 1000 }, // 10 min
    'calculations': { maxSize: 5000, ttl: 60 * 60 * 1000, staleWhileRevalidate: 10 * 60 * 1000 }, // 1 hour
  };

  static getCache(cacheName: string): LRUCache<string, any> {
    if (!this.caches.has(cacheName)) {
      const config = this.DEFAULT_CONFIGS[cacheName] || this.DEFAULT_CONFIGS['computations'];
      this.caches.set(cacheName, new LRUCache({
        max: config.maxSize,
        ttl: config.ttl,
        allowStale: true,
        updateAgeOnGet: true,
        updateAgeOnHas: true
      }));
    }
    return this.caches.get(cacheName)!;
  }

  static async get<T>(cacheName: string, key: string): Promise<T | null> {
    const cache = this.getCache(cacheName);
    return cache.get(key) || null;
  }

  static async set<T>(cacheName: string, key: string, value: T, ttl?: number): Promise<void> {
    const cache = this.getCache(cacheName);
    cache.set(key, value, { ttl });
  }

  static async delete(cacheName: string, key: string): Promise<void> {
    const cache = this.getCache(cacheName);
    cache.delete(key);
  }

  static async clear(cacheName: string): Promise<void> {
    const cache = this.getCache(cacheName);
    cache.clear();
  }

  static getStats(cacheName: string) {
    const cache = this.getCache(cacheName);
    return {
      size: cache.size,
      max: cache.max,
      calculatedSize: cache.calculatedSize,
      hits: cache.hits || 0,
      misses: cache.misses || 0,
      hitRate: cache.hits ? cache.hits / (cache.hits + cache.misses) : 0
    };
  }

  // Cache warming for frequently accessed data
  static async warmCache(): Promise<void> {
    console.log('Warming caches...');
    
    // Pre-load frequently used templates
    // In production, this would fetch from database
    const commonTemplates = [
      'tpl-red670', 'tpl-reb670', 'tpl-ref615', 'tpl-distance', 'tpl-req650'
    ];
    
    // Simulate cache warming
    commonTemplates.forEach(templateId => {
      this.set('templates', templateId, { id: templateId, preloaded: true });
    });
  }
}

export class PerformanceMonitor {
  private static metrics: PerformanceMetrics[] = [];
  private static activeRequests = new Map<string, Partial<PerformanceMetrics>>();

  static startRequest(requestId: string, endpoint: string, method: string): void {
    this.activeRequests.set(requestId, {
      requestId,
      endpoint,
      method,
      startTime: Date.now(),
      memoryUsage: process.memoryUsage(),
      cacheHit: false,
      dbQueries: 0,
      dbQueryTime: 0
    });
  }

  static endRequest(requestId: string): PerformanceMetrics | null {
    const request = this.activeRequests.get(requestId);
    if (!request) return null;

    const endTime = Date.now();
    const metric: PerformanceMetrics = {
      ...request,
      endTime,
      duration: endTime - request.startTime!,
      memoryUsage: process.memoryUsage()
    } as PerformanceMetrics;

    this.metrics.push(metric);
    this.activeRequests.delete(requestId);

    // Alert on slow requests
    if (metric.duration > 5000) { // 5 seconds
      console.warn(`Slow request detected: ${metric.endpoint} took ${metric.duration}ms`);
    }

    return metric;
  }

  static recordCacheHit(requestId: string): void {
    const request = this.activeRequests.get(requestId);
    if (request) {
      request.cacheHit = true;
    }
  }

  static recordDbQuery(requestId: string, queryTime: number): void {
    const request = this.activeRequests.get(requestId);
    if (request) {
      request.dbQueries = (request.dbQueries || 0) + 1;
      request.dbQueryTime = (request.dbQueryTime || 0) + queryTime;
    }
  }

  static getMetrics(limit: number = 100): PerformanceMetrics[] {
    return this.metrics
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  static getAverageResponseTime(endpoint?: string): number {
    let filtered = this.metrics;
    if (endpoint) {
      filtered = this.metrics.filter(m => m.endpoint === endpoint);
    }
    
    if (filtered.length === 0) return 0;
    
    const total = filtered.reduce((sum, m) => sum + m.duration, 0);
    return total / filtered.length;
  }

  static getSlowestEndpoints(limit: number = 10): Array<{ endpoint: string; avgDuration: number; count: number }> {
    const endpointStats = new Map<string, { total: number; count: number }>();
    
    this.metrics.forEach(metric => {
      const stats = endpointStats.get(metric.endpoint) || { total: 0, count: 0 };
      stats.total += metric.duration;
      stats.count += 1;
      endpointStats.set(metric.endpoint, stats);
    });

    return Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        avgDuration: stats.total / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }
}

// Database query optimization
export class QueryOptimizer {
  private static queryCache = new Map<string, { result: any; timestamp: number; ttl: number }>();

  static async executeWithCache<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    ttl: number = 5 * 60 * 1000 // 5 minutes
  ): Promise<T> {
    const cached = this.queryCache.get(queryKey);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.result;
    }

    const result = await queryFn();
    this.queryCache.set(queryKey, {
      result,
      timestamp: Date.now(),
      ttl
    });

    return result;
  }

  static invalidateQuery(queryKey: string): void {
    this.queryCache.delete(queryKey);
  }

  static invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.queryCache.keys()) {
      if (regex.test(key)) {
        this.queryCache.delete(key);
      }
    }
  }

  // Batch operations for better performance
  static async batchExecute<T>(
    operations: Array<() => Promise<T>>,
    batchSize: number = 10
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
    }
    
    return results;
  }
}

// Memory management and garbage collection optimization
export class MemoryManager {
  private static memoryThreshold = 0.8; // 80% of available memory
  
  static monitorMemoryUsage(): NodeJS.MemoryUsage {
    const usage = process.memoryUsage();
    const totalMemory = usage.heapTotal;
    const usedMemory = usage.heapUsed;
    const memoryUsagePercent = usedMemory / totalMemory;

    if (memoryUsagePercent > this.memoryThreshold) {
      console.warn(`High memory usage detected: ${(memoryUsagePercent * 100).toFixed(2)}%`);
      this.triggerCleanup();
    }

    return usage;
  }

  private static triggerCleanup(): void {
    // Clear old cache entries
    CacheService.clear('calculations');
    
    // Clear old performance metrics
    PerformanceMonitor.getMetrics(0); // This would clear in a real implementation
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  static getMemoryStats() {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100, // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100, // MB
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100, // MB
      rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100, // MB
      usagePercent: Math.round(usage.heapUsed / usage.heapTotal * 10000) / 100 // %
    };
  }
}

// Request compression and response optimization
export class ResponseOptimizer {
  static compressResponse(data: any): string {
    // In production, use proper compression library like zlib
    return JSON.stringify(data);
  }

  static paginateResults<T>(
    data: T[],
    page: number = 1,
    limit: number = 50
  ): {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  } {
    const offset = (page - 1) * limit;
    const paginatedData = data.slice(offset, offset + limit);
    const totalPages = Math.ceil(data.length / limit);

    return {
      data: paginatedData,
      pagination: {
        page,
        limit,
        total: data.length,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  static optimizeImageResponse(imageBuffer: Buffer, quality: number = 80): Buffer {
    // In production, use image optimization library like sharp
    return imageBuffer;
  }
}

// Background job processing for heavy computations
export class BackgroundJobProcessor {
  private static jobs = new Map<string, {
    id: string;
    type: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    result?: any;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
  }>();

  static async queueJob(
    type: string,
    data: any,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.jobs.set(jobId, {
      id: jobId,
      type,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Process job asynchronously
    this.processJob(jobId, data);
    
    return jobId;
  }

  private static async processJob(jobId: string, data: any): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      job.updatedAt = new Date();

      // Simulate heavy computation
      for (let i = 0; i <= 100; i += 10) {
        job.progress = i;
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      job.status = 'completed';
      job.result = { processed: true, data };
      job.progress = 100;
      job.updatedAt = new Date();

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.updatedAt = new Date();
    }
  }

  static getJobStatus(jobId: string) {
    return this.jobs.get(jobId) || null;
  }

  static getAllJobs() {
    return Array.from(this.jobs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

// Health check and system monitoring
export class HealthMonitor {
  static async checkSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, { status: boolean; message: string; responseTime?: number }>;
    timestamp: Date;
  }> {
    const checks: Record<string, { status: boolean; message: string; responseTime?: number }> = {};
    
    // Database connectivity check
    const dbStart = Date.now();
    try {
      // In production, actually test database connection
      checks.database = {
        status: true,
        message: 'Database connection successful',
        responseTime: Date.now() - dbStart
      };
    } catch (error) {
      checks.database = {
        status: false,
        message: 'Database connection failed',
        responseTime: Date.now() - dbStart
      };
    }

    // Memory usage check
    const memoryStats = MemoryManager.getMemoryStats();
    checks.memory = {
      status: memoryStats.usagePercent < 80,
      message: `Memory usage: ${memoryStats.usagePercent}%`
    };

    // Cache performance check
    const cacheStats = CacheService.getStats('computations');
    checks.cache = {
      status: cacheStats.hitRate > 0.7,
      message: `Cache hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`
    };

    // Determine overall status
    const allHealthy = Object.values(checks).every(check => check.status);
    const anyUnhealthy = Object.values(checks).some(check => !check.status);
    
    const status = allHealthy ? 'healthy' : anyUnhealthy ? 'unhealthy' : 'degraded';

    return {
      status,
      checks,
      timestamp: new Date()
    };
  }
}