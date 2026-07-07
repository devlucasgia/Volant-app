import { forwardRef } from "react";
import { Check, TrendingUp, Gauge } from "lucide-react";
import volantSymbol from "@/assets/volant-symbol-header.png";

export type ShareCardFormat = "story" | "square";
export type ShareCardMode = "liquido" | "bruto";

export interface ShareApp {
  name: string;
  value: string;
  pct: number;
  color: string;
  initial: string;
}

export interface ShareResultCardProps {
  format: ShareCardFormat;
  mode: ShareCardMode;
  periodLabel: string;
  dateLabel: string;
  heroValue: string;
  metaBatida: boolean;
  metaExcedente?: string;
  metaLabel: string;
  metaPct: number;
  perHour: string;
  perKm: string;
  jornada: string;
  apps: ShareApp[];
  gastosLabel?: string;
  gastosValue?: string;
  /** Se true, renderiza em 1080px de largura. Caso contrário, no tamanho de design (280/300px). */
  exportSize?: boolean;
}

// Tokens do CSS de referência (volant_card_v6.2.html)
const TOKENS = {
  success: "hsl(142, 71%, 45%)",
  successStrong: "hsl(142, 76%, 55%)",
  gross: "hsl(215, 70%, 60%)",
  grossStrong: "hsl(215, 80%, 62%)",
  warning: "hsl(38, 92%, 55%)",
  mutedFg: "hsl(215, 20%, 65%)",
  fg: "hsl(210, 40%, 98%)",
  destructive: "hsl(0, 70%, 55%)",
  borderSoft: "hsla(210, 40%, 98%, 0.08)",
  borderSofter: "hsla(210, 40%, 98%, 0.07)",
  panel: "hsla(210, 40%, 98%, 0.04)",
  panel2: "hsla(210, 40%, 98%, 0.06)",
  divider: "hsla(210, 40%, 98%, 0.1)",
};

const DESIGN_STORY_W = 280;
const DESIGN_STORY_H = 498;
const DESIGN_SQUARE_W = 300;
const DESIGN_SQUARE_H = 300;

/** Fatia "R$ 1.234,56" em partes para estilar (R$ e centavos menores). */
function splitCurrency(v: string): { rs: string; int: string; cents: string } {
  const trimmed = (v || "").trim();
  const m = trimmed.match(/^(R\$)\s*(.+?)(,\d{2})?$/);
  if (!m) return { rs: "", int: trimmed, cents: "" };
  return { rs: m[1] || "", int: (m[2] || "").trim(), cents: m[3] || "" };
}

