'use client';

import { useMemo } from 'react';
import zxcvbn from 'zxcvbn';

interface PasswordStrengthProps {
  password: string;
  showLabel?: boolean;
}

const STRENGTH_CONFIG = [
  { label: 'Very Weak', color: '#ef4444' },
  { label: 'Weak', color: '#f97316' },
  { label: 'Fair', color: '#f59e0b' },
  { label: 'Strong', color: '#22c55e' },
  { label: 'Very Strong', color: '#10b981' },
];

export default function PasswordStrength({ password, showLabel = true }: PasswordStrengthProps) {
  const score = useMemo(() => {
    if (!password) return -1;
    return zxcvbn(password).score;
  }, [password]);

  if (score === -1) return null;

  const config = STRENGTH_CONFIG[score];

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{
              background: i <= score ? config.color : 'var(--border)',
            }}
          />
        ))}
      </div>
      {showLabel && (
        <p className="text-xs font-medium" style={{ color: config.color }}>
          {config.label}
        </p>
      )}
    </div>
  );
}
