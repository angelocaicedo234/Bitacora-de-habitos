import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  Trash2,
  Anchor,
  ChevronLeft,
  ChevronRight,
  Check,
  ListChecks,
  Clock,
  Bell,
  BellOff,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

const THEME = {
  bg: "#0E1A22",
  surface: "#142330",
  surface2: "#1B2E3D",
  surface3: "#223C4F",
  ink: "#E9E2D0",
  inkDim: "#B9C4C9",
  brass: "#C9A15C",
  muted: "#6F8A99",
  border: "#22384A",
  danger: "#B5573D",
  pending: "#3A4F5E",
};

const HABIT_COLORS = [
  { name: "Latón", hex: "#C9A15C" },
  { name: "Salvia", hex: "#7A9B76" },
  { name: "Óxido", hex: "#B5573D" },
  { name: "Azul lago", hex: "#6E8FAE" },
  { name: "Malva", hex: "#9B7A9C" },
  { name: "Verde mar", hex: "#4F8F8B" },
  { name: "Coral", hex: "#D08B6B" },
  { name: "Lila piedra", hex: "#8B87B5" },
];

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function isLeap(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}
function daysInMonth(y, m) {
  return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
}
function pad(n) {
  return String(n).padStart(2, "0");
}
function dateStr(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

// Guarda datos en window.storage cuando corre dentro de Claude,
// y en localStorage cuando corre como app independiente (fuera de Claude).
const storage = {
  async get(key) {
    if (typeof window !== "undefined" && window.storage) {
      try {
        const r = await window.storage.get(key, false);
        return r ? r.value : null;
      } catch (e) {
        return null;
      }
    }
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  async set(key, value) {
    if (typeof window !== "undefined" && window.storage) {
      try {
        await window.storage.set(key, value, false);
        return;
      } catch (e) {
        /* sigue e intenta localStorage abajo */
      }
    }
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      throw e;
    }
  },
};

// Racha: días consecutivos marcados, contando hacia atrás desde "desde".
function computeStreak(entries, desde) {
  let streak = 0;
  const cursor = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  while (true) {
    const ds = dateStr(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    if (entries[ds]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div
      style={{
        background: THEME.surface2,
        border: `1px solid ${THEME.border}`,
        borderRadius: 10,
        padding: "14px 16px",
        flex: "1 1 160px",
        minWidth: 150,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: THEME.muted, fontSize: 12 }}>
        {icon}
        <span>{label}</span>
      </div>
      <div
        style={{
          fontFamily: "'Fraunces', serif",
          fontSize: 26,
          fontWeight: 600,
          color: THEME.ink,
          marginTop: 4,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Checkbox({ checked, color, isToday, isFuture, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={isFuture}
      style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        border: isToday ? `1.5px solid ${THEME.brass}` : `1px solid ${checked ? "transparent" : THEME.border}`,
        background: checked ? color : "transparent",
        cursor: isFuture ? "default" : "pointer",
        opacity: isFuture ? 0.35 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        flexShrink: 0,
      }}
    >
      {checked && <Check size={12} color={THEME.bg} strokeWidth={3} />}
    </button>
  );
}

function HabitRow({ habit, year, month, daysCount, todayD, today, onToggle, onDelete }) {
  const days = Array.from({ length: daysCount }, (_, i) => i + 1);
  const checkedCount = days.filter((d) => habit.entries[dateStr(year, month, d)]).length;
  const pct = Math.round((checkedCount / daysCount) * 100);
  const streak = computeStreak(habit.entries, today);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 4px",
        borderBottom: `1px solid ${THEME.border}`,
      }}
    >
      <div
        style={{
          width: 150,
          flexShrink: 0,
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: habit.color, flexShrink: 0 }} />
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13.5,
              fontWeight: 500,
              color: THEME.ink,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={habit.name}
          >
            {habit.name}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 3,
            marginLeft: 16,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10.5,
            color: THEME.muted,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 3, color: streak > 0 ? THEME.brass : THEME.muted }}>
            <Anchor size={10} /> {streak}d
          </span>
          {habit.reminderTime && (
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Bell size={10} /> {habit.reminderTime}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, flexWrap: "nowrap", overflowX: "auto", flex: 1 }}>
        {days.map((d) => (
          <Checkbox
            key={d}
            checked={!!habit.entries[dateStr(year, month, d)]}
            color={habit.color}
            isToday={d === todayD}
            isFuture={todayD !== null && d > todayD}
            onClick={() => onToggle(habit.id, dateStr(year, month, d))}
          />
        ))}
      </div>

      <div
        style={{
          width: 54,
          flexShrink: 0,
          textAlign: "right",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          fontWeight: 600,
          color: pct >= 70 ? THEME.brass : THEME.inkDim,
        }}
      >
        {pct}%
      </div>

      <button
        onClick={() => onDelete(habit.id)}
        title="Eliminar hábito"
        style={{
          background: "transparent",
          border: "none",
          color: THEME.muted,
          cursor: "pointer",
          padding: 4,
          flexShrink: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = THEME.danger)}
        onMouseLeave={(e) => (e.currentTarget.style.color = THEME.muted)}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: THEME.surface2,
        border: `1px solid ${THEME.border}`,
        borderRadius: 8,
        padding: "8px 12px",
        fontFamily: "'Inter', sans-serif",
        fontSize: 12,
        color: THEME.ink,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value}
          {p.dataKey === "progreso" ? "%" : ""}
        </div>
      ))}
    </div>
  );
}

