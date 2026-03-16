import React from 'react';
import { useFeatureFlags } from '@/lib/contexts/FeatureFlagContext';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const { hasFeature, loading } = useFeatureFlags();

  if (loading) return null;
  if (!hasFeature(feature)) return <>{fallback}</>;
  return <>{children}</>;
}
