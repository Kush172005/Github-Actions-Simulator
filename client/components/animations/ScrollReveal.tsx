'use client';

import { motion, type HTMLMotionProps } from 'motion/react';
import { transitionSoft } from '../../lib/animation/motion';

export type ScrollRevealProps = HTMLMotionProps<'div'> & {
  y?: number;
  margin?: string;
  once?: boolean;
  amount?: number | 'some' | 'all';
};

export function ScrollReveal({
  children,
  className,
  y = 24,
  margin = '-80px',
  once = true,
  amount = 0.3,
  ...props
}: ScrollRevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin, amount }}
      transition={transitionSoft}
      {...props}
    >
      {children}
    </motion.div>
  );
}
