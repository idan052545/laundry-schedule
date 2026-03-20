"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  MdLocalHospital, MdCheckCircle, MdCancel, MdAccessTime,
  MdWarning, MdSend, MdAdminPanelSettings, MdThumbUp, MdThumbDown,
} from "react-icons/md";
import { InlineLoading } from "@/components/LoadingScreen";
import { useLanguage } from "@/i18n";

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
  const { t, dateLocale } = useLanguage();
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
      alert(err.error || t.chopal.errorGeneric);
    }
    setSubmitting(false);
  };

  const handleCancel = async () => {
    if (!data?.myRequest) return;
    if (!confirm(t.chopal.cancelChopalConfirm)) return;
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
    else alert(t.chopal.errorApprove);
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
    } else alert(t.chopal.errorReject);
    setResponding(false);
  };

  if (status === "loading" || loading) return <InlineLoading />;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" });
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
        <h1 className="text-2xl font-bold text-gray-800">{t.chopal.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{t.chopal.registerForDate} {data ? formatDate(data.date) : "..."}</p>
      </div>

      {/* Status Banner */}
      {!data?.isOpen && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <MdWarning className="text-red-500 text-xl shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-700">{t.chopal.registrationClosed}</p>
            <p className="text-xs text-red-600">{t.chopal.closedDesc}</p>
          </div>
        </div>
      )}

      {data?.isOpen && !registered && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <MdAccessTime className="text-amber-500 text-xl shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-700">{t.chopal.openUntil}</p>
            <p className="text-xs text-amber-600">{t.chopal.lateWarning}</p>
          </div>
        </div>
      )}

      {/* Success animation */}
      {showSuccess && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 mb-4 animate-bounce">
          <MdCheckCircle className="text-green-500 text-xl" />
          <span className="text-sm font-bold text-green-700">{t.chopal.registeredSuccess}</span>
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
              <h2 className="text-lg font-bold text-green-700">{t.chopal.registeredForChopal}</h2>
              <p className="text-xs text-gray-500 mt-1">
                {t.chopal.registeredAt}{new Date(data!.myRequest!.createdAt).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
              </p>
            </div>

            {data!.myRequest!.note && (
              <div className="bg-white rounded-xl border border-green-200 p-3 mb-4">
                <p className="text-xs text-gray-500 mb-1 font-medium">{t.chopal.yourNote}</p>
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
                      <span className="text-sm font-bold text-amber-700">{t.chopal.appointmentSet}</span>
                    </div>
                    <p className="text-2xl font-black text-amber-800 text-center my-3">{assignment.assignedTime}</p>
                    <p className="text-xs text-amber-600 text-center mb-4">{t.chopal.doesItFit}</p>
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
                            {t.chopal.approve}
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowRejectForm(true)}
                        disabled={responding}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm shadow hover:bg-red-600 transition disabled:opacity-50"
                      >
                        <MdThumbDown className="text-lg" />
                        {t.chopal.notFit}
                      </button>
                    </div>

                    {showRejectForm && (
                      <div className="mt-3">
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder={t.chopal.rejectReason}
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
                            {responding ? t.common.sending : t.chopal.sendReject}
                          </button>
                          <button
                            onClick={() => { setShowRejectForm(false); setRejectReason(""); }}
                            className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                          >
                            {t.common.cancel}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {assignment.status === "accepted" && (
                  <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center">
                    <MdCheckCircle className="text-3xl text-green-500 mx-auto mb-1" />
                    <p className="text-sm font-bold text-green-700">{t.chopal.appointmentApproved}</p>
                    <p className="text-2xl font-black text-green-800 my-2">{assignment.assignedTime}</p>
                    <p className="text-xs text-green-600">{t.chopal.addedToSchedule}</p>
                  </div>
                )}

                {assignment.status === "rejected" && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 text-center">
                    <MdCancel className="text-3xl text-red-400 mx-auto mb-1" />
                    <p className="text-sm font-bold text-red-700">{t.chopal.appointmentRejected}</p>
                    <p className="text-lg font-bold text-red-600 line-through my-1">{assignment.assignedTime}</p>
                    {assignment.rejectReason && (
                      <p className="text-xs text-red-500 mt-1">{assignment.rejectReason}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">{t.chopal.willReschedule}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-center text-gray-500 mb-4">
                {t.chopal.waitingForAppointment}
              </p>
            )}

            {data?.isOpen && (
              <button
                onClick={handleCancel}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition text-sm font-medium disabled:opacity-50"
              >
                <MdCancel className="text-lg" />
                {t.chopal.cancelRegistration}
              </button>
            )}
          </>
        ) : (
          <>
            {/* Registration form */}
            <h2 className="text-lg font-bold text-gray-800 mb-1">{t.chopal.doYouNeedChopal}</h2>
            <p className="text-xs text-gray-500 mb-4">{t.chopal.clickToRegister}</p>

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                {t.chopal.additionalNote}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.chopal.notePlaceholder}
                className="w-full rounded-xl border border-gray-200 p-3 text-sm resize-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 transition"
                rows={3}
                maxLength={200}
              />
              <div className="text-[10px] text-gray-400 text-end mt-0.5" dir="ltr">{note.length}/200</div>
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
                  {t.chopal.iNeedChopal}
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Info card */}
      <div className="mt-4 bg-gray-50 rounded-xl border border-gray-100 p-4">
        <h3 className="text-xs font-bold text-gray-600 mb-2">{t.chopal.howItWorks}</h3>
        <ul className="space-y-1.5 text-xs text-gray-500">
          <li className="flex items-start gap-1.5">
            <span className="text-rose-400 mt-0.5">●</span>
            {t.chopal.howStep1}
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-rose-400 mt-0.5">●</span>
            {t.chopal.howStep2}
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-rose-400 mt-0.5">●</span>
            {t.chopal.howStep3}
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-rose-400 mt-0.5">●</span>
            {t.chopal.howStep4}
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-rose-400 mt-0.5">●</span>
            {t.chopal.howStep5}
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
          {t.chopal.adminTitle}
        </button>
      )}
    </div>
  );
}
