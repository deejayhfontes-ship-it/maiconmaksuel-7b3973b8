/**
 * Performance Debug Hook
 * Activated via ?debugPerf=1 URL parameter
 * Tracks Dashboard load time and network requests
 */

import { useEffect, useRef, useState, useCallback } from "react";

export interface EndpointStat {
  endpoint: string;
  method: string;
  count: number;
  params: string[];
  duplicates: number;
  times: number[];
}

export interface PerformanceSnapshot {
  mountTime: number;
  dataReadyTime: number | null;
  totalLoadTime: number | null;
  requestsIn30s: number;
  endpointStats: Map<string, EndpointStat>;
  duplicateRequests: { endpoint: string; params: string; count: number }[];
  headRequests: number;
  getRequests: number;
  patchRequests: number;
}

// Check if debug mode is active
export function isDebugPerfActive(): boolean {
  if (typeof window === "undefined") return false;
  // Check both search params and hash for debugPerf
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
  return searchParams.get("debugPerf") === "1" || 
         hashParams.get("debugPerf") === "1" ||
         window.location.href.includes("debugPerf=1");
}

// Global request tracker
const requestLog: {
  endpoint: string;
  method: string;
  params: string;
  timestamp: number;
  duration: number;
}[] = [];

let interceptorInstalled = false;
let originalFetch: typeof fetch | null = null;