export default function BitacoraHabitos() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(HABIT_COLORS[0].hex);
  const [newReminder, setNewReminder] = useState("");
  const [error, setError] = useState("");
  const [notifStatus, setNotifStatus] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const firedRef = useRef(new Set());

  const STORAGE_KEY = "bitacora-anual-habitos";

  useEffect(() => {
    (async () => {
      try {
        const value = await storage.get(STORAGE_KEY);
        if (value) {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed.habits)) setHabits(parsed.habits);
        }
      } catch (e) {
        // sin datos previos
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    (async () => {
      try {
        await storage.set(STORAGE_KEY, JSON.stringify({ habits }));
      } catch (e) {
        setError("No se pudo guardar. Tus cambios podrían perderse.");
      }
    })();
  }, [habits, loading]);

  // Recordatorios: revisa cada 30s si algún hábito tiene su hora y aún no
  // se ha marcado hoy. Mientras la app corre aquí, la notificación aparece
  // con la app abierta; al publicarla como app independiente (paso 6) se
  // agregan notificaciones push que llegan aunque esté cerrada.
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const now = new Date();
      const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const todayKey = dateStr(now.getFullYear(), now.getMonth(), now.getDate());
      habits.forEach((h) => {
        if (!h.reminderTime || h.reminderTime !== hhmm) return;
        if (h.entries[todayKey]) return;
        const fireKey = `${h.id}-${todayKey}-${hhmm}`;
        if (firedRef.current.has(fireKey)) return;
        firedRef.current.add(fireKey);
        new Notification("Bitácora de hábitos", { body: `Es hora de: ${h.name}` });
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [habits]);

  function requestNotifications() {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then((perm) => setNotifStatus(perm));
  }

  const daysCount = daysInMonth(year, month);
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
  const todayD = isCurrentMonth ? now.getDate() : null;

  function addHabit() {
    const name = newName.trim();
    if (!name) return;
    setHabits((prev) => [
      ...prev,
      {
        id: (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random()}`,
        name,
        color: newColor,
        entries: {},
        reminderTime: newReminder || null,
      },
    ]);
    setNewName("");
    setNewReminder("");
  }

  function toggleEntry(habitId, day) {
    setHabits((prev) =>
      prev.map((h) => (h.id === habitId ? { ...h, entries: { ...h.entries, [day]: !h.entries[day] } } : h))
    );
  }

  function deleteHabit(id) {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }

  function shiftMonth(delta) {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  // --- Cálculos para resumen y gráficas ---
  const totalPosible = habits.length * daysCount;
  const totalCompletado = habits.reduce((sum, h) => {
    let c = 0;
    for (let d = 1; d <= daysCount; d++) if (h.entries[dateStr(year, month, d)]) c++;
    return sum + c;
  }, 0);
  const totalPendiente = totalPosible - totalCompletado;

  const barData = useMemo(
    () =>
      habits.map((h) => {
        let c = 0;
        for (let d = 1; d <= daysCount; d++) if (h.entries[dateStr(year, month, d)]) c++;
        return {
          nombre: h.name.length > 10 ? h.name.slice(0, 9) + "…" : h.name,
          Completados: c,
          Pendientes: daysCount - c,
          progreso: Math.round((c / daysCount) * 100),
        };
      }),
    [habits, year, month, daysCount]
  );

  const progressData = useMemo(() => {
    const lastDay = isCurrentMonth ? todayD : daysCount;
    const arr = [];
    for (let d = 1; d <= lastDay; d++) {
      const ds = dateStr(year, month, d);
      const done = habits.filter((h) => h.entries[ds]).length;
      const rate = habits.length ? Math.round((done / habits.length) * 100) : 0;
      arr.push({ dia: d, progreso: rate });
    }
    return arr;
  }, [habits, year, month, daysCount, isCurrentMonth, todayD]);

  const avgProgress = progressData.length
    ? Math.round(progressData.reduce((s, p) => s + p.progreso, 0) / progressData.length)
    : 0;

  const bestStreak = habits.length
    ? Math.max(...habits.map((h) => computeStreak(h.entries, now)))
    : 0;

  return (
    <div
      style={{
        background: THEME.bg,
        minHeight: "100%",
        padding: "28px 22px",
        fontFamily: "'Inter', sans-serif",
        color: THEME.ink,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap');
        ::-webkit-scrollbar { height: 6px; }
        ::-webkit-scrollbar-thumb { background: ${THEME.surface3}; border-radius: 4px; }
        input::placeholder { color: ${THEME.muted}; }
      `}</style>

      {/* Encabezado */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Anchor size={22} color={THEME.brass} />
            <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 28, margin: 0 }}>
              Bitácora de hábitos
            </h1>
          </div>
          <p style={{ margin: "6px 0 0 32px", color: THEME.muted, fontSize: 13 }}>
            Registra tu mes y descubre por qué estás mejorando.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: THEME.surface,
            border: `1px solid ${THEME.border}`,
            borderRadius: 8,
            padding: "4px 6px",
          }}
        >
          <button
            onClick={() => shiftMonth(-1)}
            style={{ background: "transparent", border: "none", color: THEME.ink, cursor: "pointer", padding: 4 }}
          >
            <ChevronLeft size={16} />
          </button>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              width: 150,
              textAlign: "center",
            }}
          >
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            onClick={() => shiftMonth(1)}
            style={{ background: "transparent", border: "none", color: THEME.ink, cursor: "pointer", padding: 4 }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Cuadro para agregar hábitos */}
      <div
        style={{
          background: THEME.surface,
          border: `1px solid ${THEME.border}`,
          borderRadius: 12,
          padding: "18px 18px",
          marginBottom: 18,
        }}
      >
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
          Agregar hábito
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addHabit()}
            placeholder="Ej. Leer, Meditar, Correr..."
            style={{
              flex: "1 1 220px",
              background: THEME.surface2,
              border: `1px solid ${THEME.border}`,
              borderRadius: 8,
              padding: "9px 12px",
              color: THEME.ink,
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            {HABIT_COLORS.map((c) => (
              <button
                key={c.hex}
                title={c.name}
                onClick={() => setNewColor(c.hex)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: c.hex,
                  border: newColor === c.hex ? `2px solid ${THEME.ink}` : "2px solid transparent",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Bell size={14} color={THEME.muted} />
            <input
              type="time"
              value={newReminder}
              onChange={(e) => setNewReminder(e.target.value)}
              title="Hora del recordatorio (opcional)"
              style={{
                background: THEME.surface2,
                border: `1px solid ${THEME.border}`,
                borderRadius: 8,
                padding: "8px 10px",
                color: THEME.ink,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                outline: "none",
              }}
            />
          </div>
          <button
            onClick={addHabit}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: THEME.brass,
              border: "none",
              borderRadius: 8,
              padding: "9px 14px",
              color: THEME.bg,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <Plus size={15} /> Agregar
          </button>
        </div>

        {notifStatus !== "granted" && notifStatus !== "unsupported" && (
          <button
            onClick={requestNotifications}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: `1px solid ${THEME.border}`,
              borderRadius: 8,
              padding: "7px 12px",
              color: THEME.muted,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              marginTop: 12,
            }}
          >
            <BellOff size={13} /> Activar notificaciones de recordatorio en este navegador
          </button>
        )}
      </div>

      {error && <div style={{ color: THEME.danger, fontSize: 12, marginBottom: 12 }}>{error}</div>}

      {/* Tabla de casillas + porcentaje */}
      <div
        style={{
          background: THEME.surface,
          border: `1px solid ${THEME.border}`,
          borderRadius: 12,
          padding: "18px 18px",
          marginBottom: 18,
        }}
      >
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
          Registro diario
        </div>
        {loading ? (
          <div style={{ color: THEME.muted, fontSize: 13, padding: "16px 4px" }}>Cargando bitácora…</div>
        ) : habits.length === 0 ? (
          <div style={{ color: THEME.muted, fontSize: 13, padding: "16px 4px" }}>
            Aún no tienes hábitos. Agrega el primero arriba para empezar a marcar tu progreso de{" "}
            {MONTH_NAMES[month]}.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 640 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, paddingLeft: 4, marginBottom: 6 }}>
                <div style={{ width: 150, flexShrink: 0 }} />
                <div style={{ display: "flex", gap: 4, flex: 1 }}>
                  {Array.from({ length: daysCount }, (_, i) => i + 1).map((d) => (
                    <span
                      key={d}
                      style={{
                        width: 18,
                        textAlign: "center",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 9,
                        color: d === todayD ? THEME.brass : THEME.muted,
                        flexShrink: 0,
                      }}
                    >
                      {d}
                    </span>
                  ))}
                </div>
                <div style={{ width: 54, flexShrink: 0 }} />
                <div style={{ width: 22, flexShrink: 0 }} />
              </div>
              {habits.map((h) => (
                <HabitRow
                  key={h.id}
                  habit={h}
                  year={year}
                  month={month}
                  daysCount={daysCount}
                  todayD={todayD}
                  today={now}
                  onToggle={toggleEntry}
                  onDelete={deleteHabit}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {habits.length > 0 && (
        <>
          {/* Resumen */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
            <StatCard
              icon={<ListChecks size={14} />}
              label="Hábitos activos"
              value={habits.length}
            />
            <StatCard
              icon={<Check size={14} />}
              label="Completados este mes"
              value={totalCompletado}
              sub={`de ${totalPosible} posibles`}
            />
            <StatCard
              icon={<Clock size={14} />}
              label="Pendientes este mes"
              value={totalPendiente}
            />
            <StatCard
              icon={<Anchor size={14} />}
              label="Progreso promedio"
              value={`${avgProgress}%`}
              sub={isCurrentMonth ? "hasta hoy" : "del mes"}
            />
            <StatCard
              icon={<Anchor size={14} />}
              label="Mejor racha activa"
              value={`${bestStreak}d`}
            />
          </div>

          {/* Gráfico de barras: completados, pendientes y progreso */}
          <div
            style={{
              background: THEME.surface,
              border: `1px solid ${THEME.border}`,
              borderRadius: 12,
              padding: "18px 18px",
              marginBottom: 18,
            }}
          >
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              Completados, pendientes y progreso por hábito
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 10 }}>
              Barras: días marcados vs. días pendientes · Línea: % de progreso del hábito
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={barData} margin={{ top: 6, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke={THEME.border} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="nombre"
                  tick={{ fill: THEME.muted, fontSize: 11, fontFamily: "Inter" }}
                  axisLine={{ stroke: THEME.border }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: THEME.muted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fill: THEME.muted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: THEME.surface2 }} />
                <Legend wrapperStyle={{ fontSize: 12, color: THEME.inkDim }} />
                <Bar yAxisId="left" dataKey="Completados" stackId="a" fill={THEME.brass} radius={[0, 0, 0, 0]} />
                <Bar yAxisId="left" dataKey="Pendientes" stackId="a" fill={THEME.pending} radius={[4, 4, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="progreso"
                  name="Progreso"
                  stroke="#7A9B76"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#7A9B76" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de progreso diario */}
          <div
            style={{
              background: THEME.surface,
              border: `1px solid ${THEME.border}`,
              borderRadius: 12,
              padding: "18px 18px",
            }}
          >
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              Tu progreso día a día
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 10 }}>
              % de hábitos cumplidos cada día · línea punteada = tu promedio del mes
            </div>
            {progressData.length === 0 ? (
              <div style={{ color: THEME.muted, fontSize: 13, padding: "10px 4px" }}>
                Marca al menos un día para ver tu progreso aquí.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={progressData} margin={{ top: 6, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="progresoFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={THEME.brass} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={THEME.brass} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={THEME.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="dia"
                    tick={{ fill: THEME.muted, fontSize: 11 }}
                    axisLine={{ stroke: THEME.border }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: THEME.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) =>
                      active && payload && payload.length ? (
                        <div
                          style={{
                            background: THEME.surface2,
                            border: `1px solid ${THEME.border}`,
                            borderRadius: 8,
                            padding: "8px 12px",
                            fontFamily: "'Inter', sans-serif",
                            fontSize: 12,
                            color: THEME.ink,
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>Día {label}</div>
                          <div style={{ color: THEME.brass }}>{payload[0].value}% cumplido</div>
                        </div>
                      ) : null
                    }
                  />
                  <ReferenceLine
                    y={avgProgress}
                    stroke={THEME.muted}
                    strokeDasharray="4 4"
                    label={{ value: `Promedio ${avgProgress}%`, position: "insideTopRight", fill: THEME.muted, fontSize: 11 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="progreso"
                    stroke={THEME.brass}
                    strokeWidth={2}
                    fill="url(#progresoFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}
