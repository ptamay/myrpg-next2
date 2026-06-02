"use client";

import React, { useState, useEffect } from "react";
import { useGameSync, SyncEvent } from "@/hooks/useGameSync";
import { RollResult } from "@/lib/dice/dnd5e";
import { useUserSession } from "@/contexts/UserSessionContext";

interface FeedItem extends RollResult {
  timestamp_local: number;
}

export default function DiceRollFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const { session, isGM } = useUserSession();

  useGameSync((event: SyncEvent) => {
    if (event.type === 'dice_roll') {
      const rollData = event.payload as RollResult;
      
      // Visibility Check
      if (rollData.visibility === 'private' && rollData.rolledBy !== session?.playerId) return;
      if (rollData.visibility === 'gm' && !isGM && rollData.rolledBy !== session?.playerId) return;
      
      setFeed(prev => {
        // Evitar duplicados
        if (prev.some(p => p.id === rollData.id)) return prev;
        
        const newFeed = [{ ...rollData, timestamp_local: Date.now() }, ...prev];
        return newFeed.slice(0, 5); // Manter apenas os últimos 5
      });
    }
  });

  // Limpar itens antigos após 8 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setFeed(prev => prev.filter(item => now - item.timestamp_local < 8000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (feed.length === 0) return null;

  return (
    <div 
      className="dice-roll-feed"
      style={{
        position: "fixed",
        bottom: "90px",
        right: "20px",
        width: "280px",
        display: "flex",
        flexDirection: "column-reverse",
        gap: "10px",
        zIndex: 90,
        pointerEvents: "none"
      }}
    >
      {feed.map(roll => (
        <div 
          key={roll.id} 
          className="dice-feed-item glass-panel"
          style={{
            padding: "12px",
            borderRadius: "8px",
            animation: "slideInRight 0.3s ease-out, fadeOut 0.5s ease-in 7.5s forwards",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            borderLeft: roll.isCritical ? "4px solid #4ade80" : roll.isCritFail ? "4px solid #f87171" : "4px solid var(--accent-primary)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
            <span style={{ fontWeight: "bold", fontSize: "0.9rem", color: "white" }}>{roll.characterName}</span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "capitalize" }}>{roll.rollType}</span>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ fontSize: "1.5rem" }}>🎲</div>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: 900, color: roll.isCritical ? "#4ade80" : roll.isCritFail ? "#f87171" : "white" }}>
                {roll.total}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                {roll.diceType} = {roll.result} {roll.modifier !== 0 ? `(${roll.modifier >= 0 ? '+' : ''}${roll.modifier})` : ''}
              </div>
            </div>
          </div>
        </div>
      ))}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}} />
    </div>
  );
}
