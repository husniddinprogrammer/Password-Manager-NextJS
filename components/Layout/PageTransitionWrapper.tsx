'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

export default function PageTransitionWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: 'easeInOut' }}
        style={{ height: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
