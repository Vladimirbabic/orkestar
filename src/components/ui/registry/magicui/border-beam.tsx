"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

type BorderBeamProps = {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  anchor?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
};

export const BorderBeam = ({
  className,
  size = 200,
  duration = 8,
  anchor = 90,
  borderWidth = 2,
  colorFrom,
  colorTo,
  delay = 0,
}: BorderBeamProps) => {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const boxElement = boxRef.current;
    if (!boxElement) return;

    // Wait for delay
    const startTime = Date.now() + delay * 1000;

    const updateAnimation = () => {
      if (Date.now() < startTime) {
        requestAnimationFrame(updateAnimation);
        return;
      }

      const currentAngle = parseFloat(
        boxElement.style.getPropertyValue("--angle") || "0"
      );
      const angle = (currentAngle + (360 / (duration * 60))) % 360;
      boxElement.style.setProperty("--angle", `${angle}deg`);
      requestAnimationFrame(updateAnimation);
    };

    requestAnimationFrame(updateAnimation);
  }, [duration, delay]);

  // Create gradient from green to inactive border color (zinc-800)
  const borderGradient = colorFrom && colorTo
    ? `linear-gradient(var(--angle), ${colorFrom}, ${colorTo})`
    : `linear-gradient(
        var(--angle),
        hsl(142, 76%, 36%),
        rgb(39, 39, 42),
        hsl(142, 76%, 36%)
      )`;

  return (
    <div
      ref={boxRef}
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] z-0",
        className
      )}
      style={{
        "--angle": "0deg",
        "--bg-color": "rgb(24, 24, 27)", // zinc-900
        border: `${borderWidth}px solid transparent`,
        background: `linear-gradient(var(--bg-color), var(--bg-color)) padding-box, ${borderGradient} border-box`,
        backgroundClip: "padding-box, border-box",
        WebkitBackgroundClip: "padding-box, border-box",
      } as React.CSSProperties & { "--angle": string; "--bg-color": string }}
    />
  );
};
