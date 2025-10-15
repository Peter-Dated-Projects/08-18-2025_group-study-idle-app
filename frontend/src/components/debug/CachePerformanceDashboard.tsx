/**
 * Cache Performance Dashboard
 *
 * Visual dashboard for monitoring profile picture cache performance.
 * Shows real-time metrics, layer breakdown, and recommendations.
 *
 * Usage:
 *   <CachePerformanceDashboard />
 */

"use client";

import React, { useState, useEffect } from "react";
import { cacheMonitor } from "@/services/cachePerformanceMonitor";
import {
  getServiceWorkerStats,
  clearServiceWorkerCache,
  type ServiceWorkerStats,
} from "@/lib/sw-registration";
import { imageCacheManager } from "@/services/imageCacheManager";

export function CachePerformanceDashboard() {
  const [report, setReport] = useState(cacheMonitor.getReport());
  const [swStats, setSwStats] = useState<ServiceWorkerStats | null>(null);
  const [cacheStats, setCacheStats] = useState({
    localStorageEntries: 0,
    indexedDBEntries: 0,
    totalSize: "0 KB",
  });
  const [isExpanded, setIsExpanded] = useState(false);

  // Refresh metrics every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      setReport(cacheMonitor.getReport());

      // Get Service Worker stats
      const sw = await getServiceWorkerStats();
      setSwStats(sw);

      // Get cache manager stats
      const cache = await imageCacheManager.getStats();
      setCacheStats(cache);
    }, 5000);

    // Initial load
    getServiceWorkerStats().then(setSwStats);
    imageCacheManager.getStats().then(setCacheStats);

    return () => clearInterval(interval);
  }, []);

  const handleClearAll = async () => {
    if (!confirm("Clear all caches? This will remove all cached profile pictures.")) {
      return;
    }

    await imageCacheManager.clearAll();
    await clearServiceWorkerCache();
    cacheMonitor.clear();

    // Refresh stats
    setReport(cacheMonitor.getReport());
    const sw = await getServiceWorkerStats();
    setSwStats(sw);
    const cache = await imageCacheManager.getStats();
    setCacheStats(cache);
  };

  const handleExport = () => {
    const json = cacheMonitor.export();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cache-performance-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isExpanded) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          backgroundColor: "#2c3e50",
          color: "white",
          padding: "12px 20px",
          borderRadius: "8px",
          cursor: "pointer",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          zIndex: 9999,
          fontSize: "14px",
          fontFamily: "monospace",
        }}
      >
        📊 Cache: {report.metrics.cacheHitRate.toFixed(1)}% ({report.metrics.totalRequests} reqs)
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        backgroundColor: "white",
        border: "2px solid #2c3e50",
        borderRadius: "12px",
        padding: "20px",
        maxWidth: "600px",
        maxHeight: "80vh",
        overflow: "auto",
        boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
        zIndex: 9999,
        fontSize: "13px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
        <h3 style={{ margin: 0, fontSize: "18px", color: "#2c3e50" }}>
          📊 Cache Performance Dashboard
        </h3>
        <button
          onClick={() => setIsExpanded(false)}
          style={{
            background: "none",
            border: "none",
            fontSize: "20px",
            cursor: "pointer",
            padding: "0 8px",
          }}
        >
          ✕
        </button>
      </div>

      {/* Summary Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <MetricCard
          label="Total Requests"
          value={report.metrics.totalRequests.toString()}
          icon="📈"
        />
        <MetricCard
          label="Cache Hit Rate"
          value={`${report.metrics.cacheHitRate.toFixed(1)}%`}
          icon="🎯"
          color={
            report.metrics.cacheHitRate > 80
              ? "#27ae60"
              : report.metrics.cacheHitRate > 50
              ? "#f39c12"
              : "#e74c3c"
          }
        />
        <MetricCard
          label="Avg Load Time"
          value={`${report.metrics.averageLoadTime}ms`}
          icon="⚡"
          color={
            report.metrics.averageLoadTime < 20
              ? "#27ae60"
              : report.metrics.averageLoadTime < 50
              ? "#f39c12"
              : "#e74c3c"
          }
        />
        <MetricCard
          label="Bandwidth Saved"
          value={`${(report.metrics.bandwidthSaved / 1024).toFixed(1)} KB`}
          icon="💾"
        />
      </div>

      {/* Layer Breakdown */}
      <div style={{ marginBottom: "16px" }}>
        <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#34495e" }}>
          Cache Layer Breakdown
        </h4>
        <LayerBar
          label="Redux"
          hits={report.breakdown.redux.hits}
          percentage={report.breakdown.redux.percentage}
          avgTime={report.breakdown.redux.avgTime}
          color="#3498db"
        />
        <LayerBar
          label="LocalStorage"
          hits={report.breakdown.localStorage.hits}
          percentage={report.breakdown.localStorage.percentage}
          avgTime={report.breakdown.localStorage.avgTime}
          color="#9b59b6"
        />
        <LayerBar
          label="IndexedDB"
          hits={report.breakdown.indexedDB.hits}
          percentage={report.breakdown.indexedDB.percentage}
          avgTime={report.breakdown.indexedDB.avgTime}
          color="#1abc9c"
        />
        <LayerBar
          label="Service Worker"
          hits={report.breakdown.serviceWorker.hits}
          percentage={report.breakdown.serviceWorker.percentage}
          avgTime={report.breakdown.serviceWorker.avgTime}
          color="#f39c12"
        />
        <LayerBar
          label="Network"
          hits={report.breakdown.network.hits}
          percentage={report.breakdown.network.percentage}
          avgTime={report.breakdown.network.avgTime}
          color="#e74c3c"
        />
      </div>

      {/* Storage Stats */}
      <div
        style={{
          marginBottom: "16px",
          padding: "12px",
          backgroundColor: "#ecf0f1",
          borderRadius: "6px",
        }}
      >
        <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#34495e" }}>Storage Usage</h4>
        <div style={{ fontSize: "12px", color: "#7f8c8d" }}>
          <div>LocalStorage: {cacheStats.localStorageEntries} entries</div>
          <div>
            IndexedDB: {cacheStats.indexedDBEntries} entries ({cacheStats.totalSize})
          </div>
          {swStats && (
            <div>
              Service Worker: {swStats.totalEntries} entries ({swStats.totalSizeMB} MB)
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px",
            backgroundColor: "#fff3cd",
            borderRadius: "6px",
            border: "1px solid #ffc107",
          }}
        >
          <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#856404" }}>
            💡 Recommendations
          </h4>
          <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "12px", color: "#856404" }}>
            {report.recommendations.map((rec, i) => (
              <li key={i} style={{ marginBottom: "4px" }}>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={handleClearAll}
          style={{
            flex: 1,
            padding: "8px 16px",
            backgroundColor: "#e74c3c",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          Clear All Caches
        </button>
        <button
          onClick={handleExport}
          style={{
            flex: 1,
            padding: "8px 16px",
            backgroundColor: "#3498db",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          Export Report
        </button>
        <button
          onClick={() => cacheMonitor.logSummary()}
          style={{
            flex: 1,
            padding: "8px 16px",
            backgroundColor: "#95a5a6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          Log to Console
        </button>
      </div>

      {/* Period Info */}
      <div style={{ marginTop: "12px", fontSize: "11px", color: "#95a5a6", textAlign: "center" }}>
        Period: {report.period.start.toLocaleTimeString()} -{" "}
        {report.period.end.toLocaleTimeString()}({report.period.durationHours.toFixed(2)}h)
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  color = "#2c3e50",
}: {
  label: string;
  value: string;
  icon: string;
  color?: string;
}) {
  return (
    <div
      style={{
        padding: "12px",
        backgroundColor: "#f8f9fa",
        borderRadius: "8px",
        border: "1px solid #dee2e6",
      }}
    >
      <div style={{ fontSize: "20px", marginBottom: "4px" }}>{icon}</div>
      <div style={{ fontSize: "11px", color: "#6c757d", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "18px", fontWeight: "bold", color }}>{value}</div>
    </div>
  );
}

function LayerBar({
  label,
  hits,
  percentage,
  avgTime,
  color,
}: {
  label: string;
  hits: number;
  percentage: number;
  avgTime: number;
  color: string;
}) {
  return (
    <div style={{ marginBottom: "8px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "11px",
          marginBottom: "4px",
        }}
      >
        <span>{label}</span>
        <span style={{ color: "#7f8c8d" }}>
          {hits} hits · {percentage.toFixed(1)}% · {avgTime}ms avg
        </span>
      </div>
      <div
        style={{
          height: "6px",
          backgroundColor: "#ecf0f1",
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percentage}%`,
            backgroundColor: color,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
