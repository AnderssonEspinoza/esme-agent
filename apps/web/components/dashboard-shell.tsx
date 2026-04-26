import type { DeliveryChannel, Priority } from "@xio/shared/domain";

import { createTaskAction, deleteTaskAction, markTaskDoneAction } from "@/app/actions";
import type { DashboardViewModel } from "@/lib/dashboard-format";
import { isSupabaseConfigured } from "@/lib/supabase-rest";

function priorityLabel(priority: Priority) {
  if (priority === "critical") return "Critico";
  if (priority === "high") return "Alto";
  if (priority === "medium") return "Medio";
  return "Bajo";
}

type DashboardShellProps = {
  activeChannels: DeliveryChannel[];
  reminderSummary: {
    total: number;
    taskRules: number;
    examRules: number;
  };
  view: DashboardViewModel;
};

function BotOrb() {
  return (
    <div className="bot-orb" aria-hidden="true">
      <div className="bot-head">
        <div className="bot-face">
          <span className="bot-eye" />
          <span className="bot-eye" />
          <span className="bot-smile" />
        </div>
      </div>
      <div className="bot-core" />
      <div className="bot-arm bot-arm-left" />
      <div className="bot-arm bot-arm-right" />
    </div>
  );
}

export function DashboardShell({
  activeChannels,
  reminderSummary,
  view,
}: DashboardShellProps) {
  const supabaseReady = isSupabaseConfigured();

  return (
    <main className="page-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <div className="dashboard">
        <section className="hero-shell">
          <div className="hero-copy glass-panel">
            <span className="hero-tag">XIO / always-on sidekick</span>
            <h1>Tu asistente personal debería verse como alguien que vive contigo.</h1>
            <p>
              XIO organiza tu trabajo, universidad, proyectos y recordatorios con presencia de
              app real: clara en desktop, rápida en móvil y lo bastante viva para sentirse como tu
              copiloto diario.
            </p>

            <div className="hero-stats">
              <article className="stat-chip">
                <span>Recordatorios activos</span>
                <strong>{reminderSummary.total}</strong>
              </article>
              <article className="stat-chip">
                <span>Canales listos</span>
                <strong>{activeChannels.length}</strong>
              </article>
            </div>

            <div className="hero-actions">
              <a className="primary-button" href="#captura">
                Hablar con XIO
              </a>
              <a className="secondary-button" href="#hub">
                Ver mi hub
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <div className="device-stack">
              <section className="phone-card phone-card-bot">
                <div className="phone-bar">
                  <span>9:41</span>
                  <span>XIO</span>
                </div>
                <div className="phone-main">
                  <BotOrb />
                  <div className="phone-copy">
                    <strong>Siempre pendiente.</strong>
                    <span>Siempre sincronizado contigo.</span>
                  </div>
                </div>
                <div className="phone-dock">
                  <span className="dock-pill active" />
                  <span className="dock-pill" />
                  <span className="dock-pill" />
                </div>
              </section>

              <section className="phone-card phone-card-chat" id="captura">
                <div className="phone-bar">
                  <span>Instant lane</span>
                  <span className="status-dot" />
                </div>
                <div className="chat-thread">
                  <article className="chat-bubble inbound">
                    <span>¿Qué ganamos hoy?</span>
                  </article>
                  <article className="chat-bubble outbound">
                    <span>Estudiar redes a las 8 pm y revisar LinkedIn.</span>
                  </article>
                  <article className="chat-bubble inbound ghost-inbound">
                    <span>Te dejé listo un bloque para universidad, uno para trabajo y uno para postulación.</span>
                  </article>
                </div>

                <div className="prompt-row">
                  {view.assistantPrompts.map((prompt) => (
                    <span className="prompt-chip" key={prompt}>
                      {prompt}
                    </span>
                  ))}
                </div>

                <form action={createTaskAction} className="capture-form">
                  <input
                    className="chat-input"
                    name="title"
                    placeholder="Escribe una tarea para XIO..."
                    required
                  />
                  <textarea
                    className="chat-textarea"
                    name="description"
                    placeholder="Más contexto: curso, proyecto, recordatorio, idea..."
                  />
                  <div className="capture-meta">
                    <input className="mini-input" type="datetime-local" name="dueAt" />
                    <select className="mini-input" name="priority" defaultValue="medium">
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                      <option value="critical">Critica</option>
                    </select>
                  </div>
                  <button className="send-button" type="submit">
                    Crear
                  </button>
                </form>
              </section>
            </div>
          </div>
        </section>

        <section className="desktop-hub" id="hub">
          <div className="hub-topbar glass-panel">
            <div>
              <span className="section-kicker">Mission Control</span>
              <h2>XIO Hub</h2>
            </div>
            <div className="hub-badges">
              <span className="soft-badge">{view.metrics.pendingTasks} pendientes</span>
              <span className="soft-badge">{view.metrics.examsAtRisk} riesgos</span>
              <span className="soft-badge">{view.metrics.projectsInProgress} proyectos</span>
            </div>
          </div>

          <div className="hub-grid">
            <section className="hub-panel tasks-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">Next up</span>
                  <h3>Lo siguiente para hoy</h3>
                </div>
                <span className="panel-pill">{reminderSummary.taskRules} reglas task</span>
              </div>

              <div className="task-list">
                {view.tasks.map((task) => (
                  <article className="task-card-premium" key={task.id}>
                    <div className="task-card-top">
                      <div>
                        <strong>{task.title}</strong>
                        <span className="context-line">{task.context}</span>
                      </div>
                      <span
                        className={`priority-chip ${
                          task.priority === "critical"
                            ? "is-critical"
                            : task.priority === "high"
                              ? "is-high"
                              : ""
                        }`}
                      >
                        {priorityLabel(task.priority)}
                      </span>
                    </div>

                    <div className="task-card-bottom">
                      <div className="task-meta-line">
                        <span>{task.deadline}</span>
                        <span>modo {task.reminderStrategy}</span>
                      </div>
                      <div className="task-actions">
                        <form action={markTaskDoneAction}>
                          <input type="hidden" name="taskId" value={task.id} />
                          <button className="ghost-button" type="submit">
                            Completar
                          </button>
                        </form>
                        <form action={deleteTaskAction}>
                          <input type="hidden" name="taskId" value={task.id} />
                          <button className="ghost-button danger-button" type="submit">
                            Quitar
                          </button>
                        </form>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="hub-panel side-column">
              <article className="mini-console">
                <span className="section-kicker">Presence</span>
                <h3>XIO en tus superficies</h3>
                <div className="channel-list">
                  {activeChannels.map((channel) => (
                    <span className="channel-chip" key={channel}>
                      {channel.replace("_", " ")}
                    </span>
                  ))}
                </div>
                {!supabaseReady ? (
                  <p className="muted">
                    Aún estás en modo semilla. Apenas conectes Supabase, esta misma interfaz pasa a
                    guardar y leer tus datos reales.
                  </p>
                ) : (
                  <p className="muted">
                    Supabase conectado. XIO ya puede escribir tareas reales desde esta pantalla.
                  </p>
                )}
              </article>

              <article className="mini-console">
                <span className="section-kicker">Automation</span>
                <h3>Recordatorios por defecto</h3>
                <div className="automation-grid">
                  <div className="automation-pill">
                    <strong>{reminderSummary.taskRules}</strong>
                    <span>Tareas</span>
                  </div>
                  <div className="automation-pill">
                    <strong>{reminderSummary.examRules}</strong>
                    <span>Exámenes</span>
                  </div>
                </div>
              </article>
            </section>
          </div>
        </section>

        <section className="lower-grid">
          <section className="hub-panel timeline-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Timeline</span>
                <h3>Agenda del día</h3>
              </div>
            </div>

            <div className="timeline-premium">
              {view.timeline.map((item) => (
                <article className="timeline-card" key={item.id}>
                  <div className="timeline-time">{item.time}</div>
                  <div className="timeline-body">
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="hub-panel risks-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Risk radar</span>
                <h3>Exámenes y focos rojos</h3>
              </div>
            </div>

            <div className="risk-board">
              {view.risks.map((risk) => (
                <article className="risk-card" key={risk.id}>
                  <span className="risk-days">{risk.daysLeft}</span>
                  <div>
                    <strong>{risk.exam}</strong>
                    <span>{risk.status}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>

        <section className="lower-grid project-extension">
          <section className="hub-panel project-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Momentum</span>
                <h3>Proyectos en movimiento</h3>
              </div>
            </div>

            <div className="project-board">
              {view.projects.map((project) => (
                <article className="project-card" key={project.id}>
                  <div className="project-card-top">
                    <strong>{project.title}</strong>
                    <span>{project.progressPercent}%</span>
                  </div>
                  <div className="project-progress">
                    <span style={{ width: `${project.progressPercent}%` }} />
                  </div>
                  <p>Entrega objetivo: {project.dueLabel}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="hub-panel assistant-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Assistant mood</span>
                <h3>XIO contigo</h3>
              </div>
            </div>

            <div className="assistant-stage">
              <BotOrb />
              <div className="assistant-copy">
                <strong>No solo recuerda cosas. Te acompaña.</strong>
                <p>
                  La siguiente capa será una conversación real con memoria, resumen del día y
                  sugerencias activas según universidad, trabajo y búsqueda laboral.
                </p>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
