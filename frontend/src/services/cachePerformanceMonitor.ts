/**
 * Profile Picture Cache Performance Monitor
 *
 * Tracks and analyzes cache performance metrics:
 * - Cache hit/miss rates
 * - Load times per cache layer
 * - Bandwidth savings
 * - User engagement metrics
 */

interface CacheHit {
  userId: string;
  layer: "redux" | "localStorage" | "indexedDB" | "serviceWorker" | "network";
  timestamp: number;
  loadTime: number; // milliseconds
}

interface CacheMetrics {
  totalRequests: number;
  reduxHits: number;
  localStorageHits: number;
  indexedDBHits: number;
  serviceWorkerHits: number;
  networkHits: number;
  averageLoadTime: number;
  cacheHitRate: number;
  bandwidthSaved: number; // bytes
  timeSaved: number; // milliseconds
}

interface PerformanceReport {
  period: {
    start: Date;
    end: Date;
    durationHours: number;
  };
  metrics: CacheMetrics;
  breakdown: {
    redux: { hits: number; avgTime: number; percentage: number };
    localStorage: { hits: number; avgTime: number; percentage: number };
    indexedDB: { hits: number; avgTime: number; percentage: number };
    serviceWorker: { hits: number; avgTime: number; percentage: number };
    network: { hits: number; avgTime: number; percentage: number };
  };
  recommendations: string[];
}

class CachePerformanceMonitor {
  private hits: CacheHit[] = [];
  private startTime: number;
  private readonly STORAGE_KEY = "cache_performance_metrics";
  private readonly MAX_STORED_HITS = 1000;
  private readonly AVG_IMAGE_SIZE = 15 * 1024; // 15KB average profile picture
  private readonly AVG_NETWORK_TIME = 350; // 350ms average network fetch time

  constructor() {
    this.startTime = Date.now();
    this.loadFromStorage();
  }

  /**
   * Record a cache hit
   */
  recordHit(userId: string, layer: CacheHit["layer"], loadTime: number): void {
    const hit: CacheHit = {
      userId,
      layer,
      timestamp: Date.now(),
      loadTime,
    };

    this.hits.push(hit);

    // Limit stored hits
    if (this.hits.length > this.MAX_STORED_HITS) {
      this.hits = this.hits.slice(-this.MAX_STORED_HITS);
    }

    this.saveToStorage();

    // Log for debugging

  }

  /**
   * Get current metrics
   */
  getMetrics(): CacheMetrics {
    const totalRequests = this.hits.length;

    if (totalRequests === 0) {
      return {
        totalRequests: 0,
        reduxHits: 0,
        localStorageHits: 0,
        indexedDBHits: 0,
        serviceWorkerHits: 0,
        networkHits: 0,
        averageLoadTime: 0,
        cacheHitRate: 0,
        bandwidthSaved: 0,
        timeSaved: 0,
      };
    }

    const reduxHits = this.hits.filter((h) => h.layer === "redux").length;
    const localStorageHits = this.hits.filter((h) => h.layer === "localStorage").length;
    const indexedDBHits = this.hits.filter((h) => h.layer === "indexedDB").length;
    const serviceWorkerHits = this.hits.filter((h) => h.layer === "serviceWorker").length;
    const networkHits = this.hits.filter((h) => h.layer === "network").length;

    const cachedHits = reduxHits + localStorageHits + indexedDBHits + serviceWorkerHits;
    const cacheHitRate = (cachedHits / totalRequests) * 100;

    const totalLoadTime = this.hits.reduce((sum, hit) => sum + hit.loadTime, 0);
    const averageLoadTime = totalLoadTime / totalRequests;

    // Calculate bandwidth saved (cached hits don't download image)
    const bandwidthSaved = cachedHits * this.AVG_IMAGE_SIZE;

    // Calculate time saved (difference between network fetch and cache fetch)
    const timeSaved = this.hits
      .filter((h) => h.layer !== "network")
      .reduce((sum, hit) => sum + (this.AVG_NETWORK_TIME - hit.loadTime), 0);

    return {
      totalRequests,
      reduxHits,
      localStorageHits,
      indexedDBHits,
      serviceWorkerHits,
      networkHits,
      averageLoadTime: Math.round(averageLoadTime),
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      bandwidthSaved,
      timeSaved: Math.max(0, timeSaved),
    };
  }

