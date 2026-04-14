'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface CopyButtonProps {
  value: string;
  label?: string;
  onCopy?: () => void;
  size?: 'sm' | 'md';
}

export default function CopyButton({ value, label, onCopy, size = 'sm' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(label ? `${label} copied` : 'Copied!', { duration: 1500 });
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const btnSize = size === 'sm' ? 'p-1.5' : 'p-2';

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={handleCopy}
      className={`${btnSize} rounded-lg transition-colors relative`}
      style={{
        background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.1)',
        color: copied ? '#22c55e' : 'var(--text-secondary)',
        border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'transparent'}`,
      }}
      title={`Copy ${label || ''}`}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Check className={iconSize} />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Copy className={iconSize} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
