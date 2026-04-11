'use client';

import { motion, type HTMLMotionProps } from 'motion/react';
import { transitionSnappy } from '../../lib/animation/motion';

export type HoverScaleProps = HTMLMotionProps<'div'> & {
  scale?: number;
  tapScale?: number;
};

export function HoverScale({
  children,
  className,
  scale = 1.02,
  tapScale = 0.98,
  ...props
}: HoverScaleProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ scale }}
      whileTap={{ scale: tapScale }}
      transition={transitionSnappy}
      {...props}
    >
      {children}
    </motion.div>
  );
}
