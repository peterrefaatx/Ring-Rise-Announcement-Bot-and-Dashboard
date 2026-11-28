import type React from "react";
import { BsLightningChargeFill } from "react-icons/bs";
import { FaFireFlameCurved } from "react-icons/fa6";
import { GiRobberMask } from "react-icons/gi";
import { TbTargetArrow } from "react-icons/tb";
import type { LeaderboardBadgeId } from "@/lib/leaderboard";

export interface MedalDefinition {
  id: LeaderboardBadgeId;
  name: string;
  shortRule: string;
  fullRule: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
}

export const MEDAL_DEFINITIONS: MedalDefinition[] = [
  {
    id: "throne-stealer",
    name: "Throne Stealer",
    shortRule: "New #1 · 15m",
    fullRule: "Throne Stealer — Took #1 within the last 15 minutes",
    Icon: GiRobberMask,
    iconClass: "text-purple-500",
  },
  {
    id: "on-fire",
    name: "On Fire",
    shortRule: "2+ in 60m",
    fullRule: "On Fire — 2+ leads within the last 60 minutes",
    Icon: FaFireFlameCurved,
    iconClass: "text-rose-500",
  },
  {
    id: "speed-demon",
    name: "Speed Demon",
    shortRule: "Fastest gap",
    fullRule: "Speed Demon — Shortest gap between two consecutive leads today",
    Icon: BsLightningChargeFill,
    iconClass: "text-sky-500",
  },
  {
    id: "first-blood",
    name: "First Blood",
    shortRule: "1st today",
    fullRule: "First Blood — First lead of the day",
    Icon: TbTargetArrow,
    iconClass: "text-emerald-500",
  },
];

export const MEDAL_BY_ID = Object.fromEntries(
  MEDAL_DEFINITIONS.map((m) => [m.id, m])
) as Record<LeaderboardBadgeId, MedalDefinition>;