function installFetchInterceptor() {
  if (interceptorInstalled || typeof window === "undefined") return;
  
  originalFetch = window.fetch;
  interceptorInstalled = true;
  
  window.fetch = async function (...args) {
    const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
    const method = args[1]?.method || "GET";
    
    // Only track Supabase requests
    if (!url.includes("supabase.co")) {
      return originalFetch!.apply(this, args);
    }
    
    const startTime = performance.now();
    
    try {
      const response = await originalFetch!.apply(this, args);
      const duration = performance.now() - startTime;
      
      // Parse endpoint
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/");
      const endpoint = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
      const params = urlObj.search;
      
      requestLog.push({
        endpoint,
        method,
        params,
        timestamp: Date.now(),
        duration,
      });
      
      // Keep only last 200 requests
      if (requestLog.length > 200) {
        requestLog.shift();
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  };
}

function uninstallFetchInterceptor() {
  if (originalFetch && interceptorInstalled) {
    window.fetch = originalFetch;
    interceptorInstalled = false;
    originalFetch = null;
  }
}

export function usePerformanceDebug(isDataReady: boolean) {
  const isActive = isDebugPerfActive();
  const mountTimeRef = useRef<number>(performance.now());
  const [snapshot, setSnapshot] = useState<PerformanceSnapshot | null>(null);
  const dataReadyTimeRef = useRef<number | null>(null);
  const snapshotTakenRef = useRef(false);

  // Install interceptor on mount if debug is active
  useEffect(() => {
    if (!isActive) return;
    
    installFetchInterceptor();
    console.log("[PerfDebug] 🚀 Performance debug mode ACTIVE");
    console.log("[PerfDebug] Mount time recorded:", mountTimeRef.current.toFixed(2), "ms");
    
    return () => {
      // Don't uninstall - keep tracking
    };
  }, [isActive]);

  // Track when data becomes ready
  useEffect(() => {
    if (!isActive || !isDataReady || dataReadyTimeRef.current !== null) return;
    
    dataReadyTimeRef.current = performance.now();
    const totalLoadTime = dataReadyTimeRef.current - mountTimeRef.current;
    
    console.log("[PerfDebug] ✅ Data ready! Total load time:", totalLoadTime.toFixed(2), "ms");
  }, [isActive, isDataReady]);

  // Take snapshot after 30 seconds
  useEffect(() => {
    if (!isActive || snapshotTakenRef.current) return;
    
    const timer = setTimeout(() => {
      if (snapshotTakenRef.current) return;
      snapshotTakenRef.current = true;
      
      const now = Date.now();
      const cutoff = now - 30000;
      
      // Filter requests from last 30s
      const recentRequests = requestLog.filter(r => r.timestamp >= cutoff);
      
      // Group by endpoint + method
      const endpointStats = new Map<string, EndpointStat>();
      const paramCounts = new Map<string, number>();
      
      recentRequests.forEach(req => {
        const key = `${req.method}:${req.endpoint}`;
        const paramKey = `${key}:${req.params}`;
        
        // Count params for duplicate detection
        paramCounts.set(paramKey, (paramCounts.get(paramKey) || 0) + 1);
        
        if (!endpointStats.has(key)) {
          endpointStats.set(key, {
            endpoint: req.endpoint,
            method: req.method,
            count: 0,
            params: [],
            duplicates: 0,
            times: [],
          });
        }
        
        const stat = endpointStats.get(key)!;
        stat.count++;
        stat.times.push(req.duration);
        if (!stat.params.includes(req.params)) {
          stat.params.push(req.params);
        }
      });
      
      // Count duplicates
      const duplicateRequests: { endpoint: string; params: string; count: number }[] = [];
      paramCounts.forEach((count, key) => {
        if (count > 1) {
          const [method, endpoint, ...paramParts] = key.split(":");
          const params = paramParts.join(":");
          duplicateRequests.push({ endpoint: `${method}:${endpoint}`, params, count });
          
          const statKey = `${method}:${endpoint}`;
          const stat = endpointStats.get(statKey);
          if (stat) {
            stat.duplicates += count - 1;
          }
        }
      });
      
      // Count by method
      let headRequests = 0;
      let getRequests = 0;
      let patchRequests = 0;
      
      recentRequests.forEach(req => {
        if (req.method === "HEAD") headRequests++;
        else if (req.method === "GET") getRequests++;
        else if (req.method === "PATCH") patchRequests++;
      });
      
      const newSnapshot: PerformanceSnapshot = {
        mountTime: mountTimeRef.current,
        dataReadyTime: dataReadyTimeRef.current,
        totalLoadTime: dataReadyTimeRef.current 
          ? dataReadyTimeRef.current - mountTimeRef.current 
          : null,
        requestsIn30s: recentRequests.length,
        endpointStats,
        duplicateRequests,
        headRequests,
        getRequests,
        patchRequests,
      };
      
      setSnapshot(newSnapshot);
      
      // Log report
      console.log("\n[PerfDebug] ═══════════════════════════════════════════════");
      console.log("[PerfDebug] 📊 30-SECOND PERFORMANCE SNAPSHOT");
      console.log("[PerfDebug] ═══════════════════════════════════════════════");
      console.log("[PerfDebug] Total Load Time:", newSnapshot.totalLoadTime?.toFixed(0) || "N/A", "ms");
      console.log("[PerfDebug] Total Requests (30s):", newSnapshot.requestsIn30s);
      console.log("[PerfDebug] GET:", getRequests, "| HEAD:", headRequests, "| PATCH:", patchRequests);
      console.log("[PerfDebug] Duplicate Requests:", duplicateRequests.length);
      
      console.log("\n[PerfDebug] Top Endpoints:");
      const sortedStats = Array.from(endpointStats.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      sortedStats.forEach((stat, i) => {
        const avgTime = stat.times.reduce((a, b) => a + b, 0) / stat.times.length;
        console.log(
          `[PerfDebug] ${i + 1}. ${stat.method} ${stat.endpoint}: ${stat.count}x (avg ${avgTime.toFixed(0)}ms)${stat.duplicates > 0 ? ` ⚠️ ${stat.duplicates} duplicates` : ""}`
        );
      });
      
      if (duplicateRequests.length > 0) {
        console.log("\n[PerfDebug] ⚠️ Duplicate Requests Detected:");
        duplicateRequests.forEach(dup => {
          console.log(`[PerfDebug]   ${dup.endpoint}: ${dup.count}x with same params`);
        });
      }
      
      console.log("[PerfDebug] ═══════════════════════════════════════════════\n");
      
    }, 30000);
    
    return () => clearTimeout(timer);
  }, [isActive]);

  const exportSnapshot = useCallback(() => {
    if (!snapshot) return null;
    
    return {
      timestamp: new Date().toISOString(),
      totalLoadTimeMs: snapshot.totalLoadTime?.toFixed(0) || null,
      requestsIn30s: snapshot.requestsIn30s,
      methods: {
        GET: snapshot.getRequests,
        HEAD: snapshot.headRequests,
        PATCH: snapshot.patchRequests,
      },
      duplicateCount: snapshot.duplicateRequests.length,
      duplicates: snapshot.duplicateRequests,
      endpoints: Array.from(snapshot.endpointStats.values()).map(stat => ({
        endpoint: stat.endpoint,
        method: stat.method,
        count: stat.count,
        duplicates: stat.duplicates,
        avgTimeMs: (stat.times.reduce((a, b) => a + b, 0) / stat.times.length).toFixed(0),
      })),
    };
  }, [snapshot]);

  return {
    isActive,
    snapshot,
    exportSnapshot,
    mountTime: mountTimeRef.current,
    dataReadyTime: dataReadyTimeRef.current,
    totalLoadTime: dataReadyTimeRef.current 
      ? dataReadyTimeRef.current - mountTimeRef.current 
      : null,
  };
}

// Utility to get current request log (for immediate checking)
export function getCurrentRequestLog() {
  return [...requestLog];
}

// Clear request log
export function clearRequestLog() {
  requestLog.length = 0;
}
