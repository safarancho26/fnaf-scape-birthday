import { useCallback, useEffect, useRef, useState } from "react"

type Screen = "landing" | "boot" | "game" | "victory"
type ControlTab = "home" | "cameras" | "clues" | "door"

type Hint = {
  label: string
  title: string
  text: string
  reveal: string
}

type GameConfig = {
  code: string
  hints: Hint[]
  timerEnabled: boolean
  timerSeconds: number
  soundEnabled: boolean
  volume: number
  birthdayMessage: string
}

const defaultHints: Hint[] = [
  {
    label: "PISTA 01",
    title: "LAS CÁMARAS",
    text: "Observa el orden en que encontraste las señales.",
    reveal: "Empieza por la cámara que volvió a encenderse primero.",
  },
  {
    label: "PISTA 02",
    title: "LOS PERSONAJES",
    text: "No todos los personajes miraban en la misma dirección.",
    reveal: "Cuenta únicamente a los que miraban hacia la salida.",
  },
  {
    label: "PISTA 03",
    title: "EL RELOJ",
    text: "La hora de salida es más importante de lo que parece.",
    reveal: "El último minuto pertenece al turno, no al día siguiente.",
  },
  {
    label: "PISTA 04",
    title: "SISTEMA DE EMERGENCIA",
    text: "La última secuencia reúne todo lo que aprendiste.",
    reveal: "Une las respuestas anteriores en el mismo orden del archivo.",
  },
]

const defaultConfig: GameConfig = {
  code: "8321",
  hints: defaultHints,
  timerEnabled: true,
  timerSeconds: 60,
  soundEnabled: true,
  volume: 0.35,
  birthdayMessage: "¡FELIZ CUMPLEAÑOS, Ana!",
}

const CONFIG_KEY = "ultimo-turno-config"
const GAME_KEY = "ultimo-turno-session"
const HOST_PIN = "0404"

const cameras = [
  {
    id: "CAM 01",
    name: "SALÓN PRINCIPAL",
    status: "MOVIMIENTO",
    image: "/cam/cam1.png",
    credit: "Local Archive",
  },
  {
    id: "CAM 02",
    name: "PASILLO ESTE",
    status: "SEÑAL DÉBIL",
    image: "/cam/cam2.png",
    credit: "Local Archive",
  },
  {
    id: "CAM 03",
    name: "COCINA",
    status: "SIN MOVIMIENTO",
    image: "/cam/cam3.png",
    credit: "Local Archive",
  },
  {
    id: "CAM 04",
    name: "SALA TRASERA",
    status: "INTERFERENCIA",
    image: "/cam/cam4.png",
    credit: "Local Archive",
  },
]

function loadConfig(): GameConfig {
  try {
    return {
      ...defaultConfig,
      ...JSON.parse(sessionStorage.getItem(CONFIG_KEY) || ""),
    }
  } catch {
    return defaultConfig
  }
}

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
}

function useTone(config: GameConfig) {
  const audioContext = useRef<AudioContext | null>(null)

  return useCallback(
    (kind: "key" | "error" | "success") => {
      if (!config.soundEnabled) return
      const AudioCtor = window.AudioContext || window.webkitAudioContext
      if (!AudioCtor) return
      const context = audioContext.current || new AudioCtor()
      audioContext.current = context
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = kind === "error" ? "sawtooth" : "sine"
      oscillator.frequency.value =
        kind === "success" ? 880 : kind === "error" ? 110 : 460
      gain.gain.setValueAtTime(config.volume * 0.12, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + (kind === "success" ? 0.6 : 0.12),
      )
      oscillator.connect(gain).connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + (kind === "success" ? 0.6 : 0.12))
    },
    [config.soundEnabled, config.volume],
  )
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

function StatusStrip({ unlocked = false }: { unlocked?: boolean }) {
  return (
    <div className="status-strip" aria-label="Estado del sistema">
      <div>
        <span>ENERGÍA</span>
        <strong className="warning">23%</strong>
        <i className="battery">
          <b />
        </i>
      </div>
      <div>
        <span>CERRADURA</span>
        <strong className={unlocked ? "safe" : "danger"}>
          <i className="lock-icon" /> {unlocked ? "DESBLOQUEADA" : "BLOQUEADA"}
        </strong>
      </div>
      <div>
        <span>TURNO</span>
        <strong>{unlocked ? "06:00 AM" : "05:59 AM"}</strong>
      </div>
    </div>
  )
}

