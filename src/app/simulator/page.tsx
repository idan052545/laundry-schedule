"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { InlineLoading } from "@/components/LoadingScreen";
import { useLanguage } from "@/i18n";
import { Scenario, SimSession } from "./types";
import { ScenarioList } from "./ScenarioList";
import { ScenarioForm } from "./ScenarioForm";
import { ChatSimulation } from "./ChatSimulation";
import { VoiceSimulation } from "./VoiceSimulation";
import { SessionHistory } from "./SessionHistory";
import { FeedbackView } from "./FeedbackView";

export default function SimulatorPage() {
  const { t } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [view, setView] = useState<"list" | "create" | "edit" | "session" | "history" | "feedback">("list");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [sessions, setSessions] = useState<SimSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [activeSession, setActiveSession] = useState<SimSession | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const userName = session?.user?.name || "";
  const firstName = userName.split(" ")[0];

  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const isSimulatorRole = userRole === "simulator" || userRole === "simulator-admin";
  const isNameAllowed = ["עידן חן סימנטוב", "דולב כהן"].includes(session?.user?.name || "");
  const canManageScenarios = isNameAllowed || userRole === "simulator-admin";

  // Check access: allowed by name, or by simulator/simulator-admin role
  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      if (!isNameAllowed && !isSimulatorRole) {
        router.push("/dashboard");
        return;
      }
      setIsAdmin(canManageScenarios);
      fetchData();
    }
  }, [status, router, session]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [scenRes, sessRes] = await Promise.all([
      fetch("/api/sim-scenarios"),
      fetch("/api/sim-sessions"),
    ]);
    if (scenRes.ok) setScenarios(await scenRes.json());
    if (sessRes.ok) setSessions(await sessRes.json());
    setLoading(false);
  }, []);

  if (status === "loading" || loading) return <InlineLoading />;
  if (!isAdmin) return null;

  return (
    <div>
      {view === "list" && (
        <ScenarioList
          scenarios={scenarios}
          sessions={sessions}
          isAdmin={isAdmin}
          onSelect={(s) => { setSelectedScenario(s); }}
          onStart={async (s, mode) => {
            setSelectedScenario(s);
            const res = await fetch("/api/sim-sessions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ scenarioId: s.id, mode }),
            });
            if (res.ok) {
              const sess = await res.json();
              setActiveSession(sess);
              setView("session");
            }
          }}
          onCreate={() => setView("create")}
          onEdit={(s) => { setSelectedScenario(s); setView("edit"); }}
          onDelete={async (id) => {
            if (!confirm(t.simulator.deleteConfirm)) return;
            await fetch(`/api/sim-scenarios?id=${id}`, { method: "DELETE" });
            fetchData();
          }}
          onHistory={() => setView("history")}
          onViewFeedback={(sess) => { setActiveSession(sess); setView("feedback"); }}
        />
      )}
      {view === "create" && (
        <ScenarioForm
          onBack={() => { setView("list"); fetchData(); }}
          onSave={async (data) => {
            await fetch("/api/sim-scenarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
            setView("list");
            fetchData();
          }}
        />
      )}
      {view === "edit" && selectedScenario && (
        <ScenarioForm
          scenario={selectedScenario}
          onBack={() => { setView("list"); fetchData(); }}
          onSave={async (data) => {
            await fetch("/api/sim-scenarios", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selectedScenario.id, ...data }) });
            setView("list");
            fetchData();
          }}
        />
      )}
      {view === "session" && activeSession && selectedScenario && (
        activeSession.mode === "voice" ? (
          <VoiceSimulation
            simSession={activeSession}
            scenario={selectedScenario}
            commander={userName}
            firstName={firstName}
            onEnd={async (sess) => {
              setActiveSession(sess);
              setView("feedback");
              fetchData();
            }}
            onBack={() => { setView("list"); fetchData(); }}
          />
        ) : (
          <ChatSimulation
            simSession={activeSession}
            scenario={selectedScenario}
            commander={userName}
            firstName={firstName}
            onEnd={async (sess) => {
              setActiveSession(sess);
              setView("feedback");
              fetchData();
            }}
            onBack={() => { setView("list"); fetchData(); }}
          />
        )
      )}
      {view === "history" && (
        <SessionHistory
          sessions={sessions}
          onBack={() => setView("list")}
          onViewFeedback={(sess) => { setActiveSession(sess); setView("feedback"); }}
        />
      )}
      {view === "feedback" && activeSession && (
        <FeedbackView
          session={activeSession}
          onBack={() => { setView("list"); fetchData(); }}
        />
      )}
    </div>
  );
}
