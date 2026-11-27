"use client";

import React from "react";
import { useTheme } from "./theme-provider";

const MEME_TILES: Array<{
  src: string;
  rotate: string;
}> = [
  { src: "/memes/unsettled-tom.webp", rotate: "-rotate-1" },
  { src: "/memes/tom-newspaper.webp", rotate: "rotate-1" },
  { src: "/memes/tom-shrugging.webp", rotate: "-rotate-2" },
  { src: "/memes/tom-swordfight.webp", rotate: "rotate-2" },
  { src: "/memes/disgusted-tom.webp", rotate: "rotate-1" },
  { src: "/memes/tom-gun.webp", rotate: "-rotate-1" },
  { src: "/memes/depressed-tom-jerry.webp", rotate: "-rotate-2" },
  { src: "/memes/tom-calls-goons.webp", rotate: "rotate-1" },
  { src: "/memes/suspicious-tom-newspaper.webp", rotate: "rotate-2" },
  { src: "/memes/unsettled-tom.webp", rotate: "-rotate-1" },
  { src: "/memes/tom-shrugging.webp", rotate: "rotate-1" },
  { src: "/memes/tom-swordfight.webp", rotate: "-rotate-2" },
];

const SINGLE_BACKDROPS: Record<
  string,
  { src: string; imgClass: string; overlayClass: string }
> = {
  "breaking-bad": {
    src: "/backgrounds/breaking-bad.webp",
    imgClass: "object-cover object-top opacity-[0.34] saturate-110",
    overlayClass: "bg-gradient-to-b from-[#090C0A]/55 via-[#090C0A]/45 to-[#090C0A]/75",
  },
  gaming: {
    src: "/backgrounds/gta6.webp",
    imgClass: "object-cover object-center opacity-[0.34] saturate-110",
    overlayClass: "bg-gradient-to-b from-[#070B12]/55 via-[#070B12]/45 to-[#070B12]/75",
  },
  music: {
    src: "/backgrounds/music.webp",
    imgClass: "object-cover object-bottom opacity-[0.42] saturate-110",
    overlayClass: "bg-gradient-to-b from-[#0E0918]/45 via-[#0E0918]/35 to-[#0E0918]/65",
  },
};

let preloadedThemeImages = false;

export function preloadThemeBackdropAssets() {
  if (preloadedThemeImages || typeof window === "undefined") return;
  preloadedThemeImages = true;
  const urls = [
    ...Object.values(SINGLE_BACKDROPS).map((b) => b.src),
    ...Array.from(new Set(MEME_TILES.map((t) => t.src))),
  ];
  for (const url of urls) {
    const img = new window.Image();
    img.decoding = "async";
    img.src = url;
  }
}

export function ThemeBackdrop() {
  const { themeId, mounted } = useTheme();

  if (!mounted) {
    return null;
  }

  const single = SINGLE_BACKDROPS[themeId];
  if (single) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={single.src}
          alt=""
          decoding="async"
          className={`h-full w-full ${single.imgClass}`}
        />
        <div className={`absolute inset-0 ${single.overlayClass}`} />
      </div>
    );
  }

  if (themeId === "blush") {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      >
        <svg className="h-full w-full opacity-[0.65]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="sakura-blossom-pattern"
              width="200"
              height="200"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="24" cy="28" r="2.5" fill="#F9A8D4" fillOpacity="0.45" />
              <circle cx="170" cy="36" r="2" fill="#F472B6" fillOpacity="0.35" />
              <circle cx="104" cy="176" r="2.5" fill="#FDA4AF" fillOpacity="0.4" />

              <g transform="translate(56, 56)">
                <ellipse cx="0" cy="-16" rx="7.5" ry="12" fill="#FBCFE8" />
                <ellipse cx="0" cy="-16" rx="7.5" ry="12" fill="#FBCFE8" transform="rotate(72)" />
                <ellipse cx="0" cy="-16" rx="7.5" ry="12" fill="#FBCFE8" transform="rotate(144)" />
                <ellipse cx="0" cy="-16" rx="7.5" ry="12" fill="#FBCFE8" transform="rotate(216)" />
                <ellipse cx="0" cy="-16" rx="7.5" ry="12" fill="#FBCFE8" transform="rotate(288)" />
                <circle cx="0" cy="0" r="4.2" fill="#E11D74" fillOpacity="0.55" />
                <circle cx="0" cy="0" r="1.8" fill="#FDE68A" />
              </g>

              <g transform="translate(152, 142) rotate(24) scale(0.78)">
                <ellipse cx="0" cy="-15" rx="7" ry="11.5" fill="#F9A8D4" fillOpacity="0.72" />
                <ellipse cx="0" cy="-15" rx="7" ry="11.5" fill="#F9A8D4" fillOpacity="0.72" transform="rotate(72)" />
                <ellipse cx="0" cy="-15" rx="7" ry="11.5" fill="#F9A8D4" fillOpacity="0.72" transform="rotate(144)" />
                <ellipse cx="0" cy="-15" rx="7" ry="11.5" fill="#F9A8D4" fillOpacity="0.72" transform="rotate(216)" />
                <ellipse cx="0" cy="-15" rx="7" ry="11.5" fill="#F9A8D4" fillOpacity="0.72" transform="rotate(288)" />
                <circle cx="0" cy="0" r="3.8" fill="#E11D74" fillOpacity="0.5" />
                <circle cx="0" cy="0" r="1.6" fill="#FDE68A" />
              </g>

              <path
                d="M128 46 C135 38, 145 42, 141 52 C137 58, 127 54, 128 46 Z"
                fill="#F472B6"
                fillOpacity="0.32"
              />
              <path
                d="M36 148 C43 141, 52 145, 48 154 C44 159, 35 156, 36 148 Z"
                fill="#FDA4AF"
                fillOpacity="0.42"
              />
              <path
                d="M104 106 C109 100, 117 103, 114 110 C111 115, 103 112, 104 106 Z"
                fill="#FBCFE8"
                fillOpacity="0.85"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sakura-blossom-pattern)" />
        </svg>
      </div>
    );
  }

  if (themeId === "meme") {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      >
        <div className="grid h-full w-full grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:gap-4 sm:p-4 lg:grid-cols-4 opacity-[0.28]">
          {MEME_TILES.map((tile, index) => (
            <div
              key={`${tile.src}-${index}`}
              className={`relative overflow-hidden rounded-xl border border-yellow-400/25 bg-black/40 shadow-lg ${tile.rotate}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tile.src}
                alt=""
                decoding="async"
                className="h-full w-full object-cover saturate-110"
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0D0F14]/55 via-[#0D0F14]/45 to-[#0D0F14]/70" />
      </div>
    );
  }

  return null;
}
