"use client";

import React from "react";
import { useTheme } from "./theme-provider";

type CollageTile = {
  src: string;
  rotate: string;
};

type CollageBackdrop = {
  gridClass: string;
  tileClass: string;
  imgClass: string;
  tileOverlayClass?: string;
  ambientClass?: string;
  overlayClass: string;
  tiles: CollageTile[];
};

const COLLAGE_BACKDROPS: Record<string, CollageBackdrop> = {
  meme: {
    gridClass: "gap-3 p-3 sm:gap-4 sm:p-4 opacity-[0.28]",
    tileClass: "rounded-xl border border-yellow-400/25 bg-black/40 shadow-lg",
    imgClass: "h-full w-full object-cover saturate-110",
    overlayClass: "bg-gradient-to-b from-[#0D0F14]/55 via-[#0D0F14]/45 to-[#0D0F14]/70",
    tiles: [
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
    ],
  },
  music: {
    gridClass: "gap-3.5 p-3.5 sm:gap-5 sm:p-5 opacity-[0.46]",
    tileClass:
      "rounded-2xl border border-fuchsia-400/20 bg-[#12091E]/70 shadow-[0_14px_40px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/10",
    imgClass:
      "h-full w-full object-cover object-[center_22%] grayscale contrast-125 brightness-90 scale-[1.03]",
    tileOverlayClass:
      "bg-gradient-to-tr from-[#3B0764]/65 via-fuchsia-500/25 to-violet-400/20 mix-blend-color",
    ambientClass:
      "bg-[radial-gradient(circle_at_18%_20%,rgba(236,72,153,0.18),transparent_44%),radial-gradient(circle_at_82%_78%,rgba(139,92,246,0.22),transparent_48%)]",
    overlayClass:
      "bg-gradient-to-b from-[#0E0918]/52 via-[#0E0918]/38 to-[#0E0918]/72",
    tiles: [
      { src: "/music/cairokee.webp", rotate: "-rotate-1" },
      { src: "/music/queen.webp", rotate: "rotate-1" },
      { src: "/music/massar-egbari.webp", rotate: "-rotate-2" },
      { src: "/music/pink-floyd.webp", rotate: "rotate-2" },
      { src: "/music/sharmoofers.webp", rotate: "rotate-1" },
      { src: "/music/linkin-park.webp", rotate: "-rotate-1" },
      { src: "/music/black-theama.webp", rotate: "-rotate-2" },
      { src: "/music/metallica.webp", rotate: "rotate-1" },
      { src: "/music/nirvana.webp", rotate: "rotate-2" },
      { src: "/music/arctic-monkeys.webp", rotate: "-rotate-1" },
      { src: "/music/coldplay.webp", rotate: "rotate-1" },
      { src: "/music/acdc.webp", rotate: "-rotate-2" },
    ],
  },
};

const SINGLE_BACKDROPS: Record<
  string,
  { src: string; imgClass: string; overlayClass: string }
> = {
  "breaking-bad": {
    src: "/backgrounds/breaking-bad.webp",
    imgClass: "object-cover object-center opacity-[0.40] saturate-110",
    overlayClass: "bg-gradient-to-b from-[#090C0A]/45 via-[#090C0A]/35 to-[#090C0A]/65",
  },
  gaming: {
    src: "/backgrounds/gta6.webp",
    imgClass: "object-cover object-center opacity-[0.34] saturate-110",
    overlayClass: "bg-gradient-to-b from-[#070B12]/55 via-[#070B12]/45 to-[#070B12]/75",
  },
};

let preloadedThemeImages = false;

export function preloadThemeBackdropAssets() {
  if (preloadedThemeImages || typeof window === "undefined") return;
  preloadedThemeImages = true;
  const urls = [
    ...Object.values(SINGLE_BACKDROPS).map((b) => b.src),
    ...Array.from(
      new Set(
        Object.values(COLLAGE_BACKDROPS).flatMap((collage) =>
          collage.tiles.map((t) => t.src)
        )
      )
    ),
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

  const collage = COLLAGE_BACKDROPS[themeId];
  if (collage) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      >
        <div
          className={`grid h-full w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 ${collage.gridClass}`}
        >
          {collage.tiles.map((tile, index) => (
            <div
              key={`${tile.src}-${index}`}
              className={`relative overflow-hidden ${collage.tileClass} ${tile.rotate}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tile.src}
                alt=""
                decoding="async"
                className={collage.imgClass}
              />
              {collage.tileOverlayClass ? (
                <>
                  <div className={`absolute inset-0 ${collage.tileOverlayClass}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0E0918]/80 via-transparent to-[#0E0918]/25" />
                </>
              ) : null}
            </div>
          ))}
        </div>
        {collage.ambientClass ? (
          <div className={`absolute inset-0 ${collage.ambientClass}`} />
        ) : null}
        <div className={`absolute inset-0 ${collage.overlayClass}`} />
      </div>
    );
  }

  return null;
}