function TerminalFrame({
  children,
  state = "normal",
}: {
  children: React.ReactNode
  state?: "normal" | "error" | "success"
}) {
  return (
    <main className={`terminal terminal--${state}`}>
      <div className="terminal__bolts" aria-hidden="true" />
      <div className="terminal__screen">
        <div className="scanlines" aria-hidden="true" />
        <div className="screen-content">{children}</div>
      </div>
    </main>
  )
}

function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <TerminalFrame>
      <div className="system-bar">
        <div>
          <b>FAZBEAR — SISTEMA DE SEGURIDAD</b>
          <span>TERMINAL 04 // RED INTERNA</span>
        </div>
        <time>10/28/2026 · 11:58 PM</time>
      </div>
      <section className="landing">
        <div className="ghost-mark" aria-hidden="true">
          <span className="ghost-eye" />
          <span className="ghost-eye" />
        </div>
        <p className="eyebrow danger">ESTADO: BLOQUEADO</p>
        <h1>PROTOCOLO DE EMERGENCIA</h1>
        <p className="lead">
          La salida permanece bloqueada. Para restablecer el sistema, debes
          introducir el código de autorización del turno nocturno.
        </p>
        <button className="primary-button" onClick={onEnter}>
          ACCEDER AL TERMINAL <span>›</span>
        </button>
      </section>
      <StatusStrip />
    </TerminalFrame>
  )
}

function Boot({ progress }: { progress: number }) {
  const lines = [
    "Verificando módulos",
    "Cargando archivos",
    "Conectando cámaras",
    "Autorización de usuario",
    "Accediendo al archivo protegido",
  ]
  return (
    <TerminalFrame>
      <section className="boot">
        <p className="eyebrow">SECUENCIA T04-A // ARRANQUE MANUAL</p>
        <h2>
          INICIANDO SISTEMA<span className="blink">...</span>
        </h2>
        <div className="boot-lines">
          {lines.map((line, index) => (
            <p
              key={line}
              className={progress >= (index + 1) * 18 ? "done" : ""}
            >
              [{progress >= (index + 1) * 18 ? "✓" : " "}] {line}
            </p>
          ))}
        </div>
        <div className="progress-row">
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <b>{progress}%</b>
        </div>
      </section>
    </TerminalFrame>
  )
}

function HintCard({
  hint,
  open,
  onReveal,
}: {
  hint: Hint
  open: boolean
  onReveal: () => void
}) {
  return (
    <article className={`hint-card ${open ? "hint-card--open" : ""}`}>
      <p>{hint.label}</p>
      <h3>{hint.title}</h3>
      <div className="hint-visual" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="hint-copy">{open ? hint.reveal : hint.text}</p>
      <button onClick={onReveal} disabled={open}>
        {open ? "PISTA REVELADA" : "CONSULTAR PISTA"}
      </button>
    </article>
  )
}

function Keypad({
  value,
  attempts,
  onDigit,
  onDelete,
  onConfirm,
}: {
  value: string
  attempts: number
  onDigit: (digit: string) => void
  onDelete: () => void
  onConfirm: () => void
}) {
  return (
    <section className="keypad-panel" aria-labelledby="keypad-title">
      <div className="keypad-header">
        <div>
          <p className="eyebrow" id="keypad-title">
            INGRESAR CÓDIGO DE AUTORIZACIÓN
          </p>
          <div
            className="code-display"
            aria-label={`${value.length} de 4 dígitos introducidos`}
          >
            {[0, 1, 2, 3].map((position) => (
              <span key={position}>{value[position] ? "•" : "—"}</span>
            ))}
          </div>
        </div>
        <div className="attempts">
          <small>INTENTOS REGISTRADOS</small>
          <div>
            {[0, 1, 2, 3, 4].map((n) => (
              <i key={n} className={n < attempts ? "used" : ""} />
            ))}
          </div>
        </div>
      </div>
      <div className="keypad">
        <div className="number-grid">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((digit) => (
            <button key={digit} onClick={() => onDigit(digit)}>
              {digit}
            </button>
          ))}
        </div>
        <div className="key-actions">
          <button className="delete-button" onClick={onDelete}>
            ⌫ BORRAR
          </button>
          <button className="confirm-button" onClick={onConfirm}>
            CONFIRMAR ↵
          </button>
        </div>
      </div>
    </section>
  )
}

