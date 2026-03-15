"use client";

import { InlineLoading } from "@/components/LoadingScreen";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { MdLocalLaundryService, MdDry, MdDelete, MdAccessTime } from "react-icons/md";

interface Machine {
  id: string;
  name: string;
  type: string;
}

interface Booking {
  id: string;
  machineId: string;
  date: string;
  timeSlot: string;
  status: string;
  user: { id: string; name: string; image: string | null; roomNumber: string | null };
  machine: Machine;
}

const TIME_SLOTS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00", "23:00",
];

export default function SchedulePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedType, setSelectedType] = useState<"washer" | "dryer">("washer");
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);

  const userId = session?.user ? (session.user as { id: string }).id : null;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [machinesRes, bookingsRes] = await Promise.all([
      fetch("/api/machines"),
      fetch(`/api/bookings?date=${selectedDate}`),
    ]);

    if (machinesRes.ok) setMachines(await machinesRes.json());
    if (bookingsRes.ok) setBookings(await bookingsRes.json());
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, fetchData]);

  const handleBook = async (machineId: string, timeSlot: string) => {
    setBookingLoading(`${machineId}-${timeSlot}`);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ machineId, date: selectedDate, timeSlot }),
    });

    if (res.ok) {
      await fetchData();
    } else {
      const data = await res.json();
      alert(data.error || "שגיאה בהזמנה");
    }
    setBookingLoading(null);
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm("האם אתה בטוח שברצונך לבטל את ההזמנה?")) return;

    const res = await fetch(`/api/bookings?id=${bookingId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      await fetchData();
    }
  };

  const getBooking = (machineId: string, timeSlot: string) => {
    return bookings.find(
      (b) => b.machineId === machineId && b.timeSlot === timeSlot
    );
  };

  const filteredMachines = machines.filter((m) => m.type === selectedType);

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  if (status === "loading" || loading) {
    return <InlineLoading />;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-dotan-green-dark mb-6">לוח זמנים</h1>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-dotan-mint mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {dates.map((date) => {
            const d = new Date(date + "T00:00:00");
            const dayName = d.toLocaleDateString("he-IL", { weekday: "short" });
            const dayNum = d.getDate();
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center px-4 py-2 rounded-lg min-w-[60px] transition ${
                  selectedDate === date
                    ? "bg-dotan-green-dark text-white"
                    : "bg-dotan-mint-light text-gray-700 hover:bg-dotan-mint"
                }`}
              >
                <span className="text-xs">{dayName}</span>
                <span className="text-lg font-bold">{dayNum}</span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 mr-auto">
          <button
            onClick={() => setSelectedType("washer")}
            className={`px-4 py-2 rounded-lg transition font-medium flex items-center gap-2 ${
              selectedType === "washer"
                ? "bg-dotan-green-dark text-white"
                : "bg-dotan-mint-light text-gray-700 hover:bg-dotan-mint"
            }`}
          >
            <MdLocalLaundryService className="text-lg" />
            כביסה
          </button>
          <button
            onClick={() => setSelectedType("dryer")}
            className={`px-4 py-2 rounded-lg transition font-medium flex items-center gap-2 ${
              selectedType === "dryer"
                ? "bg-dotan-green-dark text-white"
                : "bg-dotan-mint-light text-gray-700 hover:bg-dotan-mint"
            }`}
          >
            <MdDry className="text-lg" />
            מייבש
          </button>
        </div>
      </div>

      {/* Schedule Grid */}
      {filteredMachines.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">אין מכונות מסוג זה</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-dotan-mint overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-dotan-mint-light">
                <th className="p-3 text-right font-medium text-dotan-green-dark sticky right-0 bg-dotan-mint-light min-w-[100px]">
                  שעה
                </th>
                {filteredMachines.map((machine) => (
                  <th
                    key={machine.id}
                    className="p-3 text-center font-medium text-dotan-green-dark min-w-[150px]"
                  >
                    {machine.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slot) => (
                <tr key={slot} className="border-b hover:bg-dotan-mint-light/50">
                  <td className="p-3 font-medium text-gray-700 sticky right-0 bg-white">
                    {slot}
                  </td>
                  {filteredMachines.map((machine) => {
                    const booking = getBooking(machine.id, slot);
                    const isMyBooking = booking?.user.id === userId;
                    const isLoading = bookingLoading === `${machine.id}-${slot}`;

                    return (
                      <td key={machine.id} className="p-2 text-center">
                        {booking ? (
                          <div
                            className={`p-2 rounded-lg text-sm ${
                              isMyBooking
                                ? "bg-dotan-mint border border-dotan-green"
                                : "bg-red-50 border border-red-300"
                            }`}
                          >
                            <div className="font-medium">
                              {isMyBooking ? "ההזמנה שלי" : booking.user.name}
                            </div>
                            {booking.user.roomNumber && (
                              <div className="text-xs text-gray-500">
                                חדר {booking.user.roomNumber}
                              </div>
                            )}
                            {isMyBooking && (
                              <button
                                onClick={() => handleCancel(booking.id)}
                                className="text-xs text-red-600 hover:underline mt-1 flex items-center gap-1 mx-auto"
                              >
                                <MdDelete /> בטל
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleBook(machine.id, slot)}
                            disabled={isLoading}
                            className="w-full py-2 px-3 text-sm bg-dotan-mint-light text-dotan-green-dark rounded-lg hover:bg-dotan-mint border border-dotan-green/30 transition disabled:opacity-50 font-medium"
                          >
                            {isLoading ? "..." : "הזמן"}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* My bookings */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-dotan-green-dark mb-4">ההזמנות שלי</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookings
            .filter((b) => b.user.id === userId && b.date === selectedDate)
            .map((booking) => (
              <div
                key={booking.id}
                className="bg-white p-4 rounded-xl shadow-sm border border-dotan-mint flex justify-between items-center"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl text-dotan-green">
                    {booking.machine.type === "washer" ? <MdLocalLaundryService /> : <MdDry />}
                  </div>
                  <div>
                    <div className="font-bold text-gray-800">
                      {booking.machine.name}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <MdAccessTime />
                      שעה {booking.timeSlot}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleCancel(booking.id)}
                  className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1"
                >
                  <MdDelete />
                  בטל הזמנה
                </button>
              </div>
            ))}
          {bookings.filter((b) => b.user.id === userId && b.date === selectedDate)
            .length === 0 && (
            <div className="text-gray-500 col-span-2">
              אין לך הזמנות לתאריך זה
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
