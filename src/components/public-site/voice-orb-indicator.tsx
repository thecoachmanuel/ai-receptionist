"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Mic, Volume2, Bot, Radio } from "lucide-react";

export type VoiceOrbState = "idle" | "connecting" | "listening" | "speaking";

interface VoiceOrbIndicatorProps {
  state?: VoiceOrbState;
  businessName?: string;
  className?: string;
  volume?: number; // 0 to 1 for dynamic voice scaling
  accentColor?: string;
}

export function VoiceOrbIndicator({
  state = "idle",
  businessName = "AI Assistant",
  className,
  volume = 0.5,
  accentColor,
}: VoiceOrbIndicatorProps) {
  // Generate floating waveform particles for speaking state
  const [particles, setParticles] = useState<
    Array<{ id: number; angle: number; distance: number; size: number; delay: number; speed: number }>
  >([]);

  useEffect(() => {
    const pts = Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      angle: i * 45 + (Math.random() * 20 - 10),
      distance: 52 + Math.random() * 28,
      size: 3.5 + Math.random() * 4.5,
      delay: Math.random() * 1.5,
      speed: 1.2 + Math.random() * 1.6,
    }));
    setParticles(pts);
  }, []);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-foreground/15 bg-background/90 p-6 text-foreground shadow-2xl backdrop-blur-xl transition-all duration-500",
        state === "speaking" && "border-cyan-400/40 shadow-[0_0_50px_rgba(56,189,248,0.25)]",
        state === "listening" && "border-emerald-400/40 shadow-[0_0_50px_rgba(16,185,129,0.25)]",
        state === "connecting" && "border-indigo-400/40 shadow-[0_0_50px_rgba(99,102,241,0.25)]",
        state === "idle" && !accentColor && "border-sky-500/20 shadow-[0_0_35px_rgba(56,189,248,0.15)]",
        className
      )}
      style={
        state === "idle" && accentColor
          ? {
              borderColor: `${accentColor}40`,
              boxShadow: `0 0 35px ${accentColor}33`,
            }
          : undefined
      }
    >
      {/* Dynamic Ambient Background Glow */}
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div
          className={cn(
            "absolute -top-1/2 -left-1/2 h-[200%] w-[200%] rounded-full blur-3xl transition-all duration-1000",
            state === "idle" && !accentColor && "bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.25),transparent_60%)]",
            state === "listening" && "bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.3),transparent_60%)]",
            state === "speaking" && "bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.35),rgba(56,189,248,0.25),transparent_70%)]",
            state === "connecting" && "bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.25),transparent_60%)]"
          )}
          style={
            state === "idle" && accentColor
              ? { background: `radial-gradient(circle at center, ${accentColor}66, transparent 60%)` }
              : undefined
          }
        />
      </div>

      {/* Main Orb Graphic Wrapper */}
      <div className="relative my-3 flex size-32 sm:size-36 items-center justify-center">
        {/* LISTENING STATE: Expanding Concentric Ripple Waves */}
        {state === "listening" && (
          <>
            <span className="absolute inset-0 rounded-full border border-emerald-400/50 animate-[voice-ripple_2s_cubic-bezier(0,0.2,0.8,1)_infinite]" />
            <span className="absolute -inset-4 rounded-full border border-emerald-400/35 animate-[voice-ripple_2s_cubic-bezier(0,0.2,0.8,1)_infinite_0.4s]" />
            <span className="absolute -inset-8 rounded-full border border-teal-400/20 animate-[voice-ripple_2.5s_cubic-bezier(0,0.2,0.8,1)_infinite_0.8s]" />
          </>
        )}

        {/* CONNECTING STATE: Orbital Gradient Ring */}
        {state === "connecting" && (
          <div className="absolute -inset-3.5 animate-spin rounded-full border-2 border-transparent border-t-cyan-400 border-r-indigo-500 duration-1000" />
        )}

        {/* SPEAKING STATE: Floating Waveform Orbiting Particles */}
        {state === "speaking" && (
          <div className="pointer-events-none absolute inset-0">
            {particles.map((p) => {
              const rad = (p.angle * Math.PI) / 180;
              const tx = Math.cos(rad) * p.distance;
              const ty = Math.sin(rad) * p.distance;
              return (
                <div
                  key={p.id}
                  className="absolute left-1/2 top-1/2 rounded-full bg-cyan-300 shadow-[0_0_10px_#38bdf8] animate-pulse"
                  style={{
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`,
                    animationDuration: `${p.speed}s`,
                    animationDelay: `${p.delay}s`,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* SPEAKING STATE: Animated Equalizer Bar Visualizer */}
        {state === "speaking" && (
          <div className="pointer-events-none absolute -inset-6 flex items-center justify-center gap-1.5 px-3 opacity-90">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-gradient-to-t from-cyan-400 via-sky-300 to-indigo-400 shadow-[0_0_8px_#38bdf8] animate-[voice-bar-bounce_1s_ease-in-out_infinite]"
                style={{
                  height: `${25 + Math.sin(i * 0.9) * 20 + volume * 30}%`,
                  animationDelay: `${(i % 5) * 0.12}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Glassmorphic Rim Container around Core Orb */}
        <div className="absolute inset-0 rounded-full border border-white/20 bg-white/5 backdrop-blur-md shadow-inner" />

        {/* Core Glowing Elliptical Orb */}
        <div
          className={cn(
            "relative flex size-24 sm:size-28 items-center justify-center rounded-full shadow-2xl transition-all duration-500 cursor-pointer group",
            // IDLE: Soft blue-to-cyan glow, gentle pulse
            state === "idle" && !accentColor &&
              "bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 shadow-[0_0_40px_rgba(56,189,248,0.5)] animate-[voice-orb-idle_4s_ease-in-out_infinite]",
            state === "idle" && accentColor &&
              "animate-[voice-orb-idle_4s_ease-in-out_infinite]",
            // LISTENING: Emerald-cyan pulse with ripple aura
            state === "listening" &&
              "bg-gradient-to-br from-emerald-300 via-teal-400 to-cyan-500 shadow-[0_0_50px_rgba(16,185,129,0.65)] animate-[voice-orb-listening_1.6s_ease-in-out_infinite]",
            // SPEAKING: Smooth scaling, dynamic cyan-indigo-purple glow
            state === "speaking" &&
              "bg-gradient-to-br from-cyan-300 via-indigo-400 to-fuchsia-500 shadow-[0_0_60px_rgba(99,102,241,0.8)] animate-[voice-orb-speaking_2s_ease-in-out_infinite]",
            // CONNECTING: Indigo-cyan soft pulse
            state === "connecting" &&
              "bg-gradient-to-br from-sky-400 via-indigo-500 to-purple-600 shadow-[0_0_35px_rgba(99,102,241,0.5)] animate-pulse"
          )}
          style={
            state === "idle" && accentColor
              ? {
                  background: `linear-gradient(135deg, ${accentColor}, color-mix(in srgb, ${accentColor} 75%, #020617))`,
                  boxShadow: `0 0 45px ${accentColor}80`,
                }
              : state === "speaking"
              ? {
                  transform: `scale(${1 + Math.min(volume, 0.4) * 0.22})`,
                }
              : undefined
          }
        >
          {/* Glass Gloss Surface Reflection */}
          <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-white/35 via-transparent to-black/25" />

          {/* Inner Glowing Core Lens */}
          <div
            className={cn(
              "size-12 rounded-full bg-white/40 blur-md transition-all duration-500",
              state === "speaking" && "scale-125 bg-white/70 blur-lg",
              state === "listening" && "scale-110 bg-emerald-100/60 blur-md",
              state === "idle" && "bg-white/40 blur-md"
            )}
          />

          {/* Center Dynamic Icon */}
          <div className="relative z-10 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
            {state === "listening" ? (
              <Mic className="size-8 text-white animate-pulse" />
            ) : state === "speaking" ? (
              <Volume2 className="size-8 text-white animate-pulse" />
            ) : state === "connecting" ? (
              <Radio className="size-8 text-white/90 animate-spin" />
            ) : (
              <Bot className="size-8 text-white/90 transition-transform duration-300 group-hover:scale-110" />
            )}
          </div>
        </div>
      </div>

      {/* State Label & Subtext */}
      <div className="relative z-10 mt-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <span
            className={cn(
              "size-2 rounded-full",
              state === "idle" && !accentColor && "bg-cyan-400 animate-pulse",
              state === "listening" && "bg-emerald-400 animate-ping",
              state === "speaking" && "bg-indigo-400 animate-bounce",
              state === "connecting" && "bg-amber-400 animate-pulse"
            )}
            style={state === "idle" && accentColor ? { backgroundColor: accentColor } : undefined}
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/90">
            {state === "idle" && `${businessName} Voice AI`}
            {state === "listening" && "AI Assistant Listening"}
            {state === "speaking" && "AI Assistant Speaking"}
            {state === "connecting" && "Connecting Voice Session"}
          </span>
        </div>
        <p className="mt-1 text-[11px] font-normal leading-4 text-muted-foreground max-w-xs">
          {state === "idle" && "Click 'Speak with AI' below to start live voice chat"}
          {state === "listening" && "Speak into your microphone now"}
          {state === "speaking" && "Responding to your question in real-time"}
          {state === "connecting" && "Initializing high-speed voice engine..."}
        </p>
      </div>

      {/* Inline Keyframe Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes voice-orb-idle {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 35px rgba(56, 189, 248, 0.45);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 55px rgba(6, 182, 212, 0.7);
          }
        }
        @keyframes voice-orb-listening {
          0%, 100% {
            transform: scale(1.02);
            box-shadow: 0 0 40px rgba(16, 185, 129, 0.5);
          }
          50% {
            transform: scale(1.12);
            box-shadow: 0 0 65px rgba(52, 211, 153, 0.85);
          }
        }
        @keyframes voice-orb-speaking {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 45px rgba(99, 102, 241, 0.6);
            filter: hue-rotate(0deg);
          }
          33% {
            transform: scale(1.09);
            box-shadow: 0 0 65px rgba(56, 189, 248, 0.85);
            filter: hue-rotate(25deg);
          }
          66% {
            transform: scale(0.97);
            box-shadow: 0 0 40px rgba(217, 70, 239, 0.75);
            filter: hue-rotate(-20deg);
          }
        }
        @keyframes voice-ripple {
          0% {
            transform: scale(0.85);
            opacity: 0.85;
          }
          100% {
            transform: scale(1.55);
            opacity: 0;
          }
        }
        @keyframes voice-bar-bounce {
          0%, 100% {
            transform: scaleY(0.35);
          }
          50% {
            transform: scaleY(1.35);
          }
        }
      ` }} />
    </div>
  );
}