export const ShareResultCard = forwardRef<HTMLDivElement, ShareResultCardProps>(function ShareResultCard(
  {
    format, mode, periodLabel, dateLabel, heroValue,
    metaBatida, metaExcedente, metaLabel, metaPct,
    perHour, perKm, jornada, apps, gastosLabel, gastosValue,
    exportSize = false,
  },
  ref,
) {
  const designW = format === "story" ? DESIGN_STORY_W : DESIGN_SQUARE_W;
  const designH = format === "story" ? DESIGN_STORY_H : DESIGN_SQUARE_H;
  const targetW = exportSize ? 1080 : designW;
  const S = targetW / designW;
  const px = (n: number) => `${n * S}px`;

  const isLiquid = mode === "liquido";
  const themeMain = isLiquid ? TOKENS.success : TOKENS.gross;
  const themeStrong = isLiquid ? TOKENS.successStrong : TOKENS.grossStrong;
  const eyebrowText = isLiquid ? "LUCRO LÍQUIDO" : "GANHO BRUTO";
  const EyebrowIcon = isLiquid ? Check : TrendingUp;

  const cardWidth = designW * S;
  const cardHeight = designH * S;

  // Background (gradientes com glow reforçado, mantendo hue original)
  const bg = isLiquid
    ? "radial-gradient(130% 75% at 78% -5%, hsla(142,71%,45%,0.42), transparent 55%), radial-gradient(90% 70% at -12% 108%, hsla(142,76%,55%,0.16), transparent 48%), linear-gradient(168deg, #0f1720, #0a0e14)"
    : "radial-gradient(130% 75% at 78% -5%, hsla(215,70%,60%,0.44), transparent 55%), radial-gradient(90% 70% at -12% 108%, hsla(215,70%,60%,0.16), transparent 48%), linear-gradient(168deg, #0f1720, #0a0e14)";

  const glow = isLiquid
    ? "radial-gradient(circle, hsla(142,76%,55%,0.32), transparent 60%)"
    : "radial-gradient(circle, hsla(215,70%,60%,0.34), transparent 60%)";

  const goalFillBg = isLiquid
    ? "linear-gradient(90deg, hsla(142,71%,38%,0.9), hsla(142,76%,52%,0.85))"
    : "linear-gradient(90deg, hsla(215,70%,48%,0.9), hsla(215,80%,62%,0.85))";

  const goalInColor = isLiquid ? "#04140b" : "#041018";

  const heroFontSize = format === "story" ? 45 : 39;
  const { rs, int, cents } = splitCurrency(heroValue);

  const goalPctClamped = Math.max(0, Math.min(100, metaPct));
  const goalPctLabel = `${Math.round(metaPct)}%`;

  const showApps = format === "story" && apps.length > 0;
  const showGastos = format === "story" && !!gastosValue;
  const padding = format === "story"
    ? `${px(24)} ${px(22)} ${px(18)}`
    : `${px(22)} ${px(22)} ${px(18)}`;
  const radius = format === "story" ? px(26) : px(22);

  return (
    <div
      ref={ref}
      style={{
        width: `${cardWidth}px`,
        height: `${cardHeight}px`,
        borderRadius: exportSize ? 0 : radius,
        padding,
        position: "relative",
        overflow: "hidden",
        color: TOKENS.fg,
        background: bg,
        border: `1px solid ${TOKENS.borderSoft}`,
        boxShadow: `0 ${px(30)} ${px(80)} -${px(30)} #000, inset 0 1px 0 hsla(210,40%,98%,0.06)`,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        fontVariantNumeric: "tabular-nums",
        WebkitFontSmoothing: "antialiased",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      {/* Glow decorativo (::before do CSS) */}
      <div
        aria-hidden
        style={{
          position: "absolute", top: "-35%", right: "-25%",
          width: "75%", height: "75%", borderRadius: "999px",
          background: glow, filter: `blur(${px(42)})`, pointerEvents: "none",
        }}
      />

      {/* Head */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: px(14), position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: px(7) }}>
          <img
            src={volantSymbol}
            alt=""
            crossOrigin="anonymous"
            style={{ width: px(22), height: px(22), borderRadius: "999px", objectFit: "cover", flexShrink: 0 }}
          />
          <span style={{ fontSize: px(11.5), fontWeight: 500, letterSpacing: "0.14em" }}>VOLANT</span>
        </div>
        <div style={{
          textAlign: "right",
          fontSize: px(8),
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "hsla(215,20%,65%,0.8)",
          lineHeight: 1.5,
          whiteSpace: "nowrap",
        }}>
          <div>{periodLabel}</div>
          <div style={{ opacity: 0.85 }}>{dateLabel}</div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", position: "relative" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: px(6),
          fontSize: px(9.5), fontWeight: 800, letterSpacing: "0.16em",
          textTransform: "uppercase", color: themeMain,
        }}>
          <EyebrowIcon size={13 * S} strokeWidth={3} />
          <span>{eyebrowText}</span>
        </div>

        <div style={{
          fontSize: px(heroFontSize),
          fontWeight: 800,
          letterSpacing: "-0.025em",
          lineHeight: 1,
          marginTop: px(9),
          whiteSpace: "nowrap",
        }}>
          {rs && (
            <span style={{ fontSize: "0.42em", fontWeight: 700, opacity: 0.7, marginRight: px(4), verticalAlign: "0.22em" }}>
              {rs}
            </span>
          )}
          <span>{int}</span>
          {cents && (
            <span style={{ fontSize: "0.55em", fontWeight: 700, opacity: 0.85 }}>{cents}</span>
          )}
        </div>

        {/* Goal — faixa de conquista */}
        <div style={{ marginTop: px(20) }}>
          <div style={{
            position: "relative",
            height: px(34),
            borderRadius: px(12),
            background: TOKENS.panel2,
            overflow: "hidden",
            border: `1px solid ${TOKENS.borderSofter}`,
          }}>
            <div style={{
              position: "absolute", top: 0, bottom: 0, left: 0,
              width: `${goalPctClamped}%`,
              minWidth: goalPctClamped > 0 ? px(80) : 0,
              borderRadius: px(11),
              background: goalFillBg,
              display: "flex", alignItems: "center",
              padding: `0 ${px(13)}`,
              overflow: "hidden",
            }}>
              {/* brilho da direita */}
              <div aria-hidden style={{
                position: "absolute", right: 0, top: 0, bottom: 0, width: px(60),
                background: "linear-gradient(90deg, transparent, hsla(210,40%,98%,0.25))",
              }} />
              <div style={{
                position: "relative",
                display: "flex", alignItems: "center", gap: px(7),
                fontSize: px(11.5), fontWeight: 800, color: goalInColor,
                whiteSpace: "nowrap",
              }}>
                {metaBatida ? (
                  <>
                    <Check size={14 * S} strokeWidth={3} />
                    <span>Meta batida{metaExcedente ? ` · ${metaExcedente}` : ""}</span>
                  </>
                ) : (
                  <span>{goalPctLabel}</span>
                )}
              </div>
            </div>
            <div style={{
              position: "absolute", right: px(13), top: 0, bottom: 0,
              display: "flex", alignItems: "center",
              fontSize: px(13), fontWeight: 900, color: TOKENS.fg,
              textShadow: "0 1px 2px rgba(0,0,0,0.35)",
            }}>
              {goalPctLabel}
            </div>
          </div>
          <div style={{
            marginTop: px(9),
            display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: px(10),
            fontSize: px(10.5), color: "hsla(215,20%,65%,0.9)", whiteSpace: "nowrap",
          }}>
            <span style={{ fontWeight: 600, color: "hsla(215,20%,65%,0.7)" }}>{metaLabel}</span>
            {metaBatida && metaExcedente ? (
              <span style={{ color: themeStrong, fontWeight: 800 }}>{metaExcedente}</span>
            ) : null}
          </div>
        </div>

        {/* Performance */}
        <div style={{
          marginTop: px(20),
          display: "flex", alignItems: "center", gap: px(6),
          fontSize: px(9), fontWeight: 800, letterSpacing: "0.16em",
          textTransform: "uppercase", color: "hsla(215,20%,65%,0.8)",
        }}>
          <Gauge size={11 * S} strokeWidth={2.5} />
          <span>Performance</span>
        </div>
        <div style={{
          marginTop: px(10),
          display: "flex",
          background: TOKENS.panel,
          border: `1px solid ${TOKENS.borderSofter}`,
          borderRadius: px(16),
          overflow: "hidden",
        }}>
          {[
            { k: "R$/hora", v: perHour },
            { k: "R$/km", v: perKm },
            { k: "Jornada", v: jornada },
          ].map((cell, i) => (
            <div key={cell.k} style={{
              flex: 1, padding: `${px(13)} ${px(4)}`,
              position: "relative", textAlign: "center",
            }}>
              {i > 0 && (
                <div aria-hidden style={{
                  position: "absolute", left: 0, top: "18%", height: "64%", width: 1,
                  background: TOKENS.divider,
                }} />
              )}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: px(3), fontSize: px(7), fontWeight: 800,
                letterSpacing: "0.04em", textTransform: "uppercase",
                color: themeMain,
              }}>
                {cell.k}
              </div>
              <div style={{
                fontSize: px(14), fontWeight: 800, marginTop: px(5),
                whiteSpace: "nowrap", color: TOKENS.fg,
              }}>
                {cell.v}
              </div>
            </div>
          ))}
        </div>

        {/* Por app + gastos (só story) */}
        {showApps && (
          <div style={{
            marginTop: px(14),
            background: TOKENS.panel,
            border: `1px solid ${TOKENS.borderSofter}`,
            borderRadius: px(16),
            padding: `${px(12)} ${px(13)}`,
            display: "flex", flexDirection: "column", gap: px(9),
          }}>
            <div style={{
              fontSize: px(8), fontWeight: 800, letterSpacing: "0.16em",
              textTransform: "uppercase", color: "hsla(215,20%,65%,0.8)",
            }}>
              Por app
            </div>
            {apps.slice(0, 3).map((app) => (
              <div key={app.name} style={{ display: "flex", alignItems: "center", gap: px(8) }}>
                <div style={{
                  width: px(18), height: px(18), borderRadius: "999px",
                  background: app.color, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: px(9), fontWeight: 800, flexShrink: 0,
                }}>
                  {app.initial}
                </div>
                <span style={{ fontSize: px(10), fontWeight: 600, minWidth: px(46) }}>{app.name}</span>
                <div style={{ flex: 1, height: px(5), background: TOKENS.panel2, borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${Math.max(0, Math.min(100, app.pct))}%`,
                    background: app.color, borderRadius: "999px",
                  }} />
                </div>
                <span style={{ fontSize: px(10), fontWeight: 800, minWidth: px(56), textAlign: "right", whiteSpace: "nowrap" }}>
                  {app.value}
                </span>
              </div>
            ))}
            {showGastos && (
              <div style={{
                display: "flex", alignItems: "center", gap: px(8),
                paddingTop: px(8), borderTop: `1px solid ${TOKENS.borderSofter}`,
              }}>
                <div style={{
                  width: px(18), height: px(18), borderRadius: "999px",
                  background: "hsla(0,70%,55%,0.18)", color: TOKENS.destructive,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: px(11), fontWeight: 800, flexShrink: 0,
                }}>
                  −
                </div>
                <span style={{ fontSize: px(10), fontWeight: 600, flex: 1, color: "hsla(215,20%,65%,0.9)" }}>
                  {gastosLabel || "Gastos"}
                </span>
                <span style={{ fontSize: px(10), fontWeight: 800, color: TOKENS.destructive, whiteSpace: "nowrap" }}>
                  −{gastosValue}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: px(16), textAlign: "center", lineHeight: 1.5 }}>
        <div style={{
          fontSize: px(8), fontWeight: 600, letterSpacing: "0.1em",
          color: "hsla(215,20%,65%,0.65)", textTransform: "uppercase",
        }}>
          Feito com Volant
        </div>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: px(6),
          fontSize: px(10), fontWeight: 700, letterSpacing: "0.04em",
          color: "hsla(215,20%,65%,0.9)", marginTop: px(3),
        }}>
          <img
            src={volantSymbol}
            alt=""
            crossOrigin="anonymous"
            style={{ width: px(14), height: px(14), borderRadius: "999px", objectFit: "cover" }}
          />
          <span>usevolant.app</span>
        </div>
      </div>
    </div>
  );
});
