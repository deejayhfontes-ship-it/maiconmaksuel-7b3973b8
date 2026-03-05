// Network Debug Context - Track and analyze API requests
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface NetworkRequest {
  id: string;
  endpoint: string;
  params: string;
  method: string;
  status: number | null;
  startTime: number;
  endTime: number | null;
  ttfb: number | null;
  size: number | null;
  error: string | null;
  isDuplicate?: boolean;
}

interface EndpointStats {
  endpoint: string;
  calls5s: number;
  calls30s: number;
  avgTtfb: number;
  duplicates: number;
  lastCall: number;
}

interface NetworkDebugContextType {
  isDebugMode: boolean;
  setDebugMode: (enabled: boolean) => void;
  requests: NetworkRequest[];
  endpointStats: Map<string, EndpointStats>;
  totalRequests5s: number;
  totalRequests30s: number;
  duplicateCount: number;
  avgTtfb: number;
  clearRequests: () => void;
  exportDiagnostics: () => string;
  dashboardLoadTime: number | null;
}

const NetworkDebugContext = createContext<NetworkDebugContextType | undefined>(undefined);

// Keep track of requests globally to intercept
const requestsLog: NetworkRequest[] = [];
let requestIdCounter = 0;

export function NetworkDebugProvider({ children }: { children: ReactNode }) {
  const [isDebugMode, setDebugMode] = useState(() => {
    return localStorage.getItem('network-debug-mode') === 'true';
  });
  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const [endpointStats, setEndpointStats] = useState<Map<string, EndpointStats>>(new Map());
  const [dashboardLoadTime, setDashboardLoadTime] = useState<number | null>(null);

  // Store debug mode preference
  useEffect(() => {
    localStorage.setItem('network-debug-mode', isDebugMode.toString());
  }, [isDebugMode]);

  // Intercept fetch requests when debug mode is enabled
  useEffect(() => {
    if (!isDebugMode) return;

    const originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      const method = args[1]?.method || 'GET';
      
      // Only track Supabase requests
      if (!url.includes('supabase.co')) {
        return originalFetch.apply(this, args);
      }

      const startTime = performance.now();
      const requestId = `req_${++requestIdCounter}`;
      
      // Parse endpoint
      const urlObj = new URL(url);
      const endpoint = urlObj.pathname.split('/').pop() || urlObj.pathname;
      const params = urlObj.search;

      // Check for duplicates (same endpoint + params within 1s)
      const recentDuplicate = requestsLog.find(r => 
        r.endpoint === endpoint && 
        r.params === params && 
        startTime - r.startTime < 1000
      );

      const newRequest: NetworkRequest = {
        id: requestId,
        endpoint,
        params,
        method,
        status: null,
        startTime,
        endTime: null,
        ttfb: null,
        size: null,
        error: null,
        isDuplicate: !!recentDuplicate,
      };

      requestsLog.push(newRequest);
      if (requestsLog.length > 500) requestsLog.shift();

      try {
        const response = await originalFetch.apply(this, args);
        const endTime = performance.now();
        
        newRequest.status = response.status;
        newRequest.endTime = endTime;
        newRequest.ttfb = endTime - startTime;
        
        // Clone response to get size
        const clone = response.clone();
        try {
          const text = await clone.text();
          newRequest.size = text.length;
        } catch {
          // Ignore size calculation errors
        }

        setRequests([...requestsLog]);
        return response;
      } catch (error) {
        const endTime = performance.now();
        newRequest.endTime = endTime;
        newRequest.ttfb = endTime - startTime;
        newRequest.error = error instanceof Error ? error.message : 'Unknown error';
        newRequest.status = 0;
        
        setRequests([...requestsLog]);
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [isDebugMode]);

  // Calculate stats
  useEffect(() => {
    if (!isDebugMode) return;

    const now = performance.now();
    const stats = new Map<string, EndpointStats>();

    requests.forEach(req => {
      const key = `${req.endpoint}${req.params}`;
      const existing = stats.get(key) || {
        endpoint: req.endpoint,
        calls5s: 0,
        calls30s: 0,
        avgTtfb: 0,
        duplicates: 0,
        lastCall: 0,
      };

      if (now - req.startTime < 5000) existing.calls5s++;
      if (now - req.startTime < 30000) existing.calls30s++;
      if (req.isDuplicate) existing.duplicates++;
      if (req.ttfb) {
        existing.avgTtfb = (existing.avgTtfb + req.ttfb) / 2;
      }
      existing.lastCall = Math.max(existing.lastCall, req.startTime);

      stats.set(key, existing);
    });

    setEndpointStats(stats);
  }, [requests, isDebugMode]);

  // Calculate totals
  const now = performance.now();
  const totalRequests5s = requests.filter(r => now - r.startTime < 5000).length;
  const totalRequests30s = requests.filter(r => now - r.startTime < 30000).length;
  const duplicateCount = requests.filter(r => r.isDuplicate).length;
  const ttfbValues = requests.filter(r => r.ttfb).map(r => r.ttfb!);
  const avgTtfb = ttfbValues.length > 0 
    ? ttfbValues.reduce((a, b) => a + b, 0) / ttfbValues.length 
    : 0;

  const clearRequests = useCallback(() => {
    requestsLog.length = 0;
    setRequests([]);
    setEndpointStats(new Map());
  }, []);

  const exportDiagnostics = useCallback(() => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRequests: requests.length,
        totalRequests5s,
        totalRequests30s,
        duplicateCount,
        avgTtfb: Math.round(avgTtfb),
        dashboardLoadTime,
      },
      endpointStats: Array.from(endpointStats.entries()).map(([key, stats]) => ({
        key,
        ...stats,
        avgTtfb: Math.round(stats.avgTtfb),
      })),
      requests: requests.slice(-100).map(r => ({
        ...r,
        ttfb: r.ttfb ? Math.round(r.ttfb) : null,
      })),
    };

    return JSON.stringify(diagnostics, null, 2);
  }, [requests, endpointStats, totalRequests5s, totalRequests30s, duplicateCount, avgTtfb, dashboardLoadTime]);

  // Track dashboard load time
  useEffect(() => {
    const measureDashboardLoad = () => {
      const navStart = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navStart) {
        setDashboardLoadTime(navStart.loadEventEnd - navStart.startTime);
      }
    };

    if (document.readyState === 'complete') {
      measureDashboardLoad();
    } else {
      window.addEventListener('load', measureDashboardLoad);
      return () => window.removeEventListener('load', measureDashboardLoad);
    }
  }, []);

  return (
    <NetworkDebugContext.Provider
      value={{
        isDebugMode,
        setDebugMode,
        requests,
        endpointStats,
        totalRequests5s,
        totalRequests30s,
        duplicateCount,
        avgTtfb,
        clearRequests,
        exportDiagnostics,
        dashboardLoadTime,
      }}
    >
      {children}
    </NetworkDebugContext.Provider>
  );
}

export function useNetworkDebug() {
  const context = useContext(NetworkDebugContext);
  if (context === undefined) {
    throw new Error('useNetworkDebug must be used within NetworkDebugProvider');
  }
  return context;
}
