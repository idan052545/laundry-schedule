"use client";

import { CATEGORY_CONFIG, PRIORITY_CONFIG } from "./constants";

export default function TaskLegend() {
  return (
    <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-gray-500">
      {Object.entries(PRIORITY_CONFIG).map(([k,v]) => (
        <div key={k} className="flex items-center gap-1"><div className={`w-2 h-2 rounded-full ${v.dot}`} /> {v.label}</div>
      ))}
      <div className="w-px h-3 bg-gray-200" />
      {Object.entries(CATEGORY_CONFIG).map(([k,{label,icon:I,color}]) => (
        <div key={k} className="flex items-center gap-1"><I className={color} /> {label}</div>
      ))}
    </div>
  );
}
