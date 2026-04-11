'use client';

import { motion, type HTMLMotionProps } from 'motion/react';
import { transitionSoft } from '../../lib/animation/motion';

export type FadeInProps = HTMLMotionProps<'div'> & {
  delay?: number;
  y?: number;
  duration?: number;
};

export function FadeIn({
  children,
  className,
  delay = 0,
  y = 16,
  duration = 0.45,
  ...props
}: FadeInProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transitionSoft, duration, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
