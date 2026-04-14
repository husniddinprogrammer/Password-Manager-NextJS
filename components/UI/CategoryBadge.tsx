'use client';

import {
  Globe,
  Users,
  CreditCard,
  Mail,
  Briefcase,
  ShoppingBag,
  Code,
  Tv,
  MoreHorizontal,
} from 'lucide-react';

interface CategoryBadgeProps {
  category: string;
  size?: 'sm' | 'md';
}

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  General: { icon: Globe, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  Social: { icon: Users, color: '#f472b6', bg: 'rgba(244,114,182,0.1)' },
  Banking: { icon: CreditCard, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  Email: { icon: Mail, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  Work: { icon: Briefcase, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  Shopping: { icon: ShoppingBag, color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  Development: { icon: Code, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  Entertainment: { icon: Tv, color: '#e879f9', bg: 'rgba(232,121,249,0.1)' },
  Other: { icon: MoreHorizontal, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
};

export default function CategoryBadge({ category, size = 'sm' }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['General'];
  const Icon = config.icon;
  const isSmall = size === 'sm';

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap"
      style={{
        background: config.bg,
        color: config.color,
        padding: isSmall ? '2px 8px' : '4px 10px',
        fontSize: isSmall ? '11px' : '12px',
        border: `1px solid ${config.color}22`,
      }}
    >
      <Icon className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {category}
    </span>
  );
}
