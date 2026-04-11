'use client';

import { motion } from 'motion/react';
import { Children, type ReactNode } from 'react';
import {
  staggerContainer,
  staggerItemVariants,
} from '../../lib/animation/motion';

export type StaggerProps = {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
  once?: boolean;
};

export function Stagger({
  children,
  className,
  stagger = 0.06,
  delayChildren = 0,
  once = true,
}: StaggerProps) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer(stagger, delayChildren)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-40px' }}
    >
      {Children.map(children, (child, index) => (
        <motion.div key={index} variants={staggerItemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

export type StaggerItemProps = {
  children: ReactNode;
  className?: string;
};

/** Use when you need a motion child with its own variants; most lists can rely on `Stagger` alone. */
export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div className={className} variants={staggerItemVariants}>
      {children}
    </motion.div>
  );
}
