"use client";

import Image from "next/image";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

const COLORS = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-pink-500",
  "bg-indigo-500", "bg-teal-500", "bg-orange-500", "bg-red-500",
  "bg-cyan-500", "bg-emerald-500",
];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface AvatarProps {
  name: string;
  image?: string | null;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-12 h-12 text-base",
  lg: "w-32 h-32 text-5xl",
};

export default function Avatar({ name, image, size = "md" }: AvatarProps) {
  const sizeClass = sizeClasses[size];

  if (image) {
    return (
      <div className={`relative ${sizeClass} rounded-full overflow-hidden`}>
        <Image src={image} alt={name} fill className="object-cover" />
      </div>
    );
  }

  const initials = getInitials(name);
  const color = getColor(name);

  return (
    <div
      className={`${sizeClass} ${color} rounded-full flex items-center justify-center text-white font-bold`}
    >
      {initials}
    </div>
  );
}