function ControlNav({
  active,
  onChange,
}: {
  active: ControlTab
  onChange: (tab: ControlTab) => void
}) {
  const items: { id: ControlTab; icon: string; label: string; meta: string }[] = [
    { id: "home", icon: "⌂", label: "INICIO", meta: "RESUMEN" },
    { id: "cameras", icon: "◉", label: "CÁMARAS", meta: "04 ACTIVAS" },
    { id: "clues", icon: "▤", label: "ARCHIVOS", meta: "01 RECUPERADO" },
    { id: "door", icon: "▣", label: "PUERTA", meta: "BLOQUEADA" },
  ]

  return (
    <nav className="control-nav" aria-label="Secciones del terminal">
      <div className="control-nav__brand">
        <span>FZ</span>
        <div>
          <b>CONTROL</b>
          <small>T04 / NOCTURNO</small>
        </div>
      </div>
      <div className="control-nav__items">
        {items.map((item) => (
          <button
            key={item.id}
            className={active === item.id ? "active" : ""}
            onClick={() => onChange(item.id)}
            aria-current={active === item.id ? "page" : undefined}
          >
            <i>{item.icon}</i>
            <span>
              <b>{item.label}</b>
              <small>{item.meta}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="control-nav__footer">
        <span className="online-dot" />
        RED LOCAL
        <small>CONEXIÓN ESTABLE</small>
      </div>
    </nav>
  )
}

function ControlHome({
  attempts,
  revealedCount,
  onNavigate,
}: {
  attempts: number
  revealedCount: number
  onNavigate: (tab: ControlTab) => void
}) {
  return (
    <section className="control-home">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PANEL DE CONTROL / VISTA GENERAL</p>
          <h2>ESTADO DEL RECINTO</h2>
        </div>
        <span className="shift-chip">TURNO 05:59 AM</span>
      </div>
      <div className="overview-grid">
        <button
          className="overview-card overview-card--camera"
          onClick={() => onNavigate("cameras")}
        >
          <span className="card-index">01 / VIGILANCIA</span>
          <div className="overview-camera">
            <img src={cameras[0].image} alt="" />
            <span>CAM 01 · EN VIVO</span>
          </div>
          <div className="overview-card__foot">
            <div>
              <b>RED DE CÁMARAS</b>
              <small>4 SEÑALES DISPONIBLES</small>
            </div>
            <i>›</i>
          </div>
        </button>
        <button className="overview-card" onClick={() => onNavigate("clues")}>
          <span className="card-index">02 / ARCHIVO</span>
          <div className="file-glyph">
            <span>REC</span>
            <i />
            <i />
            <i />
          </div>
          <div className="overview-card__foot">
            <div>
              <b>ÚLTIMA GRABACIÓN</b>
              <small>{revealedCount}/4 PISTAS CONSULTADAS</small>
            </div>
            <i>›</i>
          </div>
        </button>
        <button
          className="overview-card overview-card--locked"
          onClick={() => onNavigate("door")}
        >
          <span className="card-index">03 / SEGURIDAD</span>
          <div className="lock-glyph">
            <i className="lock-icon" />
            <span>BLOQUEADA</span>
          </div>
          <div className="overview-card__foot">
            <div>
              <b>PUERTA DE SALIDA</b>
              <small>{attempts} INTENTOS REGISTRADOS</small>
            </div>
            <i>›</i>
          </div>
        </button>
      </div>
      <div className="activity-log">
        <header>
          <b>REGISTRO DEL SISTEMA</b>
          <span>ACTUALIZACIÓN EN TIEMPO REAL</span>
        </header>
        <p>
          <time>05:58:42</time>
          <span className="safe">SISTEMA</span> Archivo T04 recuperado
          parcialmente.
        </p>
        <p>
          <time>05:58:17</time>
          <span className="warning">CÁMARA</span> Pérdida de señal intermitente
          en CAM 04.
        </p>
        <p>
          <time>05:57:03</time>
          <span className="danger">ALERTA</span> Mecanismo de salida bloqueado.
        </p>
      </div>
    </section>
  )
}

function CameraControl() {
  const [activeCamera, setActiveCamera] = useState(0)
  const camera = cameras[activeCamera]

  return (
    <section className="camera-control">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SISTEMA DE VIGILANCIA / SECTOR A</p>
          <h2>CÁMARAS DE SEGURIDAD</h2>
        </div>
        <span className="recording-chip">
          <i /> REC
        </span>
      </div>
      <div className="camera-workspace">
        <div className="main-feed">
          <img src={camera.image} alt={`Vista de seguridad: ${camera.name}`} />
          <div className="camera-noise" />
          <div className="feed-corners" />
          <header>
            <b>
              {camera.id} — {camera.name}
            </b>
            <span>05:59:{String(27 + activeCamera).padStart(2, "0")} AM</span>
          </header>
          <footer>
            <span className={camera.status === "MOVIMIENTO" ? "danger" : ""}>
              {camera.status}
            </span>
            <small>FOTO: {camera.credit} / UNSPLASH</small>
          </footer>
        </div>
        <aside className="camera-list">
          <p>SELECCIONAR SEÑAL</p>
          {cameras.map((item, index) => (
            <button
              key={item.id}
              className={activeCamera === index ? "active" : ""}
              onClick={() => setActiveCamera(index)}
            >
              <img src={item.image} alt="" />
              <span>
                <b>{item.id}</b>
                <small>{item.name}</small>
              </span>
              <i />
            </button>
          ))}
        </aside>
      </div>
      <div className="camera-alert">
        <span>!</span>
        <p>
          <b>ANOMALÍA DETECTADA</b> La secuencia de cámaras podría contener
          parte del código de autorización.
        </p>
      </div>
    </section>
  )
}

function ClueArchive({
  config,
  revealed,
  onReveal,
  onGoToDoor,
}: {
  config: GameConfig
  revealed: number[]
  onReveal: (index: number) => void
  onGoToDoor: () => void
}) {
  return (
    <section className="archive archive--tab">
      <div className="section-heading">
        <div>
          <p className="eyebrow">ARCHIVO RECUPERADO / ÚLTIMA GRABACIÓN</p>
          <h2>EVIDENCIA DEL TURNO</h2>
        </div>
        <span className="shift-chip">{revealed.length}/4 CONSULTADAS</span>
      </div>
      <blockquote>
        “El antiguo guardia dejó una última nota antes de desaparecer. La puerta
        no responde a cualquier código. Recuerda lo que descubriste durante la
        noche. La respuesta siempre estuvo frente a ti.”
      </blockquote>
      <div className="hint-grid">
        {config.hints.map((hint, index) => (
          <HintCard
            key={hint.label}
            hint={hint}
            open={revealed.includes(index)}
            onReveal={() => onReveal(index)}
          />
        ))}
      </div>
      <button className="archive-next" onClick={onGoToDoor}>
        IR A CONSOLA DE DESBLOQUEO <span>›</span>
      </button>
    </section>
  )
}

function Game({
  config,
  attempts,
  setAttempts,
  onWin,
}: {
  config: GameConfig
  attempts: number
  setAttempts: React.Dispatch<React.SetStateAction<number>>
  onWin: () => void
}) {
  const [code, setCode] = useState("")
  const [revealed, setRevealed] = useState<number[]>([])
  const [error, setError] = useState(false)
  const [seconds, setSeconds] = useState(config.timerSeconds)
  const [activeTab, setActiveTab] = useState<ControlTab>("home")
  const tone = useTone(config)

  useEffect(() => {
    if (!config.timerEnabled || seconds <= 0) return
    const timer = window.setInterval(
      () => setSeconds((value) => value - 1),
      1000,
    )
    return () => window.clearInterval(timer)
  }, [config.timerEnabled, seconds])

  const addDigit = useCallback(
    (digit: string) => {
      setError(false)
      setCode((current) => (current.length < 4 ? current + digit : current))
      tone("key")
    },
    [tone],
  )

  const submit = useCallback(() => {
    if (code.length !== 4) return
    if (code === config.code) {
      tone("success")
      onWin()
    } else {
      tone("error")
      setAttempts((value) => value + 1)
      setError(true)
      setCode("")
    }
  }, [code, config.code, onWin, setAttempts, tone])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (activeTab !== "door") return
      if (/^[0-9]$/.test(event.key)) addDigit(event.key)
      if (event.key === "Backspace") setCode((value) => value.slice(0, -1))
      if (event.key === "Enter") submit()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [activeTab, addDigit, submit])

  return (
    <TerminalFrame state={error ? "error" : "normal"}>
      <header className="game-header control-header">
        <div>
          <span className="online-dot" /> SISTEMA DE SEGURIDAD — TERMINAL 04
        </div>
        <div className="header-status">
          <span>
            CERRADURA <b>BLOQUEADA</b>
          </span>
          <span>
            ENERGÍA <b>23%</b>
          </span>
        </div>
        {config.timerEnabled && (
          <div className={`timer ${seconds <= 15 ? "timer--warning" : ""}`}>
            TIEMPO <b>{formatTime(seconds)}</b>
          </div>
        )}
      </header>
      <div className="control-layout">
        <ControlNav active={activeTab} onChange={setActiveTab} />
        <div className="game-scroll control-content">
          {seconds === 0 && (
            <div className="timeout-alert">PROTOCOLO DE EMERGENCIA AGOTADO</div>
          )}
          {activeTab === "home" && (
            <ControlHome
              attempts={attempts}
              revealedCount={revealed.length}
              onNavigate={setActiveTab}
            />
          )}
          {activeTab === "cameras" && <CameraControl />}
          {activeTab === "clues" && (
            <ClueArchive
              config={config}
              revealed={revealed}
              onReveal={(index) =>
                setRevealed((current) =>
                  current.includes(index) ? current : [...current, index],
                )
              }
              onGoToDoor={() => setActiveTab("door")}
            />
          )}
          {activeTab === "door" && (
            <section className="door-console">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">CONTROL DE ACCESO / SALIDA NORTE</p>
                  <h2>CONSOLA DE DESBLOQUEO</h2>
                </div>
                <span className="locked-chip">BLOQUEADA</span>
              </div>
              <p className="door-instruction">
                Introduce la secuencia de cuatro dígitos recuperada durante el
                turno nocturno.
              </p>
              {error && (
                <div className="error-message" role="alert">
                  <span className="alert-symbol">!</span>
                  <div>
                    <h3>ACCESO DENEGADO. CÓDIGO NO RECONOCIDO</h3>
                    <p>
                      El sistema ha registrado tu intento. La puerta continúa
                      bloqueada.
                    </p>
                  </div>
                </div>
              )}
              <Keypad
                value={code}
                attempts={attempts}
                onDigit={addDigit}
                onDelete={() => setCode((value) => value.slice(0, -1))}
                onConfirm={submit}
              />
              <button
                className="back-to-clues"
                onClick={() => setActiveTab("clues")}
              >
                ‹ VOLVER A CONSULTAR LAS PISTAS
              </button>
            </section>
          )}
        </div>
      </div>
    </TerminalFrame>
  )
}

function Victory({
  config,
  replayKey,
  onReplay,
}: {
  config: GameConfig
  replayKey: number
  onReplay: () => void
}) {
  const [showBirthday, setShowBirthday] = useState(false)

  useEffect(() => {
    setShowBirthday(false)
    const timer = window.setTimeout(() => setShowBirthday(true), 2000)
    return () => window.clearTimeout(timer)
  }, [replayKey])

  return (
    <TerminalFrame state="success">
      <section className="victory" key={replayKey}>
        <div className="success-ring" aria-hidden="true">
          <span>✓</span>
        </div>
        <p className="eyebrow">PROTOCOLO T04 // AUTORIZACIÓN</p>
        <h1>AUTORIZACIÓN ACEPTADA</h1>
        <div className="unlock-status">
          <p>
            PUERTA <strong>DESBLOQUEADA</strong>
          </p>
          <p>TURNO COMPLETADO</p>
          <time>06:00 AM</time>
        </div>
        <div className="door" aria-label="Puerta de seguridad abierta">
          <div className="door-light" />
          <div className="door-panel" />
        </div>
        <div className={`birthday ${showBirthday ? "birthday--visible" : ""}`}>
          <p>Lo lograste. Has sobrevivido al último turno.</p>
          <h2>{config.birthdayMessage}</h2>
          <p>Has demostrado que eres el empleado de la noche.</p>
        </div>
        <button className="secondary-button" onClick={onReplay}>
          ↻ VOLVER A VER EL FINAL
        </button>
      </section>
    </TerminalFrame>
  )
}

function OrganizerPanel({
  config,
  setConfig,
  onClose,
  onReset,
  onResetAttempts,
  onTestVictory,
}: {
  config: GameConfig
  setConfig: (config: GameConfig) => void
  onClose: () => void
  onReset: () => void
  onResetAttempts: () => void
  onTestVictory: () => void
}) {
  const [pin, setPin] = useState("")
  const [authenticated, setAuthenticated] = useState(false)
  const [draft, setDraft] = useState(config)

  const updateHint = (
    index: number,
    field: "text" | "reveal",
    value: string,
  ) => {
    setDraft((current) => ({
      ...current,
      hints: current.hints.map((hint, hintIndex) =>
        hintIndex === index ? { ...hint, [field]: value } : hint,
      ),
    }))
  }

  if (!authenticated) {
    return (
      <div className="modal-backdrop">
        <section
          className="host-auth"
          role="dialog"
          aria-modal="true"
          aria-labelledby="host-title"
        >
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
          <p className="eyebrow">ÁREA RESTRINGIDA</p>
          <h2 id="host-title">ACCESO DE ANFITRIÓN</h2>
          <p>Introduce el PIN de administración para modificar la sesión.</p>
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder="••••"
          />
          <button
            className="primary-button"
            onClick={() => setAuthenticated(pin === HOST_PIN)}
          >
            VERIFICAR IDENTIDAD
          </button>
          {pin.length === 4 && pin !== HOST_PIN && (
            <p className="auth-error">PIN NO RECONOCIDO</p>
          )}
        </section>
      </div>
    )
  }

  return (
    <div className="modal-backdrop">
      <section
        className="organizer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <header>
          <div>
            <p className="eyebrow">TERMINAL DE ADMINISTRACIÓN</p>
            <h2 id="settings-title">CONFIGURACIÓN DEL JUEGO</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>
        <div className="settings-grid">
          <label>
            CÓDIGO CORRECTO
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={draft.code}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  code: event.target.value.replace(/\D/g, ""),
                })
              }
            />
          </label>
          <label>
            DURACIÓN (SEGUNDOS)
            <input
              type="number"
              min={15}
              max={600}
              value={draft.timerSeconds}
              onChange={(event) =>
                setDraft({ ...draft, timerSeconds: Number(event.target.value) })
              }
            />
          </label>
          <label className="toggle-row">
            TEMPORIZADOR
            <input
              type="checkbox"
              checked={draft.timerEnabled}
              onChange={(event) =>
                setDraft({ ...draft, timerEnabled: event.target.checked })
              }
            />
          </label>
          <label className="toggle-row">
            EFECTOS DE SONIDO
            <input
              type="checkbox"
              checked={draft.soundEnabled}
              onChange={(event) =>
                setDraft({ ...draft, soundEnabled: event.target.checked })
              }
            />
          </label>
          <label className="wide">
            VOLUMEN
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={draft.volume}
              onChange={(event) =>
                setDraft({ ...draft, volume: Number(event.target.value) })
              }
            />
          </label>
          <label className="wide">
            MENSAJE DE CUMPLEAÑOS
            <select
              value={draft.birthdayMessage}
              onChange={(event) =>
                setDraft({ ...draft, birthdayMessage: event.target.value })
              }
            >
              <option>¡FELIZ CUMPLEAÑOS, GUARDIA!</option>
              <option>¡MISIÓN CUMPLIDA, CUMPLEAÑERO!</option>
              <option>¡HAS SOBREVIVIDO A TU CUMPLEAÑOS!</option>
            </select>
          </label>
        </div>
        <div className="hint-settings">
          <h3>TEXTOS DE LAS PISTAS</h3>
          {draft.hints.map((hint, index) => (
            <div key={hint.label}>
              <b>
                {hint.label} — {hint.title}
              </b>
              <textarea
                value={hint.text}
                onChange={(event) =>
                  updateHint(index, "text", event.target.value)
                }
              />
              <textarea
                value={hint.reveal}
                onChange={(event) =>
                  updateHint(index, "reveal", event.target.value)
                }
              />
            </div>
          ))}
        </div>
        <p className="security-note">
          Nota: en esta versión estática, la validación del lado del cliente es
          recreativa y no constituye una medida de seguridad real.
        </p>
        <div className="organizer-actions">
          <button onClick={onResetAttempts}>RESTABLECER INTENTOS</button>
          <button onClick={onReset}>REINICIAR PARTIDA</button>
          <button onClick={onTestVictory}>PROBAR VICTORIA</button>
          <button
            className="save-button"
            disabled={draft.code.length !== 4}
            onClick={() => {
              setConfig(draft)
              onClose()
            }}
          >
            GUARDAR CAMBIOS
          </button>
        </div>
      </section>
    </div>
  )
}

