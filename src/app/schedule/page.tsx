"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

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

  // Generate dates for the next 7 days
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-xl text-gray-500">טוען...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">לוח זמנים</h1>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border mb-6 flex flex-wrap gap-4 items-center">
        {/* Date picker */}
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
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span className="text-xs">{dayName}</span>
                <span className="text-lg font-bold">{dayNum}</span>
              </button>
            );
          })}
        </div>

        {/* Type toggle */}
        <div className="flex gap-2 mr-auto">
          <button
            onClick={() => setSelectedType("washer")}
            className={`px-4 py-2 rounded-lg transition font-medium ${
              selectedType === "washer"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            🧺 כביסה
          </button>
          <button
            onClick={() => setSelectedType("dryer")}
            className={`px-4 py-2 rounded-lg transition font-medium ${
              selectedType === "dryer"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            🌀 מייבש
          </button>
        </div>
      </div>

      {/* Schedule Grid */}
      {filteredMachines.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">אין מכונות מסוג זה</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-3 text-right font-medium text-gray-600 sticky right-0 bg-gray-50 min-w-[100px]">
                  שעה
                </th>
                {filteredMachines.map((machine) => (
                  <th
                    key={machine.id}
                    className="p-3 text-center font-medium text-gray-600 min-w-[150px]"
                  >
                    {machine.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slot) => (
                <tr key={slot} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-700 sticky right-0 bg-white">
                    {slot}
                  </td>
                  {filteredMachines.map((machine) => {
                    const booking = getBooking(machine.id, slot);
                    const isMyBooking = booking?.user.id === userId;
                    const isLoading =
                      bookingLoading === `${machine.id}-${slot}`;

                    return (
                      <td key={machine.id} className="p-2 text-center">
                        {booking ? (
                          <div
                            className={`p-2 rounded-lg text-sm ${
                              isMyBooking
                                ? "bg-blue-100 border border-blue-300"
                                : "bg-red-100 border border-red-300"
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
                                className="text-xs text-red-600 hover:underline mt-1"
                              >
                                בטל
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleBook(machine.id, slot)}
                            disabled={isLoading}
                            className="w-full py-2 px-3 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 border border-green-200 transition disabled:opacity-50"
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

      {/* My bookings today */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">ההזמנות שלי להיום</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookings
            .filter((b) => b.user.id === userId && b.date === selectedDate)
            .map((booking) => (
              <div
                key={booking.id}
                className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center"
              >
                <div>
                  <div className="font-bold text-gray-800">
                    {booking.machine.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {booking.machine.type === "washer" ? "🧺 כביסה" : "🌀 מייבש"}{" "}
                    | שעה {booking.timeSlot}
                  </div>
                </div>
                <button
                  onClick={() => handleCancel(booking.id)}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
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
