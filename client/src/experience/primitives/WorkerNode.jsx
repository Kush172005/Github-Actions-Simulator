import { forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PipelineNode } from "./PipelineNode.jsx";

export const WorkerNode = forwardRef(function WorkerNode(
  { icon, explode = false, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <PipelineNode ref={ref} icon={icon} {...rest} tone="emerald" pulse={false} />
      <AnimatePresence>
        {explode && (
          <>
            <motion.span
              className="pointer-events-none absolute left-1/2 top-1/2 z-40 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/30"
              initial={{ scale: 0.2, opacity: 0.9 }}
              animate={{ scale: 2.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.span
              className="pointer-events-none absolute left-1/2 top-1/2 z-40 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-400/80"
              initial={{ scale: 0.4, opacity: 1 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
});
