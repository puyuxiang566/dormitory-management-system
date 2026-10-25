'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_FACTORIES,
  FactoryOption,
  getFactoryColor,
  getFactoryDisplayName,
  sortFactoryOptions,
} from '@/lib/factory-utils';

export function useFactories() {
  const [factories, setFactories] = useState<FactoryOption[]>(DEFAULT_FACTORIES);
  const [loading, setLoading] = useState(true);

  const loadFactories = useCallback(async () => {
    try {
      const response = await fetch('/api/factories', { cache: 'no-store' });
      if (!response.ok) throw new Error('加载工厂配置失败');
      const result = await response.json();
      const list: FactoryOption[] = Array.isArray(result) ? result : result.data;
      if (Array.isArray(list) && list.length > 0) {
        setFactories(sortFactoryOptions(list));
      }
    } catch (error) {
      console.error('Error loading factories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFactories();
  }, [loadFactories]);

  const activeFactories = useMemo(
    () => factories.filter((factory) => factory.isActive),
    [factories]
  );

  const nameOf = useCallback(
    (code?: string | null) => getFactoryDisplayName(factories, code),
    [factories]
  );

  const colorOf = useCallback(
    (code?: string | null) => getFactoryColor(factories, code),
    [factories]
  );

  return {
    factories,
    activeFactories,
    loading,
    nameOf,
    colorOf,
    refetch: loadFactories,
  };
}
