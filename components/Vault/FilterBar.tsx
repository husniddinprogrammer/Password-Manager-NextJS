'use client';

import { motion } from 'framer-motion';
import { CREDENTIAL_CATEGORIES } from '@/lib/types';
import CategoryBadge from '@/components/UI/CategoryBadge';

interface FilterBarProps {
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export default function FilterBar({ selectedCategory, onCategoryChange }: FilterBarProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onCategoryChange(null)}
        className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors"
        style={{
          background: !selectedCategory ? 'rgba(99,102,241,0.2)' : 'var(--card)',
          color: !selectedCategory ? '#6366f1' : 'var(--text-secondary)',
          border: `1px solid ${!selectedCategory ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
        }}
      >
        All
      </motion.button>

      {CREDENTIAL_CATEGORIES.map((category) => (
        <motion.button
          key={category}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onCategoryChange(selectedCategory === category ? null : category)}
          className="flex-shrink-0"
          style={{
            opacity: selectedCategory && selectedCategory !== category ? 0.5 : 1,
            outline: selectedCategory === category ? '2px solid rgba(99,102,241,0.5)' : 'none',
            borderRadius: '999px',
          }}
        >
          <CategoryBadge category={category} />
        </motion.button>
      ))}
    </div>
  );
}
