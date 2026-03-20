"use client";

import {
  MdLocalLaundryService, MdDry, MdCheckCircle, MdCancel, MdBuild,
} from "react-icons/md";
import type { Machine } from "./types";

interface MachineStatusProps {
  machines: Machine[];
}

export default function MachineStatus({ machines }: MachineStatusProps) {
  const today = new Date().toISOString().split("T")[0];
  const currentHour = new Date().getHours();
  const currentSlot = `${currentHour.toString().padStart(2, "0")}:00`;

  const isMachineAvailable = (machine: Machine) => {
    if (machine.status === "maintenance") return false;
    return !machine.bookings.find((b) => b.date === today && b.timeSlot === currentSlot);
  };

  const getCurrentUser = (machine: Machine) => {
    return machine.bookings.find((b) => b.date === today && b.timeSlot === currentSlot)?.user;
  };

  return (
    <div className="mb-6">
      <h2 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-1.5">
        <MdLocalLaundryService className="text-base" /> מכונות
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {machines.map((machine) => {
          const available = isMachineAvailable(machine);
          const currentUser = getCurrentUser(machine);
          const isWasher = machine.type === "washer";
          return (
            <div key={machine.id} className={`px-3 py-2.5 rounded-xl border transition ${
              machine.status === "maintenance" ? "bg-yellow-50 border-yellow-200"
              : available ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">{machine.name}</span>
                {isWasher ? <MdLocalLaundryService className={`text-base ${available ? "text-green-500" : "text-red-400"}`} /> : <MdDry className={`text-base ${available ? "text-green-500" : "text-red-400"}`} />}
              </div>
              <div className={`text-[10px] font-medium mt-0.5 flex items-center gap-0.5 ${
                machine.status === "maintenance" ? "text-yellow-600" : available ? "text-green-600" : "text-red-500"
              }`}>
                {machine.status === "maintenance" ? <><MdBuild className="text-[10px]" /> תחזוקה</>
                : available ? <><MdCheckCircle className="text-[10px]" /> {isWasher ? "פנויה" : "פנוי"}</>
                : <><MdCancel className="text-[10px]" /> {currentUser?.name || (isWasher ? "תפוסה" : "תפוס")}</>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
