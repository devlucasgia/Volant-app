import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Bold, Italic, Smile, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  useGreetingStyle, greetingStyleClass,
  useGreetingEmoji, DEFAULT_GREETING_EMOJI,
} from "@/lib/greetingStyle";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DashboardWidgets } from "@/types";

function ScreenHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-lg">
      <div className="flex items-center gap-3 px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted/50 active:scale-[0.96]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-400/10 text-teal-300 ring-1 ring-inset ring-current/15 shadow-[0_0_12px_-6px_currentColor]">
          <MessageSquare className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-foreground">
            Saudação
          </h1>
          <p className="text-[11px] leading-tight text-muted-foreground/80">
            Personalize como o Volant conversa com você.
          </p>
        </div>
      </div>
    </header>
  );
}

const EMOJI_SUGGESTIONS = ["👋", "🚀", "🙌", "💪", "🛣️", "🔥", "✨", "☕", "🙏", "😎"];

export default function PersonalizacaoSaudacao() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useData();
  const { user } = useAuth();
  const widgets = settings.dashboardWidgets;

  const accountName = useMemo(() => {
    const md = (user?.user_metadata ?? {}) as Record<string, unknown>;
    return (
      (md.full_name as string) ||
      (md.name as string) ||
      (md.display_name as string) ||
      user?.email?.split("@")[0] ||
      "Motorista"
    );
  }, [user]);

  const [nickname, setNickname] = useState("");
  const [greetingMessage, setGreetingMessage] = useState("");
  const [greetingStyle, setGreetingStyle] = useGreetingStyle();
  const [greetingEmoji, setGreetingEmoji] = useGreetingEmoji();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await (supabase
        .from("profiles") as any)
        .select("nickname, greeting_message")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      const row = (data ?? {}) as { nickname?: string | null; greeting_message?: string | null };
      setNickname(row.nickname ?? "");
      setGreetingMessage(row.greeting_message ?? "");
    })();
    return () => { active = false; };
  }, [user]);

  const notifySaved = () =>
    toast.success("Alterações salvas", { id: "autosave", duration: 1600 });
  const notifySaveError = () =>
    toast.error("Não foi possível salvar agora.", { id: "autosave" });

  const setWidget = async (k: keyof DashboardWidgets, v: boolean) => {
    try {
      await updateSettings({ dashboardWidgets: { ...widgets, [k]: v } });
      notifySaved();
    } catch {
      notifySaveError();
    }
  };

  const greetingMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistGreetingMessage = async (value: string) => {
    if (!user) return;
    const trimmed = value.trim().slice(0, 60);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, greeting_message: trimmed || null } as any);
    if (error) return notifySaveError();
    notifySaved();
  };
  const updateGreetingMessage = (value: string, immediate = false) => {
    const v = value.slice(0, 60);
    setGreetingMessage(v);
    if (greetingMsgTimer.current) clearTimeout(greetingMsgTimer.current);
    if (immediate) {
      void persistGreetingMessage(v);
    } else {
      greetingMsgTimer.current = setTimeout(() => void persistGreetingMessage(v), 600);
    }
  };

  const toggleBold = () => {
    setGreetingStyle({ ...greetingStyle, bold: !greetingStyle.bold });
    notifySaved();
  };
  const toggleItalic = () => {
    setGreetingStyle({ ...greetingStyle, italic: !greetingStyle.italic });
    notifySaved();
  };

  const chooseEmoji = (e: string) => {
    setGreetingEmoji(e);
    notifySaved();
  };
  const removeEmoji = () => {
    setGreetingEmoji("");
    notifySaved();
  };

  const firstName = (nickname.trim() || accountName.split(/\s+/)[0]);

  return (
    <div className="min-h-screen">
      <ScreenHeader onBack={() => navigate("/ajustes/personalizacao")} />
      <div className="space-y-3 px-4 py-5 animate-fade-in">

        {/* Preview at top — main hero of the screen */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_0_0_hsl(var(--border)),0_8px_21px_-18px_rgba(0,0,0,0.40)]">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Pré-visualização
          </div>
          <div className="text-[20px] font-bold tracking-tight leading-tight text-foreground">
            Olá, {firstName}
            {greetingEmoji ? <> <span aria-hidden>{greetingEmoji}</span></> : null}
          </div>
          {greetingMessage && (
            <div className={cn(
              "mt-1 text-[13px] text-muted-foreground/90 leading-snug",
              greetingStyleClass(greetingStyle),
            )}>
              {greetingMessage}
            </div>
          )}
          <div className="mt-0.5 text-[12px] text-muted-foreground/70">
            {(() => {
              const d = new Date();
              const day = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
              return day.charAt(0).toUpperCase() + day.slice(1);
            })()}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <div className="min-w-0 pr-3">
            <div className="text-sm font-semibold">Mostrar saudação na tela inicial</div>
            <div className="text-[11px] text-muted-foreground">
              Exibe seu nome e mensagem no topo da Home.
            </div>
          </div>
          <Switch
            checked={!!widgets.greeting}
            onCheckedChange={(v) => setWidget("greeting", v)}
          />
        </div>

        {/* Emoji */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Emoji da saudação</Label>
            {greetingEmoji && (
              <button
                type="button"
                onClick={removeEmoji}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
              >
                <X className="h-3 w-3" /> Remover
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EMOJI_SUGGESTIONS.map((e) => {
              const active = greetingEmoji === e;
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => chooseEmoji(e)}
                  aria-label={`Usar emoji ${e}`}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-all active:scale-[0.94]",
                    active
                      ? "border-primary/50 bg-primary/[0.10] shadow-[0_0_0_1px_hsl(var(--primary)/0.18)]"
                      : "border-border/60 bg-background/60 hover:bg-muted/40",
                  )}
                >
                  {e}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Smile className="h-3.5 w-3.5" /> Personalizado:
            </div>
            <Input
              value={greetingEmoji}
              onChange={(e) => {
                // Allow any text, but cap at a few chars (emojis count as multiple UTF-16 units).
                const v = Array.from(e.target.value).slice(0, 2).join("");
                setGreetingEmoji(v);
              }}
              onBlur={() => notifySaved()}
              placeholder="Digite um emoji"
              className="h-8 w-24 text-center text-base bg-background"
            />
            {greetingEmoji !== DEFAULT_GREETING_EMOJI && (
              <button
                type="button"
                onClick={() => chooseEmoji(DEFAULT_GREETING_EMOJI)}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Padrão
              </button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Opcional. Aparece ao lado do seu nome na saudação.
          </p>
        </div>

        {/* Custom message */}
        <div className="space-y-1.5 rounded-2xl border border-border bg-card p-4">
          <Label className="text-xs text-muted-foreground">Mensagem personalizada</Label>
          <Input
            value={greetingMessage}
            onChange={(e) => updateGreetingMessage(e.target.value)}
            onBlur={(e) => updateGreetingMessage(e.target.value, true)}
            placeholder="Ex.: Bora pra cima! 🚀"
            maxLength={60}
            className="bg-background"
          />
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              Aparece abaixo da saudação. Opcional.
            </p>
            <span className="text-[10px] tabular-nums text-muted-foreground/70">
              {greetingMessage.length}/60
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              "Bora pra cima! 🚀",
              "Foco, disciplina e constância! 💪",
              "Deus no comando sempre! 🙌",
              "Boas corridas hoje! 🛣️",
            ].map((preset) => {
              const selected = greetingMessage.trim() === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => updateGreetingMessage(preset, true)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    selected
                      ? "border-primary/50 bg-primary/15 text-foreground"
                      : "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  {preset}
                </button>
              );
            })}
            {greetingMessage && (
              <button
                type="button"
                onClick={() => updateGreetingMessage("", true)}
                className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/40"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Style: independent bold + italic */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <Label className="text-xs text-muted-foreground">Estilo da mensagem</Label>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {([
              { k: "bold" as const, label: "Negrito", icon: <Bold className="h-3.5 w-3.5" />, active: greetingStyle.bold, onClick: toggleBold },
              { k: "italic" as const, label: "Itálico", icon: <Italic className="h-3.5 w-3.5" />, active: greetingStyle.italic, onClick: toggleItalic },
            ]).map((opt) => (
              <button
                key={opt.k}
                type="button"
                onClick={opt.onClick}
                aria-pressed={opt.active}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[12px] font-medium transition-all active:scale-[0.97]",
                  opt.active
                    ? "border-primary/45 bg-primary/[0.08] text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.12)]"
                    : "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/40",
                )}
              >
                {opt.icon}{opt.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Pode combinar negrito e itálico. Aplica-se apenas à mensagem personalizada.
          </p>
        </div>
      </div>
    </div>
  );
}
