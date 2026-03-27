"use client";

import type { GuardDutyState } from "./useGuardDutyState";

export function useGuardDutyExport(
  state: GuardDutyState,
  t: Record<string, any>,
) {
  const { date, table } = state;

  const handleExportAllXlsx = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    for (const tp of ["guard", "obs"] as const) {
      const res = await fetch(`/api/guard-duty?date=${date}&type=${tp}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.table) continue;

      const tbl = data.table;
      const roles: string[] = JSON.parse(tbl.roles);
      const slots: string[] = JSON.parse(tbl.timeSlots);

      const header = [t.guardDuty.shift, ...roles];
      const rows = slots.map((slot: string) => {
        const row: Record<string, string> = { [t.guardDuty.shift]: slot };
        roles.forEach(role => {
          const found = tbl.assignments.filter((a: { timeSlot: string; role: string; note?: string; user: { name: string } }) => a.timeSlot === slot && a.role === role);
          row[role] = found.map((a: { note?: string; user: { name: string } }) => a.note ? `${a.note} ${a.user.name}` : a.user.name).join(", ");
        });
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(rows, { header });
      ws["!cols"] = header.map(() => ({ wch: 18 }));
      XLSX.utils.book_append_sheet(wb, ws, tbl.title);
    }

    if (wb.SheetNames.length > 0) {
      XLSX.writeFile(wb, `תורנויות_${date}.xlsx`);
    }
  };

  const handleExportXlsx = async () => {
    if (!table) return;
    const XLSX = await import("xlsx");
    const roles: string[] = JSON.parse(table.roles);
    const slots: string[] = JSON.parse(table.timeSlots);

    const header = [t.guardDuty.shift, ...roles];
    const rows = slots.map(slot => {
      const row: Record<string, string> = { [t.guardDuty.shift]: slot };
      roles.forEach(role => {
        const found = table.assignments.filter(a => a.timeSlot === slot && a.role === role);
        row[role] = found.map(a => a.note ? `${a.note} ${a.user.name}` : a.user.name).join(", ");
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows, { header });
    ws["!cols"] = header.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, table.title);
    XLSX.writeFile(wb, `${table.title}_${table.date}.xlsx`);
  };

  return { handleExportXlsx, handleExportAllXlsx };
}
