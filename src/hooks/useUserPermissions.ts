/**
 * Hook for managing user permissions
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePinAuth } from '@/contexts/PinAuthContext';
import { 
  PermissionKey, 
  DEFAULT_PERMISSIONS, 
  PERMISSIONS_CATALOG 
} from '@/lib/permissions';

interface UserPermission {
  permission_key: string;
  allowed: boolean;
}

export function useUserPermissions() {
  const { session } = usePinAuth();
  const [permissions, setPermissions] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);

  // Load permissions for current user
  useEffect(() => {
    if (!session) {
      setPermissions(new Map());
      setLoading(false);
      return;
    }

    const loadPermissions = async () => {
      try {
        // Get custom permissions from database
        const { data: customPerms, error } = await supabase
          .from('user_permissions')
          .select('permission_key, allowed')
          .eq('pino_id', session.id);

        if (error) {
          console.error('Error loading permissions:', error);
        }

        // Start with default permissions for the role
        const permMap = new Map<string, boolean>();
        const defaultPerms = DEFAULT_PERMISSIONS[session.role] || [];
        
        // Set all permissions to false initially
        for (const key of Object.keys(PERMISSIONS_CATALOG)) {
          permMap.set(key, defaultPerms.includes(key as PermissionKey));
        }

        // Override with custom permissions
        if (customPerms) {
          for (const perm of customPerms) {
            permMap.set(perm.permission_key, perm.allowed);
          }
        }

        setPermissions(permMap);
      } catch (e) {
        console.error('Failed to load permissions:', e);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [session]);

  // Check if user has a specific permission
  const can = useCallback((permissionKey: PermissionKey): boolean => {
    if (!session) return false;
    
    // Admin always has all permissions
    if (session.role === 'admin') return true;
    
    // Check custom permissions first
    const customPerm = permissions.get(permissionKey);
    if (customPerm !== undefined) return customPerm;
    
    // Fall back to default permissions
    const defaultPerms = DEFAULT_PERMISSIONS[session.role] || [];
    return defaultPerms.includes(permissionKey);
  }, [session, permissions]);

  // Check if user has any of the specified permissions
  const canAny = useCallback((permissionKeys: PermissionKey[]): boolean => {
    return permissionKeys.some(key => can(key));
  }, [can]);

  // Check if user has all of the specified permissions
  const canAll = useCallback((permissionKeys: PermissionKey[]): boolean => {
    return permissionKeys.every(key => can(key));
  }, [can]);

  return {
    can,
    canAny,
    canAll,
    loading,
    permissions,
  };
}

// Hook for managing permissions of a specific user (for admin)
export function useUserPermissionsAdmin(pinoId: string | null) {
  const [permissions, setPermissions] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load permissions for specific user
  useEffect(() => {
    if (!pinoId) {
      setPermissions(new Map());
      setLoading(false);
      return;
    }

    const loadPermissions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_permissions')
          .select('permission_key, allowed')
          .eq('pino_id', pinoId);

        if (error) throw error;

        const permMap = new Map<string, boolean>();
        for (const perm of data || []) {
          permMap.set(perm.permission_key, perm.allowed);
        }
        setPermissions(permMap);
      } catch (e) {
        console.error('Failed to load user permissions:', e);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [pinoId]);

  // Update a single permission
  const updatePermission = useCallback(async (
    permissionKey: PermissionKey, 
    allowed: boolean
  ): Promise<boolean> => {
    if (!pinoId) return false;

    try {
      // Upsert the permission
      const { error } = await supabase
        .from('user_permissions')
        .upsert({
          pino_id: pinoId,
          permission_key: permissionKey,
          allowed,
        }, {
          onConflict: 'pino_id,permission_key',
        });

      if (error) throw error;

      // Update local state
      setPermissions(prev => {
        const newMap = new Map(prev);
        newMap.set(permissionKey, allowed);
        return newMap;
      });

      return true;
    } catch (e) {
      console.error('Failed to update permission:', e);
      return false;
    }
  }, [pinoId]);

  // Save all permissions at once
  const saveAllPermissions = useCallback(async (
    permissionsToSave: { key: PermissionKey; allowed: boolean }[]
  ): Promise<boolean> => {
    if (!pinoId) return false;

    setSaving(true);
    try {
      // Delete existing permissions
      await supabase
        .from('user_permissions')
        .delete()
        .eq('pino_id', pinoId);

      // Insert new permissions (only non-default ones)
      const inserts = permissionsToSave.map(p => ({
        pino_id: pinoId,
        permission_key: p.key,
        allowed: p.allowed,
      }));

      if (inserts.length > 0) {
        const { error } = await supabase
          .from('user_permissions')
          .insert(inserts);

        if (error) throw error;
      }

      // Update local state
      const newMap = new Map<string, boolean>();
      for (const p of permissionsToSave) {
        newMap.set(p.key, p.allowed);
      }
      setPermissions(newMap);

      return true;
    } catch (e) {
      console.error('Failed to save permissions:', e);
      return false;
    } finally {
      setSaving(false);
    }
  }, [pinoId]);

  // Check if permission is set (has override)
  const hasOverride = useCallback((permissionKey: PermissionKey): boolean => {
    return permissions.has(permissionKey);
  }, [permissions]);

  // Get permission value (or undefined if no override)
  const getPermission = useCallback((permissionKey: PermissionKey): boolean | undefined => {
    return permissions.get(permissionKey);
  }, [permissions]);

  return {
    permissions,
    loading,
    saving,
    updatePermission,
    saveAllPermissions,
    hasOverride,
    getPermission,
  };
}