export default function App() {
  const [config, setConfigState] = useState<GameConfig>(loadConfig)
  const [screen, setScreen] = useState<Screen>(() => {
    try {
      return (
        JSON.parse(sessionStorage.getItem(GAME_KEY) || "{}").screen as Screen ||
        "landing"
      )
    } catch {
      return "landing"
    }
  })
  const [attempts, setAttempts] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(GAME_KEY) || "{}").attempts || 0
    } catch {
      return 0
    }
  })
  const [bootProgress, setBootProgress] = useState(0)
  const [hostOpen, setHostOpen] = useState(false)
  const [replayKey, setReplayKey] = useState(0)

  useEffect(() => {
    sessionStorage.setItem(GAME_KEY, JSON.stringify({ screen, attempts }))
  }, [screen, attempts])

  useEffect(() => {
    const openHost = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "o")
        setHostOpen(true)
    }
    window.addEventListener("keydown", openHost)
    return () => window.removeEventListener("keydown", openHost)
  }, [])

  useEffect(() => {
    if (screen !== "boot") return
    setBootProgress(0)
    const interval = window.setInterval(() => {
      setBootProgress((value) => {
        const next = Math.min(value + 4, 100)
        if (next === 100) {
          window.clearInterval(interval)
          window.setTimeout(() => setScreen("game"), 450)
        }
        return next
      })
    }, 70)
    return () => window.clearInterval(interval)
  }, [screen])

  const setConfig = (nextConfig: GameConfig) => {
    setConfigState(nextConfig)
    sessionStorage.setItem(CONFIG_KEY, JSON.stringify(nextConfig))
  }

  const resetGame = () => {
    setAttempts(0)
    setScreen("landing")
    setHostOpen(false)
    sessionStorage.removeItem(GAME_KEY)
  }

  return (
    <div className="app-shell">
      <div className="ambient-noise" aria-hidden="true" />
      {screen === "landing" && <Landing onEnter={() => setScreen("boot")} />}
      {screen === "boot" && <Boot progress={bootProgress} />}
      {screen === "game" && (
        <Game
          config={config}
          attempts={attempts}
          setAttempts={setAttempts}
          onWin={() => setScreen("victory")}
        />
      )}
      {screen === "victory" && (
        <Victory
          config={config}
          replayKey={replayKey}
          onReplay={() => setReplayKey((value) => value + 1)}
        />
      )}
      <button
        className="host-trigger"
        onClick={() => setHostOpen(true)}
        aria-label="Abrir configuración del anfitrión"
      >
        T04 · SYS
      </button>
      {hostOpen && (
        <OrganizerPanel
          config={config}
          setConfig={setConfig}
          onClose={() => setHostOpen(false)}
          onReset={resetGame}
          onResetAttempts={() => setAttempts(0)}
          onTestVictory={() => {
            setScreen("victory")
            setHostOpen(false)
            setReplayKey((value) => value + 1)
          }}
        />
      )}
    </div>
  )
}
