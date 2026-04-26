"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  Bell,
  BookOpen,
  Bot,
  Briefcase,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Clock,
  ExternalLink,
  GraduationCap,
  LayoutDashboard,
  MapPin,
  Mic,
  Plus,
  Search,
  Send,
  Settings,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Message = {
  sender: "aria" | "user";
  text: string;
};

type Deadline = {
  id: number;
  title: string;
  daysLeft: number;
  type: "danger" | "warning" | "info";
  subject: string;
};

type Job = {
  id: number;
  company: string;
  role: string;
  status: string;
  date: string;
};

type TaskBoardItem = {
  id: number;
  taskId: string;
  title: string;
  priority: string;
  status: string;
  dueLabel: string;
  source: string;
};

type Course = {
  id: number;
  name: string;
  progress: number;
  nextTask: string;
  grade: string;
};

type UniversitySummary = {
  upcomingCount: number;
  urgentCount: number;
  missingPlanCount: number;
};

type ScheduleItem = {
  time: string;
  task: string;
  status: "completed" | "current" | "pending";
};

type WeeklyScheduleDay = {
  dayLabel: string;
  dayNumber: number | null;
  isoDate: string;
  isToday: boolean;
  items: Array<{
    title: string;
    time: string;
    status: "completed" | "current" | "pending";
    location: string;
  }>;
};

type VisionScheduleItem = {
  day: string;
  start: string;
  end: string;
  title: string;
  location: string;
};

const WEEKDAY_ORDER = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

function normalizeDayKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function canonicalDay(value: string) {
  const normalized = normalizeDayKey(value);
  if (normalized === "lunes") return "Lunes";
  if (normalized === "martes") return "Martes";
  if (normalized === "miercoles") return "Miércoles";
  if (normalized === "jueves") return "Jueves";
  if (normalized === "viernes") return "Viernes";
  if (normalized === "sabado") return "Sábado";
  if (normalized === "domingo") return "Domingo";
  return value.trim() || "Sin día";
}

function normalizeTime24(value: string) {
  const text = value.trim().toLowerCase();
  if (!text) {
    return null;
  }

  const match = text.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/i);
  if (!match) {
    return null;
  }

  let hours = Number.parseInt(match[1] ?? "", 10);
  const minutes = Number.parseInt(match[2] ?? "0", 10);
  const marker = (match[3] ?? "").toLowerCase();

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
    return null;
  }

  if (marker === "am") {
    if (hours === 12) hours = 0;
  } else if (marker === "pm") {
    if (hours < 12) hours += 12;
  }

  if (hours < 0 || hours > 23) {
    return null;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function normalizeAndSortVisionItems(items: VisionScheduleItem[]) {
  const normalized = items.map((item) => ({
    day: canonicalDay(item.day),
    start: normalizeTime24(item.start) ?? item.start.trim(),
    end: normalizeTime24(item.end) ?? item.end.trim(),
    title: item.title.trim() || "Sin título",
    location: item.location.trim(),
  }));

  return [...normalized].sort((left, right) => {
    const leftDay = WEEKDAY_ORDER.indexOf(normalizeDayKey(left.day));
    const rightDay = WEEKDAY_ORDER.indexOf(normalizeDayKey(right.day));
    const dayWeight = (leftDay === -1 ? 999 : leftDay) - (rightDay === -1 ? 999 : rightDay);
    if (dayWeight !== 0) return dayWeight;

    const leftStart = minutesFromTime(left.start);
    const rightStart = minutesFromTime(right.start);
    return (leftStart ?? 9999) - (rightStart ?? 9999);
  });
}

function extractVisionItems(parsed: unknown): VisionScheduleItem[] {
  if (!parsed || typeof parsed !== "object" || !("items" in parsed)) {
    return [];
  }

  const items = (parsed as { items?: unknown[] }).items;
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      day: typeof item.day === "string" ? item.day : "Sin día",
      start: typeof item.start === "string" ? item.start : "--:--",
      end: typeof item.end === "string" ? item.end : "--:--",
      title: typeof item.title === "string" ? item.title : "Sin título",
      location: typeof item.location === "string" ? item.location : "",
    }));
}

function minutesFromTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1] ?? "", 10);
  const minutes = Number.parseInt(match[2] ?? "", 10);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function buildVisionWarnings(items: VisionScheduleItem[]) {
  const warnings: string[] = [];

  items.forEach((item) => {
    const start = minutesFromTime(item.start);
    const end = minutesFromTime(item.end);

    if (start == null || end == null) {
      warnings.push(`Revisa "${item.title}" en ${item.day}: una hora no pudo interpretarse bien.`);
      return;
    }

    if (end <= start) {
      warnings.push(
        `Revisa "${item.title}" en ${item.day}: termina a las ${item.end} pero empieza a las ${item.start}.`,
      );
    }
  });

  return warnings;
}

