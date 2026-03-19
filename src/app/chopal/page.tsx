"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  MdLocalHospital, MdCheckCircle, MdCancel, MdAccessTime,
  MdWarning, MdSend, MdAdminPanelSettings, MdThumbUp, MdThumbDown,
} from "react-icons/md";
import { InlineLoading } from "@/components/LoadingScreen";

interface ChopalAssignment {
  id: string;
  assignedTime: string;
  status: "pending" | "accepted" | "rejected";
  rejectReason: string | null;
}

interface ChopalData {
  date: string;
  myRequest: {
    id: string;
    needed: boolean;
    note: string | null;
    createdAt: string;
    assignment: ChopalAssignment | null;
  } | null;
  isOpen: boolean;
  isAdmin: boolean;
}

export default function ChopalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ChopalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [responding, setResponding] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/chopal");
    if (res.ok) {
      const d = await res.json();
      setData(d);
      if (d.myRequest?.note) setNote(d.myRequest.note);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") fetchData();
  }, [status, router, fetchData]);

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await fetch("/api/chopal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note.trim() || null }),
    });
    if (res.ok) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      await fetchData();
    } else {
      const err = await res.json();
      alert(err.error || "שגיאה");
    }
    setSubmitting(false);
  };

  const handleCancel = async () => {
    if (!data?.myRequest) return;
    if (!confirm("לבטל את ההרשמה לחופ\"ל?")) return;
    setSubmitting(true);
    const res = await fetch(`/api/chopal?id=${data.myRequest.id}`, { method: "DELETE" });
    if (res.ok) {
      setNote("");
      await fetchData();
    }
    setSubmitting(false);
  };

  const handleAccept = async () => {
    if (!data?.myRequest?.assignment) return;
    setResponding(true);
    const res = await fetch("/api/chopal/assign", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId: data.myRequest.assignment.id, action: "accept" }),
    });
    if (res.ok) await fetchData();
    else alert("שגיאה באישור");
    setResponding(false);
  };

  const handleReject = async () => {
    if (!data?.myRequest?.assignment) return;
    setResponding(true);
    const res = await fetch("/api/chopal/assign", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignmentId: data.myRequest.assignment.id,
        action: "reject",
        reason: rejectReason.trim() || null,
      }),
    });
    if (res.ok) {
      setShowRejectForm(false);
      setRejectReason("");
      await fetchData();
    } else alert("שגיאה בדחייה");
    setResponding(false);
  };

  if (status === "loading" || loading) return <InlineLoading />;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
  };

  const registered = !!data?.myRequest;
  const assignment = data?.myRequest?.assignment;

  return (
    <div className="max-w-lg mx-auto pb-20">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 shadow-lg mb-3">
          <MdLocalHospital className="text-3xl text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">מסדר חופ&quot;ל</h1>
        <p className="text-sm text-gray-500 mt-1">הרשמה לתור חופ&quot;ל ליום {data ? formatDate(data.date) : "..."}</p>
      </div>

      {/* Status Banner */}
      {!data?.isOpen && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <MdWarning className="text-red-500 text-xl shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-700">ההרשמה נסגרה</p>
            <p className="text-xs text-red-600">ההרשמה סגורה לאחר השעה 21:00. לאירועים חריגים פנה/י לממ&quot;שים או לנעמה.</p>
          </div>
        </div>
      )}

      {data?.isOpen && !registered && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <MdAccessTime className="text-amber-500 text-xl shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-700">ההרשמה פתוחה עד 21:00</p>
            <p className="text-xs text-amber-600">חייל/ת שלא ירשם/ה בזמן יצטרך/תצטרך לחכות למסדר חופ&quot;ל של מחר.</p>
          </div>
        </div>
      )}

      {/* Success animation */}
      {showSuccess && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 mb-4 animate-bounce">
          <MdCheckCircle className="text-green-500 text-xl" />
          <span className="text-sm font-bold text-green-700">נרשמת בהצלחה!</span>
        </div>
      )}

      {/* Main Card */}
      <div className={`rounded-2xl border-2 transition-all ${
        registered
          ? "border-green-300 bg-green-50/50"
          : "border-gray-200 bg-white"
      } p-5 shadow-sm`}>
        {registered ? (
          <>
            {/* Already registered */}
            <div className="text-center mb-4">
              <MdCheckCircle className="text-5xl text-green-500 mx-auto mb-2" />
              <h2 className="text-lg font-bold text-green-700">נרשמת לחופ&quot;ל!</h2>
              <p className="text-xs text-gray-500 mt-1">
                נרשמת ב-{new Date(data!.myRequest!.createdAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
              </p>
            </div>

            {data!.myRequest!.note && (
              <div className="bg-white rounded-xl border border-green-200 p-3 mb-4">
                <p className="text-xs text-gray-500 mb-1 font-medium">ההערה שלך:</p>
                <p className="text-sm text-gray-700">{data!.myRequest!.note}</p>
              </div>
            )}

            {/* Assignment section */}
            {assignment ? (
              <div className="mb-4">
                {assignment.status === "pending" && (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MdAccessTime className="text-xl text-amber-600" />
                      <span className="text-sm font-bold text-amber-700">התור שלך נקבע!</span>
                    </div>
                    <p className="text-2xl font-black text-amber-800 text-center my-3">{assignment.assignedTime}</p>
                    <p className="text-xs text-amber-600 text-center mb-4">האם מתאים לך?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAccept}
                        disabled={responding}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500 text-white font-bold text-sm shadow hover:bg-green-600 transition disabled:opacity-50"
                      >
                        {responding ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <MdThumbUp className="text-lg" />
                            מאשר/ת
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowRejectForm(true)}
                        disabled={responding}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm shadow hover:bg-red-600 transition disabled:opacity-50"
                      >
                        <MdThumbDown className="text-lg" />
                        לא מתאים
                      </button>
                    </div>

                    {showRejectForm && (
                      <div className="mt-3">
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="סיבה / בקשה לשעה אחרת (לא חובה)"
                          className="w-full rounded-xl border border-amber-200 p-3 text-sm resize-none focus:ring-2 focus:ring-red-300 transition"
                          rows={2}
                          maxLength={200}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={handleReject}
                            disabled={responding}
                            className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-bold shadow hover:bg-red-600 transition disabled:opacity-50"
                          >
                            {responding ? "שולח..." : "שלח דחייה"}
                          </button>
                          <button
                            onClick={() => { setShowRejectForm(false); setRejectReason(""); }}
                            className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                          >
                            ביטול
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {assignment.status === "accepted" && (
                  <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center">
                    <MdCheckCircle className="text-3xl text-green-500 mx-auto mb-1" />
                    <p className="text-sm font-bold text-green-700">התור אושר</p>
                    <p className="text-2xl font-black text-green-800 my-2">{assignment.assignedTime}</p>
                    <p className="text-xs text-green-600">התור נוסף ללו&quot;ז שלך</p>
                  </div>
                )}

                {assignment.status === "rejected" && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 text-center">
                    <MdCancel className="text-3xl text-red-400 mx-auto mb-1" />
                    <p className="text-sm font-bold text-red-700">התור נדחה</p>
                    <p className="text-lg font-bold text-red-600 line-through my-1">{assignment.assignedTime}</p>
                    {assignment.rejectReason && (
                      <p className="text-xs text-red-500 mt-1">{assignment.rejectReason}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">נעמה תשבץ לך תור חדש בקרוב</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-center text-gray-500 mb-4">
                ממתין/ה לקביעת שעת תור על ידי נעמה
              </p>
            )}

            {data?.isOpen && (
              <button
                onClick={handleCancel}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition text-sm font-medium disabled:opacity-50"
              >
                <MdCancel className="text-lg" />
                ביטול הרשמה
              </button>
            )}
          </>
        ) : (
          <>
            {/* Registration form */}
            <h2 className="text-lg font-bold text-gray-800 mb-1">האם את/ה צריך/ה חופ&quot;ל מחר?</h2>
            <p className="text-xs text-gray-500 mb-4">לחץ/י להרשמה. ניתן להוסיף הערה.</p>

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                משהו נוסף שתרצה להוסיף? (לא חובה)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="למשל: בדיקת דם, רופא עיניים..."
                className="w-full rounded-xl border border-gray-200 p-3 text-sm resize-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 transition"
                rows={3}
                maxLength={200}
              />
              <div className="text-[10px] text-gray-400 text-left mt-0.5" dir="ltr">{note.length}/200</div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !data?.isOpen}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <MdSend className="text-lg" />
                  אני צריך/ה חופ&quot;ל מחר
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Info card */}
      <div className="mt-4 bg-gray-50 rounded-xl border border-gray-100 p-4">
        <h3 className="text-xs font-bold text-gray-600 mb-2">איך זה עובד?</h3>
        <ul className="space-y-1.5 text-xs text-gray-500">
          <li className="flex items-start gap-1.5">
            <span className="text-rose-400 mt-0.5">●</span>
            כל יום ניתן להירשם לתור חופ&quot;ל ליום המחרת
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-rose-400 mt-0.5">●</span>
            ההרשמה פתוחה עד השעה 21:00
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-rose-400 mt-0.5">●</span>
            נעמה תקבע לך שעת תור — תקבל/י התראה
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-rose-400 mt-0.5">●</span>
            אם השעה לא מתאימה, ניתן לדחות ולבקש שעה אחרת
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-rose-400 mt-0.5">●</span>
            התור יופיע אוטומטית בלו&quot;ז האישי שלך
          </li>
        </ul>
      </div>

      {/* Admin link */}
      {data?.isAdmin && (
        <button
          onClick={() => router.push("/chopal/admin")}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-sm font-medium hover:bg-purple-100 transition"
        >
          <MdAdminPanelSettings className="text-lg" />
          ניהול מסדר חופ&quot;ל
        </button>
      )}
    </div>
  );
}
