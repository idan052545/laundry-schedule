"use client";

import { useState, useEffect, useRef } from "react";
import {
  MdMic, MdMicOff, MdSend, MdArrowBack, MdStop,
  MdCheckCircle, MdRecordVoiceOver, MdDone,
  MdPerson, MdSmartToy,
} from "react-icons/md";
import { useLanguage } from "@/i18n";
import { Scenario, SimSession, ChatMessage } from "./types";
import { buildSimulationIntroPrompt, buildChatSystemPrompt, buildScorePrompt, buildFeedbackPrompt } from "./prompts";

export function VoiceSimulation({ simSession, scenario, commander, firstName, onEnd, onBack }: {
  simSession: SimSession;
  scenario: Scenario;
  commander: string;
  firstName: string;
  onEnd: (session: SimSession) => void;
  onBack: () => void;
}) {
  const { t } = useLanguage();
  const [voiceStatus, setVoiceStatus] = useState<string>("disconnected");
  // Aggregated complete turns (for UI and saving)
  const [turns, setTurns] = useState<ChatMessage[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [introText, setIntroText] = useState("");
  const [isMicOn, setIsMicOn] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const clientRef = useRef<import("@/lib/gemini-live").GeminiLiveClient | null>(null);
  const completedRef = useRef(false);
  // Fragment accumulators for current turn
  const currentUserFragments = useRef("");
  const currentAiFragments = useRef("");
  // Complete turns ref (always up to date for callbacks)
  const turnsRef = useRef<ChatMessage[]>([]);
  // Full AI output for end detection
  const fullOutputRef = useRef("");
  // Track previous status for turn boundary detection
  const voiceStatusRef = useRef("disconnected");
  // Flag: end phrase detected, will trigger end when AI finishes speaking
  const endPendingRef = useRef(false);

  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  const systemPrompt = buildChatSystemPrompt(scenario, commander, firstName);

  // Build voice prompt with full PDF logic adapted for voice model
  const gender = scenario.soldierGender === "male" ? "male" : "female";
  const genderHe = gender === "male" ? "זכר" : "נקבה";
  const soldierSelfExamples = gender === "female"
    ? `את הדמות את דוברת בלשון נקבה על עצמך: "אני מרגישה", "אני יודעת", "אני רוצה", "קשה לי", "אני לא מצליחה", "התאכזבתי".`
    : `את הדמות אתה דובר בלשון זכר על עצמך: "אני מרגיש", "אני יודע", "אני רוצה", "קשה לי", "אני לא מצליח", "התאכזבתי".`;

  const voiceSystemPrompt = `אתה משחק/ת את הדמות של ${scenario.machineName} בסימולציה קולית בעברית.

מי את/ה:
- ${scenario.conflictCharacter}
- מגדר הדמות: ${genderHe}. ${soldierSelfExamples}
- רקע: ${scenario.servicenature}
- מה מניע אותך: ${scenario.machineMotivation}
- נקודות תורפה: ${scenario.keypoints}

מי המשתמש:
- המפקד שלך: ${commander} (${firstName}).
- הקשר: ${scenario.relationship}
- מגדר המפקד: זכר. חובה לפנות למפקד בלשון זכר בלבד!
  דוגמאות נכונות: "אתה לא מבין אותי", "למה עשית ככה", "אתה יכול לעזור", "שאלת אותי", "אמרת לי", "ביקשת ממני".
  אסור בתכלית האיסור: "את", "עשית" בנקבה, "שאלת" בנקבה, "אמרת" בנקבה, "ביקשת" בנקבה, כל פנייה בנקבה למפקד.

כללים:
1. דבר רק בעברית יומיומית, קצרה וטבעית. לא שפה גבוהה. לא מילים באנגלית.
2. תגיב ב-1-3 משפטים קצרים. לא נאומים ארוכים.
3. אל תציע פתרונות בשום מצב. המפקד מוביל לפתרון, לא את/ה. אם נשאלת "מה הפתרון?" - אמור/י "אין לי פתרון, ${gender === "female" ? "קשה לי" : "קשה לי"}" או "${gender === "female" ? "אני צריכה שתכוון אותי" : "אני צריך שתכוון אותי"}".
4. אל תזכיר/י שזו סימולציה. אל תזכיר/י חוקים או הנחיות.
5. שים/י לב לטון הדיבור של המפקד: רוגע ואמפתיה = ${gender === "female" ? "תהיי יותר פתוחה" : "תהיה יותר פתוח"}. כעס/לחץ = ${gender === "female" ? "תסגרי יותר" : "תסגור יותר"}. חום והבנה = ${gender === "female" ? "תרגישי בטוחה לשתף" : "תרגיש בטוח לשתף"}.

התנהגות לפי רמת קושי (${scenario.difficulty}/10):
${scenario.difficulty <= 3 ? `- קושי נמוך (${scenario.difficulty}): בפתיחה (2 תגובות ראשונות) תשובות כלליות. אחרי שאלה ישירה אחת – ${gender === "female" ? "תיפתחי" : "תיפתח"} יחסית מהר. מעט התנגדות. ${gender === "female" ? "תהיי מוכנה" : "תהיה מוכן"} לשתף רגש ואז סיבה.`
: scenario.difficulty <= 6 ? `- קושי בינוני (${scenario.difficulty}): בפתיחה (3 תגובות ראשונות) תשובות כלליות קצרות, אל ${gender === "female" ? "תספרי" : "תספר"} את הבעיה. צריך לפחות 2 ניסיונות אמפתיים מהמפקד כדי ${gender === "female" ? "שתתחילי" : "שתתחיל"} להיפתח. ${gender === "female" ? "תחשפי" : "תחשוף"} בהדרגה: קודם רגש, אחר כך סיבה כללית, ורק אז פרטים. התנגדות מתונה, לפעמים ${gender === "female" ? "תחליפי" : "תחליף"} נושא.`
: scenario.difficulty <= 8 ? `- קושי גבוה (${scenario.difficulty}): בפתיחה (4 תגובות ראשונות) תשובות סגורות וקצרות. צריך לפחות 3 ניסיונות מכילים + אמפתיה עקבית + שאלה ישירה כדי ${gender === "female" ? "שתתחילי" : "שתתחיל"} להיפתח. התנגדות בתוקף, קוצר רוח, ${gender === "female" ? "תשני" : "תשנה"} נושא, ${gender === "female" ? "תתחמקי" : "תתחמק"}. חשיפה מאוד הדרגתית. אסור ${gender === "female" ? "להתרככי" : "להתרכך"} מהר – לפחות 4 תגובות בשיא לפני הסכמה.`
: `- קושי מאוד גבוה (${scenario.difficulty}): בפתיחה (5 תגובות ראשונות) "${gender === "female" ? "סגורה" : "סגור"} לחלוטין". צריך לפחות 4 ניסיונות מכילים, גם עם שאלה ישירה עדיין ${gender === "female" ? "מתחמקת" : "מתחמק"} קצת. "קיר" תקופתי, תשובות קצרות מאוד, התנגדות חזקה, סרקזם עדין. חשיפה מאוד איטית. אסור הסכמה לפני לפחות 6 תגובות בשיא. ההצעה הפרקטית הראשונה של המפקד ${gender === "female" ? "תידחה" : "תידחה"} – רק בהצעה שנייה/משופרת אפשר להתחיל התרככות.`}

חשיפה הדרגתית (חובה):
- שלב 1: רגש בלבד ("${gender === "female" ? "אני קצת מאוכזבת" : "אני קצת מאוכזב"}", "${gender === "female" ? "לא נעים לי" : "לא נעים לי"}")
- שלב 2: סיבה כללית ("קרה משהו שפגע ${gender === "female" ? "בי" : "בי"}")
- שלב 3: פרט אחד (רק אם המפקד ממשיך נכון)
- שלב 4: עוד פרטים (רק בקושי נמוך-בינוני, או אחרי הרבה עבודה של המפקד)

מטרה: ${scenario.objective}
כשהמפקד מצליח - כלומר ${gender === "female" ? "מצאת" : "מצאת"} פתרון או ${gender === "female" ? "הרגשת" : "הרגשת"} ערך ומשמעות - אמור/אמרי בבירור: "כל הכבוד סיימת את הסימולציה"

התחל/י בדמות עכשיו. המפקד ${firstName} פנה אליך.`;

  // Generate intro
  useEffect(() => {
    (async () => {
      setGenerating(true);
      try {
        const res = await fetch("/api/sim-chat", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ systemPrompt: buildSimulationIntroPrompt(scenario, commander), message: "תאר את רקע הסימולציה", mode: "chat" }),
        });
        if (res.ok) { const data = await res.json(); setIntroText(data.response); }
      } catch (e) { console.error(e); }
      setGenerating(false);
    })();
  }, []);

  // Prevent accidental page close during active voice session
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (clientRef.current && !completedRef.current) {
        e.preventDefault();
        e.returnValue = "סימולציה קולית פעילה. בטוח שאתה רוצה לצאת?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Cleanup on unmount + auto-disconnect after 15 minutes
  useEffect(() => {
    const maxDurationTimer = setTimeout(() => {
      if (!completedRef.current && clientRef.current) {
        setErrorMsg(t.simulator.autoEndMessage);
        triggerEnd();
      }
    }, 15 * 60 * 1000);
    return () => {
      clearTimeout(maxDurationTimer);
      clientRef.current?.disconnect();
    };
  }, []);

  const triggerEnd = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    handleSimulationEnd();
  };

  const startVoiceSession = async () => {
    if (!apiKey) { setErrorMsg(t.simulator.geminiKeyMissing); return; }

    const { GeminiLiveClient } = await import("@/lib/gemini-live");

    const client = new GeminiLiveClient({
      apiKey,
      systemInstruction: voiceSystemPrompt,
      language: "iw",
      onStatusChange: (status) => {
        const prevStatus = voiceStatusRef.current;
        voiceStatusRef.current = status;
        setVoiceStatus(status);

        // When AI starts speaking → flush user's accumulated fragments as one turn
        if (status === "ai-speaking" && prevStatus === "listening") {
          const userText = currentUserFragments.current.replace(/\s+/g, " ").trim();
          if (userText) {
            const msg: ChatMessage = { role: "user", content: userText, timestamp: Date.now() };
            turnsRef.current = [...turnsRef.current, msg];
            setTurns([...turnsRef.current]);
          }
          currentUserFragments.current = "";
          setIsMicOn(false);
        }

        // When AI stops speaking → flush AI's accumulated fragments as one turn
        if (status === "listening" && prevStatus === "ai-speaking") {
          const aiText = currentAiFragments.current.replace(/\s+/g, " ").trim();
          if (aiText) {
            const msg: ChatMessage = { role: "assistant", content: aiText, timestamp: Date.now() };
            turnsRef.current = [...turnsRef.current, msg];
            setTurns([...turnsRef.current]);
          }
          currentAiFragments.current = "";

          // If end phrase was detected during AI speech, now trigger the end
          if (endPendingRef.current) {
            console.log("[Voice] AI finished speaking end phrase, triggering end");
            triggerEnd();
            return; // Don't unmute, simulation is over
          }
          setIsMicOn(true);
        }
      },
      onTranscriptIn: (text) => {
        // Accumulate user fragments (will be flushed on status change)
        currentUserFragments.current += " " + text;
      },
      onTranscriptOut: (text) => {
        // Accumulate AI fragments (will be flushed on status change)
        currentAiFragments.current += " " + text;
        // Also accumulate for end detection
        fullOutputRef.current += " " + text;
        const normalized = fullOutputRef.current.replace(/\s+/g, " ").trim();
        if (normalized.includes("כל הכבוד") && normalized.includes("סיימת") && normalized.includes("סימולציה")) {
          console.log("[Voice] End phrase detected, waiting for AI to finish speaking...");
          endPendingRef.current = true;
          // If AI is not currently speaking (e.g., end came in final transcript), trigger immediately
          if (voiceStatusRef.current !== "ai-speaking") {
            triggerEnd();
          }
        }
      },
      onError: (error) => { setErrorMsg(error); },
      onSimulationEnd: () => { triggerEnd(); },
    });

    clientRef.current = client;
    await client.connect();

    // Wait for setup complete, then start mic
    setTimeout(async () => {
      await client.startMicrophone();
    }, 1500);
  };

  const toggleMic = () => {
    try {
      if (isMicOn) {
        clientRef.current?.mute();
        setIsMicOn(false);
      } else {
        clientRef.current?.unmute();
        setIsMicOn(true);
      }
    } catch (e) {
      console.error("[Voice] toggleMic error:", e);
      // Try to recover by restarting mic
      clientRef.current?.startMicrophone().then(() => setIsMicOn(true)).catch(() => {});
    }
  };

  const sendTextInVoice = (text: string) => {
    if (!text.trim() || !clientRef.current) return;
    clientRef.current.sendText(text);
    // Add as a complete user turn
    const msg: ChatMessage = { role: "user", content: text.trim(), timestamp: Date.now() };
    turnsRef.current = [...turnsRef.current, msg];
    setTurns([...turnsRef.current]);
  };

  const handleSimulationEnd = async () => {
    setIsCompleted(true);
    setGenerating(true);

    // Wait a moment for any final audio to play
    await new Promise(r => setTimeout(r, 1500));

    // Flush any remaining fragments before ending
    const remainingUser = currentUserFragments.current.replace(/\s+/g, " ").trim();
    if (remainingUser) {
      turnsRef.current = [...turnsRef.current, { role: "user" as const, content: remainingUser, timestamp: Date.now() }];
    }
    const remainingAi = currentAiFragments.current.replace(/\s+/g, " ").trim();
    if (remainingAi) {
      turnsRef.current = [...turnsRef.current, { role: "assistant" as const, content: remainingAi, timestamp: Date.now() }];
    }
    setTurns([...turnsRef.current]);

    clientRef.current?.disconnect();

    const msgs = turnsRef.current;

    const messagesJson = msgs.length > 0
      ? msgs.map(m => `${m.role === "user" ? "אתה" : scenario.machineName}: ${m.content}`).join("\n")
      : "לא הייתה שיחה";

    // Get score and feedback
    const [scoreRes, feedbackRes] = await Promise.all([
      fetch("/api/sim-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemPrompt: buildScorePrompt(scenario, commander, messagesJson), message: "ספק ציון מספרי", mode: "score" }) }),
      fetch("/api/sim-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemPrompt: buildFeedbackPrompt(scenario, commander, messagesJson, "voice"), message: "שלח ביקורת מקיפה", mode: "feedback" }) }),
    ]);

    let score = 0, feedback = "";
    if (scoreRes.ok) { const d = await scoreRes.json(); const p = parseInt(d.response?.replace(/\D/g, "")); if (!isNaN(p)) score = Math.min(100, Math.max(0, p)); }
    if (feedbackRes.ok) { const d = await feedbackRes.json(); feedback = d.response; }
    const grade = score >= 60 ? "עובר" : "לא עובר";

    const updRes = await fetch("/api/sim-sessions", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: simSession.id, status: "completed", messages: JSON.stringify(msgs), score, feedback, grade }),
    });
    if (updRes.ok) { const updated = await updRes.json(); setGenerating(false); onEnd(updated); }
    else { setGenerating(false); onEnd({ ...simSession, status: "completed", score, feedback, grade } as SimSession); }
  };

  const handleForceEnd = () => {
    if (!confirm(t.simulator.endConfirm)) return;
    triggerEnd();
  };

  const [textInput, setTextInput] = useState("");

  // Status indicator colors
  const statusConfig: Record<string, { color: string; text: string; pulse: boolean }> = {
    disconnected: { color: "bg-gray-400", text: t.simulator.disconnected, pulse: false },
    connecting: { color: "bg-yellow-400", text: t.simulator.connecting, pulse: true },
    connected: { color: "bg-blue-400", text: t.simulator.connected, pulse: false },
    listening: { color: "bg-green-500", text: t.simulator.listening, pulse: true },
    "ai-speaking": { color: "bg-purple-500", text: t.simulator.aiSpeaking, pulse: true },
    error: { color: "bg-red-500", text: t.simulator.error, pulse: false },
  };
  const st = statusConfig[voiceStatus] || statusConfig.disconnected;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="bg-gradient-to-l from-purple-700 to-blue-700 text-white rounded-t-xl p-3 sm:p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => { if (confirm(t.simulator.voiceExitConfirm)) { clientRef.current?.disconnect(); onBack(); } }} className="text-white/80 hover:text-white">
            <MdArrowBack className="text-xl" />
          </button>
          <div>
            <h2 className="font-bold text-sm sm:text-base">{scenario.title}</h2>
            <div className="text-[10px] sm:text-xs text-white/70 flex items-center gap-2">
              <span>{t.simulator.voiceSimulation}</span><span>•</span><span>{t.simulator.difficulty}: {scenario.difficulty}/10</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${st.color} ${st.pulse ? "animate-pulse" : ""}`}></span>
                {st.text}
              </span>
            </div>
          </div>
        </div>
        <button onClick={handleForceEnd} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition">
          <MdStop className="inline" /> {t.simulator.end}
        </button>
      </div>

      {/* Intro */}
      {introText && (
        <div className="bg-gray-50 border-b p-3 sm:p-4">
          <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-800 text-sm mb-2">{t.simulator.scenarioBackground}</h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{introText}</p>
          </div>
        </div>
      )}

      {/* Main voice area */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4 gap-6">
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{errorMsg}</div>
        )}

        {/* Voice visualization */}
        <div className="relative">
          <div className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center transition-all duration-500 ${
            voiceStatus === "listening" ? "bg-green-100 shadow-[0_0_40px_rgba(34,197,94,0.3)]" :
            voiceStatus === "ai-speaking" ? "bg-purple-100 shadow-[0_0_40px_rgba(168,85,247,0.3)]" :
            voiceStatus === "connected" ? "bg-blue-50" :
            "bg-gray-100"
          }`}>
            {voiceStatus === "ai-speaking" ? (
              <div className="flex gap-1 items-end">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-2 bg-purple-500 rounded-full animate-pulse" style={{
                    height: `${20 + Math.random() * 30}px`,
                    animationDelay: `${i * 100}ms`,
                    animationDuration: "0.6s",
                  }}></div>
                ))}
              </div>
            ) : voiceStatus === "listening" ? (
              <MdMic className="text-5xl text-green-600 animate-pulse" />
            ) : (
              <MdRecordVoiceOver className="text-5xl text-gray-400" />
            )}
          </div>
          {voiceStatus === "listening" && (
            <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-30"></div>
          )}
        </div>

        {/* Status text */}
        <div className="text-center">
          {voiceStatus === "disconnected" && !generating && (
            <div>
              <p className="text-gray-600 mb-4">{t.simulator.clickToStartVoice} {scenario.machineName}</p>
              <button onClick={startVoiceSession}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl hover:opacity-90 transition font-bold text-lg flex items-center gap-3 mx-auto shadow-lg">
                <MdMic className="text-2xl" /> {t.simulator.startVoiceChat}
              </button>
            </div>
          )}
          {voiceStatus === "connecting" && <p className="text-yellow-600 font-medium animate-pulse">{t.simulator.connectingToVoice}</p>}
          {voiceStatus === "connected" && !isMicOn && <p className="text-blue-600 font-medium">{t.simulator.connectedMicOff}</p>}
          {voiceStatus === "listening" && <p className="text-green-600 font-medium">{t.simulator.listeningSpeakNow}</p>}
          {voiceStatus === "ai-speaking" && <p className="text-purple-600 font-medium">{scenario.machineName} {scenario.soldierGender === "male" ? t.simulator.speaking : t.simulator.speakingFemale}... ({t.simulator.speakingMicMuted})</p>}
          {generating && <p className="text-gray-500 animate-pulse">{t.simulator.preparingSimulation}</p>}
        </div>

        {/* Controls */}
        {voiceStatus !== "disconnected" && !isCompleted && (
          <div className="flex items-center gap-3">
            {/* Mute/Unmute toggle */}
            <button onClick={toggleMic}
              title={isMicOn ? t.simulator.muteMic : t.simulator.unmuteMic}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-md ${
                isMicOn ? "bg-green-500 hover:bg-green-600" : "bg-gray-400 hover:bg-gray-500"
              } text-white`}>
              {isMicOn ? <MdMic className="text-xl" /> : <MdMicOff className="text-xl" />}
            </button>

            {/* "I finished speaking" button - sends silence to trigger VAD, then mutes */}
            {isMicOn && voiceStatus === "listening" && (
              <button onClick={() => {
                // Flush user fragments as a complete turn
                const userText = currentUserFragments.current.replace(/\s+/g, " ").trim();
                if (userText) {
                  const msg: ChatMessage = { role: "user", content: userText, timestamp: Date.now() };
                  turnsRef.current = [...turnsRef.current, msg];
                  setTurns([...turnsRef.current]);
                  currentUserFragments.current = "";
                }
                // Send silence audio to trigger Gemini's VAD (it will detect end-of-speech and respond)
                clientRef.current?.sendEndOfTurn();
                setIsMicOn(false);
              }}
                title={t.simulator.finishedSpeakingTooltip}
                className="h-14 px-5 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm flex items-center gap-2 shadow-md transition-all">
                <MdDone className="text-xl" /> {t.simulator.finishedSpeaking}
              </button>
            )}

            {/* Manual unmute after AI finished */}
            {!isMicOn && voiceStatus !== "ai-speaking" && voiceStatus !== "connecting" && voiceStatus !== "disconnected" && (
              <button onClick={() => {
                try {
                  clientRef.current?.unmute();
                  setIsMicOn(true);
                } catch (e) {
                  console.error("[Voice] unmute error:", e);
                  clientRef.current?.startMicrophone().then(() => setIsMicOn(true)).catch(() => {});
                }
              }}
                className="h-14 px-5 rounded-full bg-green-500 hover:bg-green-600 text-white font-medium text-sm flex items-center gap-2 shadow-md transition-all">
                <MdMic className="text-xl" /> {t.simulator.pressToSpeak}
              </button>
            )}
          </div>
        )}

        {/* Live transcripts - aggregated turns */}
        {turns.length > 0 && (
          <div className="w-full max-w-md max-h-48 overflow-y-auto bg-white rounded-xl border border-gray-200 p-3 space-y-2">
            <h4 className="text-xs font-bold text-gray-500 mb-1">{t.simulator.liveTranscript}</h4>
            {turns.map((t, i) => (
              <div key={i} className={`text-xs ${t.role === "user" ? "text-dotan-green-dark" : "text-purple-600"}`}>
                {t.role === "user" ? <MdPerson className="inline text-sm" /> : <MdSmartToy className="inline text-sm" />}
                {" "}{t.content}
              </div>
            ))}
          </div>
        )}

        {/* Text fallback input */}
        {voiceStatus !== "disconnected" && !isCompleted && (
          <div className="w-full max-w-md">
            <form onSubmit={(e) => { e.preventDefault(); sendTextInVoice(textInput); setTextInput(""); }} className="flex gap-2">
              <input type="text" value={textInput} onChange={e => setTextInput(e.target.value)} placeholder={t.simulator.orTypeHere}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 outline-none" />
              <button type="submit" disabled={!textInput.trim()}
                className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50"><MdSend /></button>
            </form>
          </div>
        )}
      </div>

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
