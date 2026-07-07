import { forwardRef } from "react";
import { Check, Gauge } from "lucide-react";
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
  const EyebrowIcon = Gauge;

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

  const isSquare = format === "square";
  const heroFontSize = isSquare ? 32 : 45;
  const { rs, int, cents } = splitCurrency(heroValue);

  const goalPctClamped = Math.max(0, Math.min(100, metaPct));
  const goalPctLabel = `${Math.round(metaPct)}%`;

  const padding = isSquare
    ? `${px(16)} ${px(18)} ${px(14)}`
    : `${px(24)} ${px(22)} ${px(18)}`;
  const radius = format === "story" ? px(26) : px(22);

  // Métricas escaláveis por formato (quadrado é mais compacto).
  const goalBarH = isSquare ? 28 : 34;
  const goalInFont = isSquare ? 10.5 : 11.5;
  const goalPctFont = isSquare ? 11.5 : 13;
  const goalMarginTop = isSquare ? 14 : 20;
  const heroMarginTop = isSquare ? 6 : 9;
  const perfMarginTop = isSquare ? 12 : 20;
  const perfCellPadY = isSquare ? 10 : 13;
  const perfValueFont = isSquare ? 12 : 14;
  const footerMarginTop = isSquare ? 10 : 16;

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
          marginTop: px(heroMarginTop),
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
        <div style={{ marginTop: px(goalMarginTop) }}>
          <div style={{
            position: "relative",
            height: px(goalBarH),
            borderRadius: px(12),
            background: TOKENS.panel2,
            overflow: "hidden",
            border: `1px solid ${TOKENS.borderSofter}`,
          }}>
            <div style={{
              position: "absolute", top: 0, bottom: 0, left: 0,
              width: `${goalPctClamped}%`,
              minWidth: goalPctClamped > 0 && metaBatida ? px(80) : 0,
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
              {metaBatida && (
                <div style={{
                  position: "relative",
                  display: "flex", alignItems: "center", gap: px(7),
                  fontSize: px(goalInFont), fontWeight: 800, color: goalInColor,
                  whiteSpace: "nowrap",
                }}>
                  <Check size={14 * S} strokeWidth={3} />
                  <span>Meta batida{metaExcedente ? ` · ${metaExcedente}` : ""}</span>
                </div>
              )}
            </div>
            <div style={{
              position: "absolute", right: px(13), top: 0, bottom: 0,
              display: "flex", alignItems: "center",
              fontSize: px(goalPctFont), fontWeight: 900, color: TOKENS.fg,
              textShadow: "0 1px 2px rgba(0,0,0,0.35)",
            }}>
              {goalPctLabel}
            </div>
          </div>
          <div style={{
            marginTop: px(9),
            padding: `0 ${px(2)}`,
            display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: px(10),
            fontSize: px(10.5), color: "hsla(215,20%,65%,0.9)", whiteSpace: "nowrap",
          }}>
            {metaBatida && metaExcedente ? (
              <span style={{ color: themeStrong, fontWeight: 800 }}>{metaExcedente} acima</span>
            ) : <span />}
            <span style={{ fontWeight: 600, color: "hsla(215,20%,65%,0.7)" }}>{metaLabel}</span>
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

        {/* Bloco de apps/gastos removido — story fica mais respirado, como na referência */}
      </div>

      {/* Footer */}
      <div style={{ marginTop: px(16), textAlign: "center", lineHeight: 1.5 }}>
        <div style={{
          fontSize: px(8), fontWeight: 600, letterSpacing: "0.1em",
          color: "hsla(215,20%,65%,0.65)", textTransform: "uppercase",
        }}>
          O app feito pra quem vive de app.
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
