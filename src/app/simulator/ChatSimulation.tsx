"use client";

import { useState, useEffect, useRef } from "react";
import {
  MdSend, MdArrowBack, MdStop, MdCheckCircle,
  MdPerson, MdSmartToy,
} from "react-icons/md";
import { useLanguage } from "@/i18n";
import { Scenario, SimSession, ChatMessage } from "./types";
import { buildSimulationIntroPrompt, buildChatSystemPrompt, buildScorePrompt, buildFeedbackPrompt } from "./prompts";

export function ChatSimulation({ simSession, scenario, commander, firstName, onEnd, onBack }: {
  simSession: SimSession;
  scenario: Scenario;
  commander: string;
  firstName: string;
  onEnd: (session: SimSession) => void;
  onBack: () => void;
}) {
  const { t } = useLanguage();
  const MAX_MESSAGES_PER_SESSION = 60; // Safety: max 60 messages (30 turns)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [introText, setIntroText] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [chatError, setChatError] = useState("");
  const completingRef = useRef(false); // Prevent double completion
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const systemPrompt = buildChatSystemPrompt(scenario, commander, firstName);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => { generateIntro(); }, []);

  const generateIntro = async () => {
    setGenerating(true);
    setChatError("");
    try {
      const res = await fetch("/api/sim-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt: buildSimulationIntroPrompt(scenario, commander), message: "תאר את רקע הסימולציה", mode: "chat" }),
      });
      if (res.ok) { const data = await res.json(); setIntroText(data.response); }
      else { const err = await res.json(); setChatError(err.error || `${t.simulator.error} ${res.status}`); }
    } catch (e) { console.error("Failed to generate intro:", e); setChatError(t.simulator.connectionError); }
    setGenerating(false);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending || isCompleted) return;
    if (messages.length >= MAX_MESSAGES_PER_SESSION) {
      setChatError(t.simulator.maxMessagesReached.replace("{n}", String(MAX_MESSAGES_PER_SESSION)));
      if (!completingRef.current) completeSimulation(messages);
      return;
    }
    const userMsg: ChatMessage = { role: "user", content: text.trim(), timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setSending(true);
    setChatError("");

    try {
      const historyForApi = newMessages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/sim-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, history: historyForApi.slice(0, -1), message: text.trim(), mode: "chat" }),
      });
      if (res.ok) {
        const data = await res.json();
        const aiMsg: ChatMessage = { role: "assistant", content: data.response, timestamp: Date.now() };
        const updatedMessages = [...newMessages, aiMsg];
        setMessages(updatedMessages);
        await fetch("/api/sim-sessions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: simSession.id, messages: JSON.stringify(updatedMessages) }) });
        if (data.response.includes("כל הכבוד") && data.response.includes("סיימת את הסימולציה")) {
          await completeSimulation(updatedMessages);
        }
      } else {
        const err = await res.json();
        setChatError(err.error || `${t.simulator.error} ${res.status}`);
      }
    } catch (e) { console.error("Failed to send message:", e); setChatError(t.simulator.connectionError); }
    setSending(false);
  };

  const completeSimulation = async (msgs: ChatMessage[]) => {
    if (completingRef.current) return; // Prevent double completion
    completingRef.current = true;
    setIsCompleted(true);
    setGenerating(true);
    const messagesJson = msgs.map(m => `${m.role === "user" ? "אתה" : scenario.machineName}: ${m.content}`).join("\n");
    const [scoreRes, feedbackRes] = await Promise.all([
      fetch("/api/sim-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemPrompt: buildScorePrompt(scenario, commander, messagesJson), message: "ספק ציון מספרי", mode: "score" }) }),
      fetch("/api/sim-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemPrompt: buildFeedbackPrompt(scenario, commander, messagesJson, "chat"), message: "שלח ביקורת מקיפה", mode: "feedback" }) }),
    ]);
    let score = 0, feedback = "";
    if (scoreRes.ok) { const d = await scoreRes.json(); const p = parseInt(d.response?.replace(/\D/g, "")); if (!isNaN(p)) score = Math.min(100, Math.max(0, p)); }
    if (feedbackRes.ok) { const d = await feedbackRes.json(); feedback = d.response; }
    const grade = score >= 60 ? "עובר" : "לא עובר";
    const updRes = await fetch("/api/sim-sessions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: simSession.id, status: "completed", messages: JSON.stringify(msgs), score, feedback, grade }) });
    if (updRes.ok) { const updated = await updRes.json(); setGenerating(false); onEnd(updated); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="bg-gradient-to-l from-teal-600 to-teal-700 text-white rounded-t-xl p-3 sm:p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => { if (confirm(t.simulator.exitConfirm)) onBack(); }} className="text-white/80 hover:text-white"><MdArrowBack className="text-xl" /></button>
          <div>
            <h2 className="font-bold text-sm sm:text-base">{scenario.title}</h2>
            <div className="text-[10px] sm:text-xs text-white/70 flex items-center gap-2"><span>{t.simulator.chatSimulation}</span><span>•</span><span>{t.simulator.difficulty}: {scenario.difficulty}/10</span></div>
          </div>
        </div>
        <button onClick={() => { if (confirm(t.simulator.endConfirm)) completeSimulation(messages); }} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition"><MdStop className="inline" /> {t.simulator.end}</button>
      </div>

      {chatError && (
        <div className="bg-red-50 border-b border-red-200 p-3 text-center">
          <p className="text-sm text-red-700 font-medium">{chatError}</p>
          <button onClick={() => { setChatError(""); generateIntro(); }} className="text-xs text-red-500 underline mt-1">{t.simulator.tryAgain}</button>
        </div>
      )}

      {introText && (
        <div className="bg-gray-50 border-b p-3 sm:p-4">
          <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-800 text-sm mb-2">{t.simulator.scenarioBackground}</h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{introText}</p>
          </div>
          {generating && <p className="text-xs text-gray-400 mt-2 text-center">{t.simulator.preparingSimulation}</p>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${msg.role === "user" ? "bg-dotan-green-dark text-white rounded-tr-none" : "bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm"}`}>
              <div className="text-xs mb-1 opacity-60 flex items-center gap-1">
                {msg.role === "user" ? <><MdPerson className="text-xs" /> {t.simulator.you}:</> : <><MdSmartToy className="text-xs" /> {scenario.machineName}:</>}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              <div className="text-[10px] mt-1 opacity-40 text-end" dir="ltr">{new Date(msg.timestamp).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-end">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {!isCompleted && (
        <div className="bg-white border-t p-3 rounded-b-xl">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
            <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} placeholder={t.simulator.typeMessage}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-dotan-green outline-none" disabled={sending} autoFocus />
            <button type="submit" disabled={!input.trim() || sending}
              className="bg-dotan-green-dark text-white px-4 py-3 rounded-xl hover:bg-dotan-green transition font-medium flex items-center gap-1 disabled:opacity-50"><MdSend /></button>
          </form>
        </div>
      )}

      {isCompleted && (
        <div className="bg-green-50 border-t border-green-200 p-4 text-center rounded-b-xl">
          <MdCheckCircle className="text-green-500 text-3xl mx-auto mb-2" />
          <p className="text-green-700 font-bold">{t.simulator.simulationEnded}</p>
          {generating && <p className="text-xs text-gray-500 mt-1">{t.simulator.preparingFeedback}</p>}
        </div>
      )}
    </div>
  );
}
