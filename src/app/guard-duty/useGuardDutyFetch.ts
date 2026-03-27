"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toDateStr } from "./constants";
import type { GuardDutyState } from "./useGuardDutyState";

export function useGuardDutyFetch(
  state: GuardDutyState,
  authStatus: string,
) {
  const router = useRouter();
  const {
    date, tableType, initialDateSet,
    setTable, setAllUsers, setIsRoni, setIsCreator,
    setAppeals, setHoursMap, setDayType, setAvailableDates,
    setOtherTable, setInitialDateSet, setDate, setLoading,
  } = state;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/guard-duty?date=${date}&type=${tableType}`);
    if (res.ok) {
      const data = await res.json();
      setTable(data.table);
      setAllUsers(data.allUsers);
      setIsRoni(data.isRoni);
      setIsCreator(data.isCreator || false);
      setAppeals(data.appeals);
      setHoursMap(data.hoursMap);
      if (data.dayType) setDayType(data.dayType);
      if (data.availableDates) setAvailableDates(data.availableDates);

      const otherType = tableType === "guard" ? "obs" : tableType === "obs" ? "guard" : null;
      if (otherType) {
        fetch(`/api/guard-duty?date=${date}&type=${otherType}`).then(r => r.ok ? r.json() : null).then(d => {
          setOtherTable(d?.table || null);
        }).catch(() => setOtherTable(null));
      } else {
        setOtherTable(null);
      }

      if (!initialDateSet && !data.table && data.availableDates?.length > 0) {
        const today = toDateStr(new Date());
        const sorted = [...data.availableDates].sort((a: string, b: string) =>
          Math.abs(new Date(a).getTime() - new Date(today).getTime()) -
          Math.abs(new Date(b).getTime() - new Date(today).getTime())
        );
        setInitialDateSet(true);
        setDate(sorted[0]);
        return;
      }
      setInitialDateSet(true);
    }
    setLoading(false);
  }, [date, tableType, initialDateSet]);

  useEffect(() => {
    if (authStatus === "unauthenticated") { router.push("/login"); return; }
    if (authStatus === "authenticated") fetchData();
  }, [authStatus, router, fetchData]);

  const changeDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(toDateStr(d));
  };

  return { fetchData, changeDate };
}
