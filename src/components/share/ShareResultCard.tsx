import { forwardRef } from "react";
import { Check } from "lucide-react";
import volantSymbol from "@/assets/volant-symbol-header.png";
import { cn } from "@/lib/utils";

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
  /** Se true, renderiza no tamanho real de exportação (1080px). Caso contrário, ocupa 100% do wrapper (para prévia escalada). */
  exportSize?: boolean;
}

/**
 * Card visual do resultado — pintado 100% com estilos inline para garantir
 * fidelidade quando capturado por html-to-image (sem depender de Tailwind purgado).
 */
export const ShareResultCard = forwardRef<HTMLDivElement, ShareResultCardProps>(function ShareResultCard(
  {
    format,
    mode,
    periodLabel,
    dateLabel,
    heroValue,
    metaBatida,
    metaExcedente,
    metaLabel,
    metaPct,
    perHour,
    perKm,
    jornada,
    apps,
    gastosLabel,
    gastosValue,
    exportSize = false,
  },
  ref,
) {
  const width = 1080;
  const height = format === "story" ? 1920 : 1080;

  // Cor do tema
  const themeColor = mode === "liquido" ? "hsl(142, 71%, 48%)" : "hsl(215, 90%, 62%)";
  const themeSoft = mode === "liquido" ? "hsl(142, 71%, 48%, 0.18)" : "hsl(215, 90%, 62%, 0.18)";
  const themeGlow = mode === "liquido" ? "hsl(142, 76%, 55%, 0.35)" : "hsl(215, 95%, 68%, 0.35)";
  const eyebrowText = mode === "liquido" ? "LUCRO LÍQUIDO" : "GANHO BRUTO";

  const bg = "hsl(222, 47%, 7%)";
  const card = "hsl(222, 40%, 11%)";
  const border = "hsl(217, 33%, 18%)";
  const muted = "hsl(217, 33%, 15%)";
  const mutedFg = "hsl(215, 20%, 65%)";
  const fg = "hsl(210, 40%, 98%)";
  const destructive = "hsl(0, 70%, 55%)";

  // Escala para exportação real (base 360px de design x 1080px de export)
  const S = exportSize ? 3 : 1;
  const px = (n: number) => `${n * S}px`;

  const showApps = format === "story" && apps.length > 0;
  const showGastos = format === "story" && !!gastosValue;
  const hasApps = apps.length > 0;

  return (
    <div
      ref={ref}
      style={{
        width: exportSize ? `${width}px` : "100%",
        aspectRatio: exportSize ? undefined : `${width} / ${height}`,
        height: exportSize ? `${height}px` : undefined,
        position: "relative",
        overflow: "hidden",
        background: bg,
        color: fg,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        fontVariantNumeric: "tabular-nums",
        WebkitFontSmoothing: "antialiased",
        display: "flex",
        flexDirection: "column",
        padding: px(28),
        gap: px(20),
        boxSizing: "border-box",
      }}
    >
      {/* Glow de tema no fundo */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: exportSize ? "-25%" : "-25%",
          right: "-20%",
          width: "80%",
          height: "60%",
          background: `radial-gradient(circle at center, ${themeGlow}, transparent 70%)`,
          filter: "blur(0px)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: "-15%",
          left: "-15%",
          width: "70%",
          height: "50%",
          background: `radial-gradient(circle at center, ${themeSoft}, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: px(12),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: px(10) }}>
          <img
            src={volantSymbol}
            alt=""
            crossOrigin="anonymous"
            style={{
              width: px(36),
              height: px(36),
              borderRadius: "999px",
              objectFit: "cover",
            }}
          />
          <span
            style={{
              fontSize: px(16),
              fontWeight: 800,
              letterSpacing: px(2),
            }}
          >
            VOLANT
          </span>
        </div>
        <div style={{ textAlign: "right", lineHeight: 1.2 }}>
          <div
            style={{
              fontSize: px(11),
              fontWeight: 700,
              letterSpacing: px(1.4),
              textTransform: "uppercase",
              color: mutedFg,
            }}
          >
            {periodLabel}
          </div>
          <div
            style={{
              fontSize: px(11),
              color: mutedFg,
              marginTop: px(2),
            }}
          >
            {dateLabel}
          </div>
        </div>
      </div>

      {/* Hero */}
      <div
        style={{
          position: "relative",
          borderRadius: px(18),
          border: `1px solid ${themeSoft}`,
          background: `linear-gradient(135deg, ${themeSoft}, transparent 70%)`,
          padding: px(20),
          display: "flex",
          flexDirection: "column",
          gap: px(10),
        }}
      >
        <div
          style={{
            fontSize: px(12),
            fontWeight: 700,
            letterSpacing: px(1.6),
            color: themeColor,
          }}
        >
          {eyebrowText}
        </div>
        <div
          style={{
            fontSize: px(format === "story" ? 56 : 48),
            fontWeight: 800,
            lineHeight: 1,
            color: fg,
            letterSpacing: px(-1),
          }}
        >
          {heroValue}
        </div>

        {metaBatida && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: px(6),
              alignSelf: "flex-start",
              padding: `${px(6)} ${px(10)}`,
              borderRadius: "999px",
              background: themeSoft,
              color: themeColor,
              fontSize: px(11),
              fontWeight: 700,
              marginTop: px(4),
            }}
          >
            <Check size={12 * S} strokeWidth={3} />
            <span>Meta batida{metaExcedente ? ` · ${metaExcedente}` : ""}</span>
          </div>
        )}

        {/* Barra de progresso */}
        <div
          style={{
            marginTop: px(8),
            height: px(6),
            width: "100%",
            borderRadius: "999px",
            background: muted,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.max(0, Math.min(100, metaPct))}%`,
              background: themeColor,
              borderRadius: "999px",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: px(11),
            color: mutedFg,
            marginTop: px(2),
          }}
        >
          <span>{metaLabel}</span>
          <span style={{ color: fg, fontWeight: 600 }}>{Math.round(metaPct)}%</span>
        </div>
      </div>

      {/* Régua de stats */}
      <div
        style={{
          borderRadius: px(14),
          border: `1px solid ${border}`,
          background: card,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          overflow: "hidden",
        }}
      >
        {[
          { label: "R$/hora", value: perHour },
          { label: "R$/km", value: perKm },
          { label: "Jornada", value: jornada },
        ].map((stat, i) => (
          <div
            key={stat.label}
            style={{
              padding: `${px(14)} ${px(10)}`,
              borderLeft: i === 0 ? undefined : `1px solid ${border}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: px(4),
            }}
          >
            <div style={{ fontSize: px(10), color: mutedFg, letterSpacing: px(0.6), textTransform: "uppercase", fontWeight: 600 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: px(18), fontWeight: 700, color: fg }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Por app (só story) */}
      {showApps && (
        <div
          style={{
            borderRadius: px(14),
            border: `1px solid ${border}`,
            background: card,
            padding: px(16),
            display: "flex",
            flexDirection: "column",
            gap: px(12),
          }}
        >
          <div
            style={{
              fontSize: px(10),
              fontWeight: 700,
              letterSpacing: px(1.6),
              color: mutedFg,
              textTransform: "uppercase",
            }}
          >
            Por app
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: px(10) }}>
            {apps.map((app) => (
              <div key={app.name} style={{ display: "flex", alignItems: "center", gap: px(10) }}>
                <div
                  style={{
                    width: px(24),
                    height: px(24),
                    borderRadius: "999px",
                    background: app.color,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: px(11),
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {app.initial}
                </div>
                <span style={{ fontSize: px(12), fontWeight: 600, minWidth: px(80) }}>{app.name}</span>
                <div style={{ flex: 1, height: px(6), background: muted, borderRadius: "999px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.max(0, Math.min(100, app.pct))}%`,
                      background: app.color,
                      borderRadius: "999px",
                    }}
                  />
                </div>
                <span style={{ fontSize: px(12), fontWeight: 700, minWidth: px(72), textAlign: "right" }}>
                  {app.value}
                </span>
              </div>
            ))}

            {showGastos && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: px(10),
                  paddingTop: px(10),
                  borderTop: `1px solid ${border}`,
                }}
              >
                <div
                  style={{
                    width: px(24),
                    height: px(24),
                    borderRadius: "999px",
                    background: `${destructive}22`,
                    color: destructive,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: px(11),
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  −
                </div>
                <span
                  style={{
                    fontSize: px(12),
                    fontWeight: 600,
                    flex: 1,
                    color: mutedFg,
                  }}
                >
                  {gastosLabel || "Gastos"}
                </span>
                <span
                  style={{
                    fontSize: px(12),
                    fontWeight: 700,
                    color: destructive,
                    minWidth: px(72),
                    textAlign: "right",
                  }}
                >
                  −{gastosValue}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Espaçador flexível */}
      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: px(8),
          paddingTop: px(6),
        }}
      >
        <img
          src={volantSymbol}
          alt=""
          crossOrigin="anonymous"
          style={{ width: px(16), height: px(16), borderRadius: "999px", objectFit: "cover" }}
        />
        <span style={{ fontSize: px(12), color: mutedFg, fontWeight: 600 }}>usevolant.app</span>
      </div>

      {/* Sem uso, apenas para evitar warning de var não usada quando format === "square" */}
      <span style={{ display: "none" }}>{cn(String(hasApps))}</span>
    </div>
  );
});