  /**
   * Generate performance report
   */
  getReport(): PerformanceReport {
    const metrics = this.getMetrics();
    const now = new Date();
    const start = new Date(this.startTime);
    const durationMs = now.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    // Calculate breakdown
    const total = metrics.totalRequests || 1; // Avoid division by zero

    const breakdown = {
      redux: {
        hits: metrics.reduxHits,
        avgTime: this.getAverageTimeForLayer("redux"),
        percentage: Math.round((metrics.reduxHits / total) * 10000) / 100,
      },
      localStorage: {
        hits: metrics.localStorageHits,
        avgTime: this.getAverageTimeForLayer("localStorage"),
        percentage: Math.round((metrics.localStorageHits / total) * 10000) / 100,
      },
      indexedDB: {
        hits: metrics.indexedDBHits,
        avgTime: this.getAverageTimeForLayer("indexedDB"),
        percentage: Math.round((metrics.indexedDBHits / total) * 10000) / 100,
      },
      serviceWorker: {
        hits: metrics.serviceWorkerHits,
        avgTime: this.getAverageTimeForLayer("serviceWorker"),
        percentage: Math.round((metrics.serviceWorkerHits / total) * 10000) / 100,
      },
      network: {
        hits: metrics.networkHits,
        avgTime: this.getAverageTimeForLayer("network"),
        percentage: Math.round((metrics.networkHits / total) * 10000) / 100,
      },
    };

    // Generate recommendations
    const recommendations: string[] = [];

    if (metrics.cacheHitRate < 70) {
      recommendations.push(
        "Low cache hit rate - consider implementing prefetching for common user lists"
      );
    }

    if (metrics.networkHits > metrics.totalRequests * 0.3) {
      recommendations.push("High network usage - verify cache TTLs are appropriate");
    }

    if (breakdown.redux.percentage < 50 && metrics.totalRequests > 20) {
      recommendations.push("Low Redux cache usage - users may be refreshing pages frequently");
    }

    if (metrics.averageLoadTime > 50) {
      recommendations.push("Average load time could be improved - check for bottlenecks");
    }

    if (breakdown.indexedDB.percentage < 10 && metrics.totalRequests > 50) {
      recommendations.push("Low IndexedDB usage - blob caching may not be working optimally");
    }

    if (recommendations.length === 0) {
      recommendations.push("Performance is optimal! Cache system is working as expected.");
    }

    return {
      period: {
        start,
        end: now,
        durationHours: Math.round(durationHours * 100) / 100,
      },
      metrics,
      breakdown,
      recommendations,
    };
  }

  /**
   * Get average load time for a specific layer
   */
  private getAverageTimeForLayer(layer: CacheHit["layer"]): number {
    const layerHits = this.hits.filter((h) => h.layer === layer);
    if (layerHits.length === 0) return 0;

    const total = layerHits.reduce((sum, hit) => sum + hit.loadTime, 0);
    return Math.round(total / layerHits.length);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.hits = [];
    this.startTime = Date.now();
    this.saveToStorage();

  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    const report = this.getReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * Save metrics to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === "undefined") return;

    try {
      const data = {
        hits: this.hits,
        startTime: this.startTime,
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn("[Cache Monitor] Failed to save metrics:", error);
    }
  }

  /**
   * Load metrics from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.hits = data.hits || [];
        this.startTime = data.startTime || Date.now();

      }
    } catch (error) {
      console.warn("[Cache Monitor] Failed to load metrics:", error);
    }
  }

  /**
   * Get formatted summary for console
   */
  logSummary(): void {
    const report = this.getReport();

    console.group("🎯 Profile Picture Cache Performance Report");

    report.recommendations.forEach((rec, i) => {

    });
    console.groupEnd();
  }
}

// Export singleton instance
export const cacheMonitor = new CachePerformanceMonitor();

// Expose to window for debugging
if (typeof window !== "undefined") {
  (window as any).cacheMonitor = cacheMonitor;

}

// Auto-log summary every hour in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  setInterval(() => {
    cacheMonitor.logSummary();
  }, 60 * 60 * 1000);
}