function groupVisionSchedule(items: VisionScheduleItem[]) {
  const order = ["Lunes", "Martes", "Miércoles", "Miercoles", "Jueves", "Viernes", "Sábado", "Sabado", "Domingo"];
  const grouped = new Map<string, VisionScheduleItem[]>();

  items.forEach((item) => {
    const current = grouped.get(item.day) ?? [];
    current.push(item);
    grouped.set(item.day, current);
  });

  return Array.from(grouped.entries()).sort((a, b) => {
    const aIndex = order.indexOf(a[0]);
    const bIndex = order.indexOf(b[0]);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });
}

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isRecording, setIsRecording] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [visionStatus, setVisionStatus] = useState("");
  const [visionJson, setVisionJson] = useState("");
  const [visionSchedule, setVisionSchedule] = useState<VisionScheduleItem[]>([]);
  const [visionWarnings, setVisionWarnings] = useState<string[]>([]);
  const [isImportingSchedule, setIsImportingSchedule] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState("");
  const [dataStatus, setDataStatus] = useState("Cargando datos...");
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "aria",
      text:
        "Buenos días. He sincronizado tu portal universitario. El proyecto de Estructuras se adelantó un día. Tienes 4 días restantes. ¿Quieres que ajuste tu horario de estudio de esta noche?",
    },
  ]);

  const [deadlines, setDeadlines] = useState<Deadline[]>([]);

  const [jobsData, setJobsData] = useState<Job[]>([]);
  const [taskBoard, setTaskBoard] = useState<TaskBoardItem[]>([]);

  const [coursesData, setCoursesData] = useState<Course[]>([]);
  const [universitySummary, setUniversitySummary] = useState<UniversitySummary>({
    upcomingCount: 0,
    urgentCount: 0,
    missingPlanCount: 0,
  });
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleDay[]>([]);
  const [newVisionItem, setNewVisionItem] = useState<VisionScheduleItem>({
    day: "Lunes",
    start: "08:00",
    end: "09:00",
    title: "",
    location: "",
  });
  const tabMeta: Record<string, { title: string; subtitle: string }> = {
    dashboard: {
      title: "Panel Central",
      subtitle: "Resumen operativo y pendientes vivos",
    },
    calendar: {
      title: "Agenda Inteligente",
      subtitle: "Bloques de clase, eventos y planificación",
    },
    uni: {
      title: "Universidad",
      subtitle: "Exámenes, cursos y focos de estudio",
    },
    jobs: {
      title: "Búsqueda de Empleo",
      subtitle: "Vacantes detectadas y seguimiento",
    },
  };

  const currentTabMeta = tabMeta[activeTab] ?? tabMeta.dashboard;

  const switchTab = (tab: "dashboard" | "calendar" | "uni" | "jobs") => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleVisionUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setVisionStatus("Analizando imagen...");
    setVisionJson("");
    setVisionSchedule([]);
    setVisionWarnings([]);

    const reader = new FileReader();
    reader.onload = async () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64Data = result.split(",")[1];

      try {
        const response = await fetch("/api/ai/vision", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mimeType: file.type,
            base64Data,
          }),
        });

        const json = (await response.json()) as {
          parsed?: unknown;
          rawText?: string;
          error?: string;
          details?: string;
          retryAfterSeconds?: number | null;
          modelUsed?: string;
        };

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error(
              json.details ??
                "Gemini alcanzó su cuota gratuita. Espera un momento y vuelve a intentar.",
            );
          }

          throw new Error(json.details ?? json.error ?? "No se pudo analizar la imagen.");
        }

        const parsedItems = normalizeAndSortVisionItems(extractVisionItems(json.parsed));
        const warnings = buildVisionWarnings(parsedItems);

        setVisionStatus(
          json.modelUsed
            ? `Horario procesado con ${json.modelUsed}.`
            : "Horario procesado.",
        );
        setVisionJson(JSON.stringify(json.parsed ?? json.rawText, null, 2));
        setVisionSchedule(parsedItems);
        setVisionWarnings(warnings);
      } catch (error) {
        setVisionStatus(String(error));
      }
    };

    reader.readAsDataURL(file);
  };

  const handleImportSchedule = async () => {
    if (visionSchedule.length === 0) {
      setVisionStatus("Primero sube un horario válido.");
      return;
    }

    const prepared = normalizeAndSortVisionItems(visionSchedule);
    setVisionSchedule(prepared);
    const warnings = buildVisionWarnings(prepared);
    setVisionWarnings(warnings);
    if (warnings.length > 0) {
      setVisionStatus("Corrige los bloques con advertencias antes de importar.");
      return;
    }

    setIsImportingSchedule(true);

    try {
      const response = await fetch("/api/schedule/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: prepared,
        }),
      });

      const json = (await response.json()) as {
        ok?: boolean;
        imported?: number;
        remindersCreated?: number;
        skipped?: Array<{ title: string; reason: string }>;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(json.error ?? "No se pudo importar el horario.");
      }

      setVisionStatus(
        `Importé ${json.imported ?? 0} bloques a tu agenda y preparé ${json.remindersCreated ?? 0} recordatorios.${json.skipped?.length ? ` Omití ${json.skipped.length} por inconsistencias.` : ""}`,
      );
      await loadDashboardSnapshot();
    } catch (error) {
      setVisionStatus(String(error));
    } finally {
      setIsImportingSchedule(false);
    }
  };

  const updateVisionItem = (index: number, patch: Partial<VisionScheduleItem>) => {
    setVisionSchedule((prev) => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;
      next[index] = {
        ...current,
        ...patch,
      };
      const normalized = normalizeAndSortVisionItems(next);
      setVisionWarnings(buildVisionWarnings(normalized));
      return normalized;
    });
  };

  const removeVisionItem = (index: number) => {
    setVisionSchedule((prev) => {
      const next = prev.filter((_, itemIndex) => itemIndex !== index);
      setVisionWarnings(buildVisionWarnings(next));
      return next;
    });
  };

  const addVisionItem = () => {
    if (!newVisionItem.title.trim()) {
      setVisionStatus("Para agregar un bloque manual, escribe al menos el nombre del curso/evento.");
      return;
    }

    const appended = normalizeAndSortVisionItems([
      ...visionSchedule,
      {
        ...newVisionItem,
      },
    ]);
    setVisionSchedule(appended);
    setVisionWarnings(buildVisionWarnings(appended));
    setVisionStatus("Bloque agregado. Revisa y luego importa.");
    setNewVisionItem((prev) => ({ ...prev, title: "", location: "" }));
  };

  const handleTelegramPing = async () => {
    setTelegramStatus("Enviando aviso...");

    try {
      const response = await fetch("/api/notify/telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: "XIO ping: prueba de notificacion desde la interfaz web.",
        }),
      });

      const json = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(json.error ?? "No se pudo enviar Telegram.");
      }

      setTelegramStatus("Telegram enviado correctamente.");
    } catch (error) {
      setTelegramStatus(String(error));
    }
  };

  const handleTelegramSetup = async () => {
    setTelegramStatus("Configurando webhook de Telegram...");

    try {
      const response = await fetch("/api/telegram/setup", {
        method: "POST",
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok) {
        throw new Error(json.error ?? "No se pudo configurar el webhook.");
      }

      setTelegramStatus("Webhook de Telegram activo. Ahora el bot puede responder tus mensajes.");
    } catch (error) {
      setTelegramStatus(String(error));
    }
  };

  const loadDashboardSnapshot = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const json = (await response.json()) as {
        deadlines?: Deadline[];
        taskBoard?: TaskBoardItem[];
        jobs?: Job[];
        courses?: Course[];
        schedule?: ScheduleItem[];
        weeklySchedule?: WeeklyScheduleDay[];
        universitySummary?: UniversitySummary;
        source?: "local" | "supabase";
        warning?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(json.error ?? "No se pudo cargar dashboard.");
      }

      setDeadlines(json.deadlines ?? []);
      setTaskBoard(json.taskBoard ?? []);
      setJobsData(json.jobs ?? []);
      setCoursesData(json.courses ?? []);
      setTodaySchedule(json.schedule ?? []);
      setWeeklySchedule(json.weeklySchedule ?? []);
      if (json.universitySummary) setUniversitySummary(json.universitySummary);
      setDataStatus(
        json.source === "supabase"
          ? "Conectado a Supabase en tiempo real."
          : "Conectado a almacenamiento local persistente.",
      );
      if (json.warning) {
        setDataStatus(`Conectado a almacenamiento local persistente. ${json.warning}`);
      }
    } catch (error) {
      setDataStatus(`Usando datos locales. ${String(error)}`);
    }
  }, []);

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;

    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setChatInput("");
    setIsAssistantThinking(true);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      const json = (await response.json()) as { reply?: string; source?: "local" | "supabase"; error?: string };

      if (!response.ok) {
        throw new Error(json.error ?? "No se pudo responder el chat.");
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "aria",
          text: json.reply ?? "Te leí, pero no pude formular una respuesta útil todavía.",
        },
      ]);

      if (json.source === "supabase") {
        setDataStatus("Conectado a Supabase en tiempo real.");
      }

      if (
        userMessage.toLowerCase().includes("vacante") ||
        userMessage.toLowerCase().includes("linkedin")
      ) {
        void loadDashboardSnapshot();
      }

      if (
        userMessage.toLowerCase().includes("recuerd") ||
        userMessage.toLowerCase().includes("anota") ||
        userMessage.toLowerCase().includes("agrega") ||
        userMessage.toLowerCase().includes("pendiente")
      ) {
        void loadDashboardSnapshot();
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "aria",
          text: `No pude responder bien todavía. ${String(error)}`,
        },
      ]);
    } finally {
      setIsAssistantThinking(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const [todaySchedule, setTodaySchedule] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    void loadDashboardSnapshot();
  }, [loadDashboardSnapshot]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 font-sans text-slate-200 selection:bg-cyan-500/30">
      <aside className="hidden w-20 flex-col border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl md:flex lg:w-64">
        <div className="flex h-20 items-center justify-center border-b border-slate-800 lg:justify-start lg:px-6">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-cyan-400 opacity-40 blur-md" />
            <Bot className="relative z-10 h-8 w-8 text-cyan-400" />
          </div>
          <span className="ml-3 hidden bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-xl font-bold tracking-wider text-transparent lg:block">
            E.S.M.E
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-2 px-3 py-8">
          <NavItem
            active={activeTab === "dashboard"}
            icon={LayoutDashboard}
            label="Panel Central"
            onClick={() => switchTab("dashboard")}
          />
          <NavItem
            active={activeTab === "calendar"}
            icon={Calendar}
            label="Agenda Inteligente"
            onClick={() => switchTab("calendar")}
          />
          <NavItem
            active={activeTab === "uni"}
            icon={GraduationCap}
            label="Universidad"
            onClick={() => switchTab("uni")}
          />
          <NavItem
            active={activeTab === "jobs"}
            icon={Briefcase}
            label="Búsqueda Empleo"
            onClick={() => switchTab("jobs")}
          />
        </nav>

        <div className="border-t border-slate-800 p-4">
          <NavItem active={false} icon={Settings} label="Configuración" />
        </div>
      </aside>

      <main className="relative flex h-full flex-1 flex-col overflow-hidden">
        <header className="z-20 flex h-20 items-center justify-between border-b border-slate-800 bg-slate-900/30 px-6 backdrop-blur-md lg:px-10">
          <div>
            <h1 className="text-2xl font-bold text-white">{currentTabMeta.title}</h1>
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <Clock className="h-4 w-4" />
              {currentTime.toLocaleDateString("es-ES", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}{" "}
              -{" "}
              {currentTime.toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="mt-1 text-xs text-cyan-300">{currentTabMeta.subtitle}</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative rounded-full p-2 transition-colors hover:bg-slate-800">
              <Bell className="h-6 w-6 text-slate-300" />
              <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-red-500" />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-gradient-to-tr from-blue-600 to-cyan-600 font-bold text-white shadow-lg">
              TU
            </div>
          </div>
        </header>

        <div className="custom-scrollbar z-10 flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="relative mb-8 overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-xl shadow-cyan-900/10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="relative z-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="mb-2 text-3xl font-light text-white">Hola. Tu turno en la obra terminó.</h2>
                <p className="text-lg text-slate-300">
                  El tráfico hacia la universidad es moderado. Sugiero salir en{" "}
                  <span className="font-semibold text-cyan-400">15 minutos</span> para llegar a
                  tiempo a Cálculo IV.
                </p>
              </div>
              <button className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/20 px-6 py-3 font-medium text-cyan-300 transition-all hover:bg-cyan-500/30">
                <Activity className="h-5 w-5" />
                Ver Ruta Óptima
              </button>
            </div>
            <p className="relative z-10 mt-4 text-sm text-slate-400">{dataStatus}</p>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-3">
                <Bot className="h-5 w-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-white">Vision AI para horarios</h3>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-slate-400">
                Sube un screenshot de tu horario o portal. XIO lo envía a Gemini y te devuelve una
                estructura lista para revisar e importar.
              </p>
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-300 transition hover:bg-cyan-500/20">
                  <Plus className="h-4 w-4" />
                  Subir horario
                  <input className="hidden" onChange={handleVisionUpload} type="file" accept="image/*" />
                </label>
                <button
                  className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-40"
                  disabled={visionSchedule.length === 0 || isImportingSchedule}
                  onClick={handleImportSchedule}
                  type="button"
                >
                  {isImportingSchedule ? "Importando..." : "Importar a mi agenda"}
                </button>
              </div>
              {visionStatus ? <p className="mt-4 text-sm text-slate-300">{visionStatus}</p> : null}
              {visionWarnings.length > 0 ? (
                <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                  {visionWarnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              ) : null}
              {visionSchedule.length > 0 ? (
                <div className="custom-scrollbar mt-4 max-h-80 overflow-auto rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-cyan-300">
                      Corrige tu horario antes de importar. Formato de hora obligatorio: HH:mm (24h).
                    </p>
                    <button
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700"
                      onClick={() => {
                        const normalized = normalizeAndSortVisionItems(visionSchedule);
                        setVisionSchedule(normalized);
                        setVisionWarnings(buildVisionWarnings(normalized));
                        setVisionStatus("Horario normalizado a 24h y ordenado por día/hora.");
                      }}
                      type="button"
                    >
                      Normalizar y ordenar
                    </button>
                  </div>

                  <div className="space-y-2">
                    {visionSchedule.map((item, index) => (
                      <div
                        key={`vision-row-${index}-${item.title}`}
                        className="rounded-xl border border-slate-800 bg-slate-900 p-3"
                      >
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
                          <input
                            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                            onChange={(event) => updateVisionItem(index, { day: event.target.value })}
                            placeholder="Día"
                            value={item.day}
                          />
                          <input
                            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                            onChange={(event) => updateVisionItem(index, { start: event.target.value })}
                            placeholder="Inicio"
                            type="time"
                            value={normalizeTime24(item.start) ?? ""}
                          />
                          <input
                            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                            onChange={(event) => updateVisionItem(index, { end: event.target.value })}
                            placeholder="Fin"
                            type="time"
                            value={normalizeTime24(item.end) ?? ""}
                          />
                          <input
                            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100 md:col-span-2"
                            onChange={(event) => updateVisionItem(index, { title: event.target.value })}
                            placeholder="Curso / evento"
                            value={item.title}
                          />
                          <button
                            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/20"
                            onClick={() => removeVisionItem(index)}
                            type="button"
                          >
                            Quitar
                          </button>
                        </div>
                        <input
                          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-300"
                          onChange={(event) => updateVisionItem(index, { location: event.target.value })}
                          placeholder="Ubicación (opcional)"
                          value={item.location}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-3">
                <p className="mb-2 text-xs text-slate-400">Agregar bloque manual</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
                  <input
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                    onChange={(event) => setNewVisionItem((prev) => ({ ...prev, day: event.target.value }))}
                    placeholder="Día"
                    value={newVisionItem.day}
                  />
                  <input
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                    onChange={(event) => setNewVisionItem((prev) => ({ ...prev, start: event.target.value }))}
                    type="time"
                    value={newVisionItem.start}
                  />
                  <input
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                    onChange={(event) => setNewVisionItem((prev) => ({ ...prev, end: event.target.value }))}
                    type="time"
                    value={newVisionItem.end}
                  />
                  <input
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100 md:col-span-2"
                    onChange={(event) => setNewVisionItem((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="Curso / evento"
                    value={newVisionItem.title}
                  />
                  <button
                    className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20"
                    onClick={addVisionItem}
                    type="button"
                  >
                    Agregar
                  </button>
                </div>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-300"
                  onChange={(event) => setNewVisionItem((prev) => ({ ...prev, location: event.target.value }))}
                  placeholder="Ubicación (opcional)"
                  value={newVisionItem.location}
                />
              </div>
              {visionJson ? (
                <pre className="custom-scrollbar mt-4 max-h-64 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300">
                  {visionJson}
                </pre>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-3">
                <Bell className="h-5 w-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-white">Telegram Bot</h3>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-slate-400">
                Este botón prueba el canal gratuito de notificaciones al celular. Si Telegram está
                configurado, recibirás un ping real.
              </p>
              <button
                className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-300 transition hover:bg-blue-500/20"
                onClick={handleTelegramPing}
                type="button"
              >
                Enviar prueba a Telegram
              </button>
              <button
                className="ml-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-300 transition hover:bg-cyan-500/20"
                onClick={handleTelegramSetup}
                type="button"
              >
                Conectar webhook
              </button>
              {telegramStatus ? <p className="mt-4 text-sm text-slate-300">{telegramStatus}</p> : null}
              <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                La extensión privada de Chrome ya puede mandar capturas al endpoint
                <span className="ml-1 text-cyan-400">`/api/ingest/browser`</span>.
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
            <div className="flex flex-col gap-8 xl:col-span-2">
              {activeTab === "dashboard" && (
                <>
                  <section className="animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm duration-500">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-xl font-semibold">
                        <AlertCircle className="h-5 w-5 text-cyan-400" />
                        Radares y Fechas Límite
                      </h3>
                      <span className="flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-500">
                        <Activity className="h-3 w-3 text-green-400" /> Sincronizado hace 2 min
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {deadlines.map((deadline) => (
                        <div
                          key={deadline.id}
                          className="flex flex-col justify-between rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 transition-colors hover:border-slate-600"
                        >
                          <div>
                            <span className="mb-2 block text-xs font-medium text-slate-400">
                              {deadline.subject}
                            </span>
                            <h4 className="mb-4 line-clamp-2 font-medium text-slate-200">
                              {deadline.title}
                            </h4>
                          </div>
                          <div className="flex items-end justify-between">
                            <div className="bg-gradient-to-b from-white to-slate-400 bg-clip-text text-3xl font-bold text-transparent">
                              {deadline.daysLeft}
                            </div>
                            <span className="pb-1 text-sm text-slate-400">días restantes</span>
                          </div>
                          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-900">
                            <div
                              className={`h-full rounded-full ${
                                deadline.type === "danger"
                                  ? "bg-red-500"
                                  : deadline.type === "warning"
                                    ? "bg-amber-500"
                                    : "bg-blue-500"
                              }`}
                              style={{ width: `${Math.max(10, 100 - deadline.daysLeft * 10)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm duration-700">
                    <h3 className="mb-6 flex items-center gap-2 text-xl font-semibold">
                      <Clock className="h-5 w-5 text-cyan-400" />
                      Línea de Tiempo de Hoy
                    </h3>
                    <div className="relative ml-3 space-y-8 border-l border-slate-700 pb-4 md:ml-4">
                      {todaySchedule.map((item, index) => (
                        <div key={index} className="relative pl-8 md:pl-10">
                          <span
                            className={`absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-slate-900 ${
                              item.status === "completed"
                                ? "bg-slate-500"
                                : item.status === "current"
                                  ? "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                                  : "bg-slate-700"
                            }`}
                          />

                          <div
                            className={`rounded-xl border p-4 transition-all ${
                              item.status === "current"
                                ? "border-cyan-500/30 bg-cyan-500/10"
                                : "border-slate-800/50 bg-slate-800/30 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                              <div>
                                <span
                                  className={`font-mono text-sm ${
                                    item.status === "current" ? "text-cyan-300" : "text-slate-400"
                                  }`}
                                >
                                  {item.time}
                                </span>
                                <h4
                                  className={`mt-1 text-lg font-medium ${
                                    item.status === "completed"
                                      ? "text-slate-400 line-through"
                                      : "text-white"
                                  }`}
                                >
                                  {item.task}
                                </h4>
                              </div>
                              {item.status === "completed" && (
                                <CheckCircle2 className="h-5 w-5 text-slate-500" />
                              )}
                              {item.status === "current" && (
                                <span className="animate-pulse rounded-full border border-cyan-500/20 bg-cyan-500/20 px-3 py-1 text-xs text-cyan-300">
                                  En curso
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm duration-700">
                    <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                      <CheckSquare className="h-5 w-5 text-cyan-400" />
                      Pendientes Reales
                    </h3>
                    {taskBoard.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                        No hay pendientes todavía. Escribe en el chat: &quot;agrega pendiente ...&quot;
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {taskBoard.map((task) => (
                          <div
                            key={task.taskId}
                            className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-medium text-white">{task.title}</p>
                              <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-300">
                                {task.priority}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-400">
                              {task.status} • {task.dueLabel} • fuente: {task.source}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}

              {activeTab === "calendar" && (
                <CalendarView todaySchedule={todaySchedule} weeklySchedule={weeklySchedule} />
              )}
              {activeTab === "uni" && (
                <UniversityView courses={coursesData} summary={universitySummary} />
              )}
              {activeTab === "jobs" && <JobsView jobs={jobsData} />}
            </div>

            <div
              className={`relative flex h-[600px] flex-col gap-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl ${
                mobileChatOpen ? "fixed inset-4 bottom-20 z-50 h-auto" : "hidden xl:flex"
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-500" />
                  </div>
                  <h3 className="font-semibold text-white">Interacción E.S.M.E</h3>
                </div>
                <Search className="h-4 w-4 text-slate-400" />
              </div>

              <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${
                        msg.sender === "user"
                          ? "rounded-br-sm bg-blue-600/80 text-white"
                          : "rounded-bl-sm border border-slate-700 bg-slate-800 text-slate-200"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isAssistantThinking ? (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-sm border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-300">
                      E.S.M.E está revisando tu agenda...
                    </div>
                  </div>
                ) : null}
                <div ref={chatEndRef} />
              </div>

              <div className="border-t border-slate-800 bg-slate-900 p-4">
                <form className="relative flex items-center" onSubmit={handleSendMessage}>
                  <button
                    className={`absolute left-2 rounded-full p-2 transition-all ${
                      isRecording
                        ? "animate-pulse bg-red-500/20 text-red-500"
                        : "text-slate-400 hover:bg-slate-800 hover:text-cyan-400"
                    }`}
                    onClick={() => setIsRecording(!isRecording)}
                    type="button"
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                  <input
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-12 pr-12 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    disabled={isAssistantThinking}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Escribe o presiona el micro para hablar..."
                    type="text"
                    value={chatInput}
                  />
                  <button
                    className="absolute right-2 rounded-full p-2 text-cyan-500 transition-all hover:bg-cyan-500/10 disabled:opacity-30"
                    disabled={!chatInput.trim() || isAssistantThinking}
                    type="submit"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
                <div className="mt-3 flex justify-center gap-2">
                  <SuggestionChip setInput={setChatInput} text="¿Qué toca estudiar hoy?" />
                  <SuggestionChip setInput={setChatInput} text="Añadir vacante LinkedIn" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="z-20 flex h-16 items-center justify-around border-t border-slate-800 bg-slate-900/90 px-4 backdrop-blur-lg xl:hidden">
          <MobileNavItem
            active={activeTab === "dashboard"}
            icon={LayoutDashboard}
            onClick={() => {
              switchTab("dashboard");
              setMobileChatOpen(false);
            }}
          />
          <MobileNavItem
            active={activeTab === "calendar"}
            icon={Calendar}
            onClick={() => {
              switchTab("calendar");
              setMobileChatOpen(false);
            }}
          />

          <button
            className={`relative -top-5 rounded-full border-4 border-slate-950 p-4 text-white shadow-lg transition-all duration-300 ${
              mobileChatOpen
                ? "rotate-12 bg-red-500/80 shadow-red-900/50"
                : "bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-cyan-900/50 hover:scale-105"
            }`}
            onClick={() => setMobileChatOpen(!mobileChatOpen)}
          >
            {mobileChatOpen ? <Settings className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
          </button>

          <MobileNavItem
            active={activeTab === "uni"}
            icon={GraduationCap}
            onClick={() => {
              switchTab("uni");
              setMobileChatOpen(false);
            }}
          />
          <MobileNavItem
            active={activeTab === "jobs"}
            icon={Briefcase}
            onClick={() => {
              switchTab("jobs");
              setMobileChatOpen(false);
            }}
          />
        </div>
      </main>
    </div>
  );
}

type NavItemProps = {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick?: () => void;
};

const NavItem = ({ icon: Icon, label, active, onClick }: NavItemProps) => (
  <button
    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 transition-all ${
      active
        ? "border-cyan-500/20 bg-cyan-500/10 font-medium text-cyan-400"
        : "border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
    }`}
    onClick={onClick}
  >
    <div className={active ? "text-cyan-400" : "text-slate-500"}>
      <Icon className="h-5 w-5" />
    </div>
    <span className="hidden text-sm lg:block">{label}</span>
    {active && <ChevronRight className="ml-auto hidden h-4 w-4 opacity-50 lg:block" />}
  </button>
);

type MobileNavItemProps = {
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
};

const MobileNavItem = ({ icon: Icon, active, onClick }: MobileNavItemProps) => (
  <button className={`p-2 ${active ? "text-cyan-400" : "text-slate-500"}`} onClick={onClick}>
    <Icon className="h-6 w-6" />
  </button>
);

type SuggestionChipProps = {
  text: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
};

const SuggestionChip = ({ text, setInput }: SuggestionChipProps) => (
  <button
    className="whitespace-nowrap rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-[10px] text-slate-300 transition-colors hover:border-slate-500 sm:text-xs"
    onClick={() => setInput(text)}
    type="button"
  >
    {text}
  </button>
);

type CalendarViewProps = {
  todaySchedule: ScheduleItem[];
  weeklySchedule: WeeklyScheduleDay[];
};

const CalendarView = ({ todaySchedule, weeklySchedule }: CalendarViewProps) => {
  const [selectedDayIso, setSelectedDayIso] = useState<string | null>(null);
  const defaultDay =
    weeklySchedule.find((day) => day.isToday) ??
    weeklySchedule[0] ??
    null;
  const selectedDay =
    weeklySchedule.find((day) => day.isoDate === selectedDayIso) ??
    defaultDay;

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm duration-500">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xl font-semibold">
          <Calendar className="h-5 w-5 text-cyan-400" />
          Agenda Inteligente
        </h3>
        <button className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400 transition-colors hover:bg-cyan-500/20">
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="custom-scrollbar mb-8 overflow-x-auto">
        <div className="flex min-w-max gap-3">
          {weeklySchedule.map((day) => (
            <button
              key={day.isoDate}
              className={`min-w-[110px] rounded-2xl border px-4 py-3 text-left transition ${
                selectedDay?.isoDate === day.isoDate
                  ? "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_18px_rgba(34,211,238,0.12)]"
                  : day.isToday
                    ? "border-cyan-500/30 bg-slate-800/70"
                    : "border-slate-700 bg-slate-800/30 hover:bg-slate-800/60"
              }`}
              onClick={() => setSelectedDayIso(day.isoDate)}
              type="button"
            >
              <div className="text-center">
                <span
                  className={`mb-1 block text-xs font-medium ${
                    selectedDay?.isoDate === day.isoDate || day.isToday
                      ? "text-cyan-300"
                      : "text-slate-400"
                  }`}
                >
                  {day.dayLabel}
                </span>
                <span
                  className={`text-lg font-bold ${
                    selectedDay?.isoDate === day.isoDate || day.isToday
                      ? "text-white"
                      : "text-slate-200"
                  }`}
                >
                  {day.dayNumber ?? "•"}
                </span>
              </div>
              <p className="mt-2 text-center text-[11px] text-slate-400">
                {day.items.length > 0
                  ? `${day.items.length} curso${day.items.length > 1 ? "s" : ""}`
                  : "Libre"}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium uppercase tracking-wider text-slate-400">
              {selectedDay ? `Horario de ${selectedDay.dayLabel}` : "Horario de la semana"}
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              {selectedDay?.isToday
                ? "Este es tu horario base y hoy está resaltado."
                : "Selecciona un día para revisar su horario fijo."}
            </p>
          </div>
          {selectedDay?.isToday ? (
            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
              Hoy
            </span>
          ) : null}
        </div>

        <div className="space-y-3">
          {selectedDay && selectedDay.items.length > 0 ? (
            selectedDay.items.map((item) => (
              <div
                key={`${selectedDay.isoDate}-${item.time}-${item.title}`}
                className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${
                  item.status === "current"
                    ? "border-cyan-500/30 bg-cyan-500/10"
                    : "border-slate-800 bg-slate-900/70"
                }`}
              >
                <span className="w-28 shrink-0 font-mono text-sm text-cyan-300">{item.time}</span>
                <div className="h-8 w-px bg-slate-700" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-slate-400">
                    {item.location || "Modalidad sin especificar"}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-500">
              No tienes bloques importados para este día.
            </div>
          )}
        </div>
      </div>

      <h4 className="mb-4 text-sm font-medium uppercase tracking-wider text-slate-400">
        Planificación del Día (Hoy)
      </h4>
      {todaySchedule.length > 0 ? (
        <div className="space-y-3">
          {todaySchedule.map((item, index) => (
            <div
              key={index}
              className="flex cursor-pointer items-center gap-4 rounded-xl border border-slate-700/50 bg-slate-800/40 p-3 transition-all hover:border-slate-600"
            >
              <span className="w-24 shrink-0 font-mono text-sm text-cyan-400">{item.time}</span>
              <div className="h-8 w-px bg-slate-700" />
              <span
                className={`flex-1 font-medium ${
                  item.status === "completed" ? "text-slate-500 line-through" : "text-slate-200"
                }`}
              >
                {item.task}
              </span>
              {item.status === "completed" ? (
                <CheckSquare className="h-5 w-5 text-slate-500" />
              ) : (
                <div className="h-5 w-5 shrink-0 rounded border border-slate-600" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-700 px-4 py-6 text-sm text-slate-500">
          Hoy no tienes clases o eventos cargados. Tu horario semanal sigue arriba.
        </div>
      )}
    </section>
  );
};

type UniversityViewProps = {
  courses: Course[];
  summary: UniversitySummary;
};

const UniversityView = ({ courses, summary }: UniversityViewProps) => (
  <section className="animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm duration-500">
    <div className="mb-6 flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-xl font-semibold">
        <GraduationCap className="h-5 w-5 text-cyan-400" />
        Portal Universitario
      </h3>
      <span className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-500 shadow-inner">
        Ciclo Actual - Ocultando Optativas
      </span>
    </div>

    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
        <p className="text-xs uppercase tracking-wider text-slate-500">Próximas evaluaciones</p>
        <p className="mt-2 text-3xl font-bold text-white">{summary.upcomingCount}</p>
      </div>
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
        <p className="text-xs uppercase tracking-wider text-amber-200/70">Urgentes esta semana</p>
        <p className="mt-2 text-3xl font-bold text-amber-300">{summary.urgentCount}</p>
      </div>
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
        <p className="text-xs uppercase tracking-wider text-cyan-200/70">Sin plan de estudio</p>
        <p className="mt-2 text-3xl font-bold text-cyan-300">{summary.missingPlanCount}</p>
      </div>
    </div>

    <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
      {courses.map((course) => (
        <div
          key={course.id}
          className="group relative rounded-xl border border-slate-700 bg-slate-800/50 p-5 transition-all hover:border-cyan-500/50"
        >
          <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-gradient-to-br from-cyan-500/5 to-transparent" />

          <div className="relative z-10 mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-cyan-400 transition-transform group-hover:scale-110">
                <BookOpen className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-medium text-white">{course.name}</h4>
            </div>
            <span className="rounded border border-slate-800 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-300">
              Puntaje: {course.grade}
            </span>
          </div>

          <p className="relative z-10 mb-4 flex items-center gap-2 text-sm text-slate-400">
            <Target className="h-4 w-4 text-amber-500" /> Próximo:{" "}
            <span className="text-slate-200">{course.nextTask}</span>
          </p>

          <div className="relative z-10 h-2 w-full overflow-hidden rounded-full bg-slate-900">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
              style={{ width: `${course.progress}%` }}
            />
          </div>
          <div className="relative z-10 mt-2 flex justify-between">
            <span className="text-xs text-slate-500">Avance de Sílabo</span>
            <span className="text-xs font-medium text-cyan-400">{course.progress}%</span>
          </div>
        </div>
      ))}
    </div>

    <div className="flex items-start gap-4 rounded-xl border border-cyan-500/20 bg-cyan-950/30 p-5 shadow-[0_0_20px_rgba(34,211,238,0.05)]">
      <Bot className="mt-1 h-6 w-6 shrink-0 text-cyan-400 drop-shadow-md" />
      <div>
        <h5 className="mb-1 font-medium text-cyan-100">E.S.M.E Recomienda:</h5>
        <p className="text-sm leading-relaxed text-cyan-300/80">
          Tienes un rendimiento ajustado en Resistencia de Materiales. He encontrado 3 ejercicios
          resueltos en YouTube muy similares a los de tu profesor. ¿Quieres que los agregue a tu
          agenda de repaso para este domingo por la tarde?
        </p>
      </div>
    </div>
  </section>
);

type JobsViewProps = {
  jobs: Job[];
};

const JobsView = ({ jobs }: JobsViewProps) => (
  <section className="animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm duration-500">
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h3 className="flex items-center gap-2 text-xl font-semibold">
        <Briefcase className="h-5 w-5 text-cyan-400" />
        Radar de Empleo (Sincronizado)
      </h3>
      <button className="flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-500">
        <ExternalLink className="h-4 w-4" /> Ir a LinkedIn
      </button>
    </div>

    <div className="mb-8 grid grid-cols-3 gap-3 sm:gap-4">
      <div className="flex flex-col justify-center rounded-xl border border-slate-700 bg-slate-800/30 p-3 text-center sm:p-4">
        <span className="mb-1 block text-2xl font-bold text-white sm:text-3xl">12</span>
        <span className="text-[10px] leading-tight text-slate-400 sm:text-xs">CVs Enviados</span>
      </div>
      <div className="relative flex flex-col justify-center overflow-hidden rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 text-center sm:p-4">
        <div className="absolute inset-0 animate-pulse bg-cyan-400/5" />
        <span className="relative z-10 mb-1 block text-2xl font-bold text-cyan-400 sm:text-3xl">
          2
        </span>
        <span className="relative z-10 text-[10px] leading-tight text-cyan-300/80 sm:text-xs">
          Entrevistas Activas
        </span>
      </div>
      <div className="flex flex-col justify-center rounded-xl border border-slate-700 bg-slate-800/30 p-3 text-center sm:p-4">
        <span className="mb-1 block text-2xl font-bold text-white sm:text-3xl">1</span>
        <span className="text-[10px] leading-tight text-slate-400 sm:text-xs">Ofertas</span>
      </div>
    </div>

    <h4 className="mb-4 flex items-center justify-between text-sm font-medium uppercase tracking-wider text-slate-400">
      Pipeline de Postulaciones
      <span className="rounded bg-slate-800 px-2 py-1 text-xs font-normal normal-case text-slate-500">
        Actualizado en vivo
      </span>
    </h4>

    <div className="space-y-3">
      {jobs.map((job) => (
        <div
          key={job.id}
          className="flex flex-col justify-between gap-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition-all hover:border-slate-500 sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 shadow-inner">
              <span className="text-lg font-bold text-slate-300">{job.company.charAt(0)}</span>
            </div>
            <div>
              <h5 className="font-medium text-slate-200">{job.role}</h5>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-400">
                <MapPin className="h-3 w-3 text-slate-500" /> {job.company}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-700 pt-3 sm:flex-col sm:items-end sm:justify-center sm:border-0 sm:pt-0">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium tracking-wide ${
                job.status === "Entrevista"
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                  : job.status === "Guardado"
                    ? "border-blue-500/20 bg-blue-500/10 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                    : "border-slate-600 bg-slate-700/50 text-slate-300"
              }`}
            >
              {job.status}
            </span>
            <span className="text-xs text-slate-500">{job.date}</span>
          </div>
        </div>
      ))}
    </div>
  </section>
);
