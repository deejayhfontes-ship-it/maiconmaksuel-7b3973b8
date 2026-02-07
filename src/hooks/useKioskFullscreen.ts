/**
 * Kiosk Fullscreen Management Hook
 * Handles graceful fullscreen activation with user gesture requirement
 */

import { useState, useEffect, useCallback } from 'react';

const FULLSCREEN_PREF_KEY = 'mm-kiosk-fullscreen-pref';

export interface FullscreenState {
  isFullscreen: boolean;
  isSupported: boolean;
  isFailed: boolean;
  userPreference: boolean;
}

export function useKioskFullscreen() {
  const [fullscreenState, setFullscreenState] = useState<FullscreenState>({
    isFullscreen: false,
    isSupported: !!document.fullscreenEnabled,
    isFailed: false,
    userPreference: false,
  });

  // Load user preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FULLSCREEN_PREF_KEY);
      if (saved === 'true') {
        setFullscreenState(prev => ({ ...prev, userPreference: true }));
      }
    } catch {
      // Ignore localStorage access errors
    }
  }, []);

  // Monitor fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreenState(prev => ({
        ...prev,
        isFullscreen: !!document.fullscreenElement,
        isFailed: false,
      }));
    };

    const handleFullscreenError = () => {
      setFullscreenState(prev => ({
        ...prev,
        isFailed: true,
      }));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('fullscreenerror', handleFullscreenError);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('fullscreenerror', handleFullscreenError);
    };
  }, []);

  // Request fullscreen with user gesture (required by browsers)
  const requestFullscreen = useCallback(async () => {
    if (!fullscreenState.isSupported) {
      setFullscreenState(prev => ({
        ...prev,
        isFailed: true,
      }));
      return false;
    }

    try {
      // Only fullscreen the document element
      await document.documentElement.requestFullscreen({
        navigationUI: 'hide', // Hide browser UI in fullscreen
      });

      // Save preference
      try {
        localStorage.setItem(FULLSCREEN_PREF_KEY, 'true');
      } catch {
        // Ignore localStorage access errors
      }

      setFullscreenState(prev => ({
        ...prev,
        isFullscreen: true,
        isFailed: false,
        userPreference: true,
      }));
      return true;
    } catch (error) {
      console.warn('Fullscreen request failed:', error);
      setFullscreenState(prev => ({
        ...prev,
        isFailed: true,
      }));
      return false;
    }
  }, [fullscreenState.isSupported]);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    if (!fullscreenState.isFullscreen) return;

    try {
      await document.exitFullscreen();
      setFullscreenState(prev => ({
        ...prev,
        isFullscreen: false,
        userPreference: false,
      }));

      try {
        localStorage.setItem(FULLSCREEN_PREF_KEY, 'false');
      } catch {
        // Ignore localStorage access errors
      }
    } catch (error) {
      console.warn('Exit fullscreen failed:', error);
    }
  }, [fullscreenState.isFullscreen]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (fullscreenState.isFullscreen) {
      await exitFullscreen();
    } else {
      await requestFullscreen();
    }
  }, [fullscreenState.isFullscreen, requestFullscreen, exitFullscreen]);

  // Check if fullscreen is available
  const isFullscreenAvailable = useCallback(() => {
    return fullscreenState.isSupported && !fullscreenState.isFailed;
  }, [fullscreenState.isSupported, fullscreenState.isFailed]);

  return {
    ...fullscreenState,
    requestFullscreen,
    exitFullscreen,
    toggleFullscreen,
    isFullscreenAvailable,
  };
}
