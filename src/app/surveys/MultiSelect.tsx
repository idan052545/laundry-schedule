"use client";

import { useState } from "react";
import { MdCheckBox, MdSend } from "react-icons/md";

export default function MultiSelect({ options, selected, onSubmit }: { options: string[]; selected: number[]; onSubmit: (sel: number[]) => void }) {
  const [local, setLocal] = useState<number[]>(selected);

  const toggle = (i: number) => {
    setLocal((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  };

  return (
    <div className="space-y-2">
      {options.map((opt, i) => (
        <button key={i} type="button" onClick={() => toggle(i)}
          className={`w-full text-right p-3 rounded-lg text-sm transition flex items-center gap-2 ${
            local.includes(i) ? "bg-dotan-green-dark text-white" : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
          }`}>
          <MdCheckBox className={local.includes(i) ? "text-white" : "text-gray-300"} />
          {opt}
        </button>
      ))}
      <button onClick={() => onSubmit(local)}
        className="w-full bg-dotan-green-dark text-white py-2.5 rounded-lg font-medium text-sm hover:bg-dotan-green transition flex items-center justify-center gap-2">
        <MdSend /> שלח
      </button>
    </div>
  );
}
