"use client";

import { useLanguage } from "@/i18n";
import { CATEGORY_CONFIG, getCategoryLabels, PRIORITY_CONFIG, getPriorityLabels } from "./constants";

export default function TaskLegend() {
  const { t } = useLanguage();
  const categoryLabels = getCategoryLabels(t);
  const priorityLabels = getPriorityLabels(t);

  return (
    <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-gray-500">
      {Object.entries(PRIORITY_CONFIG).map(([k,v]) => (
        <div key={k} className="flex items-center gap-1"><div className={`w-2 h-2 rounded-full ${v.dot}`} /> {priorityLabels[k]}</div>
      ))}
      <div className="w-px h-3 bg-gray-200" />
      {Object.entries(CATEGORY_CONFIG).map(([k,{icon:I,color}]) => (
        <div key={k} className="flex items-center gap-1"><I className={color} /> {categoryLabels[k]}</div>
      ))}
    </div>
  );
}
