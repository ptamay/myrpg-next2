"use client";

import { useEffect, useRef } from "react";
import { applyWeatherEffect } from "@/lib/weatherEffects";

interface BackgroundEffectsProps {
  weatherEffect: string;
}

export default function BackgroundEffects({ weatherEffect }: BackgroundEffectsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyWeatherEffect(containerRef.current, weatherEffect);
  }, [weatherEffect]);

  return <div className="background-effects" id="bg-effects" ref={containerRef}></div>;
}
