'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Copy, Check, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PasswordStrength from '@/components/UI/PasswordStrength';
import { PasswordGeneratorOptions } from '@/lib/types';

interface PasswordGeneratorProps {
  onUse: (password: string) => void;
}

function generatePassword(opts: PasswordGeneratorOptions): string {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let charset = lower;
  if (opts.uppercase) charset += upper;
  if (opts.numbers) charset += numbers;
  if (opts.symbols) charset += symbols;

  const array = new Uint32Array(opts.length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((x) => charset[x % charset.length])
    .join('');
}

export default function PasswordGenerator({ onUse }: PasswordGeneratorProps) {
  const [opts, setOpts] = useState<PasswordGeneratorOptions>({
    length: 20,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });
  const [generated, setGenerated] = useState(() => generatePassword({
    length: 20, uppercase: true, lowercase: true, numbers: true, symbols: true,
  }));
  const [copied, setCopied] = useState(false);

  const regenerate = useCallback(() => {
    setGenerated(generatePassword(opts));
    setCopied(false);
  }, [opts]);

  const handleOptChange = (key: keyof PasswordGeneratorOptions, value: boolean | number) => {
    const next = { ...opts, [key]: value };
    setOpts(next);
    setGenerated(generatePassword(next));
    setCopied(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generated);
    setCopied(true);
    toast.success('Password copied', { duration: 1500 });
    setTimeout(() => setCopied(false), 2000);
  };

  const Toggle = ({
    label,
    optKey,
  }: {
    label: string;
    optKey: keyof Omit<PasswordGeneratorOptions, 'length'>;
  }) => (
    <button
      type="button"
      onClick={() => handleOptChange(optKey, !opts[optKey])}
      className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors"
      style={{
        background: opts[optKey] ? 'rgba(99,102,241,0.15)' : 'var(--surface)',
        color: opts[optKey] ? '#6366f1' : 'var(--text-secondary)',
        border: `1px solid ${opts[optKey] ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
      }}
    >
      <span className="font-medium">{label}</span>
      <div
        className="w-8 h-4 rounded-full transition-colors relative"
        style={{ background: opts[optKey] ? '#6366f1' : 'var(--border)' }}
      >
        <div
          className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform"
          style={{ transform: opts[optKey] ? 'translateX(18px)' : 'translateX(2px)' }}
        />
      </div>
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <div
        className="p-4 rounded-xl space-y-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Wand2 className="w-4 h-4" style={{ color: '#6366f1' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Password Generator
          </span>
        </div>

        {/* Generated password preview */}
        <div
          className="flex items-center gap-2 p-3 rounded-lg"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <p
            className="flex-1 font-mono text-sm break-all"
            style={{ color: 'var(--text-primary)' }}
          >
            {generated}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <motion.button
              type="button"
              whileTap={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
              onClick={regenerate}
              className="p-1.5 rounded-lg"
              style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}
              title="Regenerate"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={handleCopy}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.1)',
                color: copied ? '#22c55e' : '#6366f1',
              }}
              title="Copy"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </motion.button>
          </div>
        </div>

        {/* Strength */}
        <PasswordStrength password={generated} />

        {/* Length slider */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span style={{ color: 'var(--text-secondary)' }}>Length</span>
            <span className="font-bold" style={{ color: '#6366f1' }}>
              {opts.length}
            </span>
          </div>
          <input
            type="range"
            min={8}
            max={64}
            value={opts.length}
            onChange={(e) => handleOptChange('length', parseInt(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: '#6366f1' }}
          />
          <div className="flex justify-between text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            <span>8</span>
            <span>64</span>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-2 gap-2">
          <Toggle label="Uppercase" optKey="uppercase" />
          <Toggle label="Numbers" optKey="numbers" />
          <Toggle label="Symbols" optKey="symbols" />
          <Toggle label="Lowercase" optKey="lowercase" />
        </div>

        {/* Use button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onUse(generated)}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          Use This Password
        </motion.button>
      </div>
    </motion.div>
  );
}
