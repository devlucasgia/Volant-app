import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Política de Privacidade — página pública, base revisável.
 * Aplicada com o tema escuro fixo para combinar com a identidade Volant.
 * O conteúdo é um rascunho inicial em conformidade geral com a LGPD; deve
 * ser revisto por um advogado antes da abertura comercial.
 */
export default function Privacidade() {
  const navigate = useNavigate();
  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };
  return (
    <div className="dark min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Voltar"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted/50 active:scale-[0.96]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-[17px] font-bold leading-tight tracking-tight">Política de Privacidade</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 text-[14px] leading-relaxed text-muted-foreground">
        <p className="text-[12px] text-muted-foreground/70">Última atualização: 26/05/2026</p>

        <Section title="1. Quais dados coletamos">
          Coletamos apenas as informações necessárias para o funcionamento do aplicativo:
          nome, e-mail e foto de perfil (quando você se cadastra), e os dados financeiros e operacionais que
          você insere voluntariamente (ganhos, gastos, jornadas, quilometragem, veículos).
        </Section>

        <Section title="2. Como usamos seus dados">
          Seus dados são usados exclusivamente para: (a) operar o Serviço; (b) gerar seus relatórios e indicadores
          pessoais; (c) processar sua assinatura paga; (d) prestar suporte quando solicitado. Não vendemos,
          alugamos ou compartilhamos seus dados financeiros com terceiros para fins comerciais.
        </Section>

        <Section title="3. Onde os dados ficam armazenados">
          Os dados são armazenados em servidores seguros operados por nossos provedores de infraestrutura
          (Supabase / Lovable Cloud). A comunicação entre o aplicativo e o servidor é criptografada em trânsito (HTTPS).
        </Section>

        <Section title="4. Compartilhamento com terceiros">
          Compartilhamos dados estritamente necessários com prestadores que viabilizam o Serviço:
          processador de pagamentos (Stripe), provedor de autenticação (Google, quando você opta por entrar com Google)
          e provedor de e-mails transacionais. Cada um trata os dados de acordo com sua própria política.
        </Section>

        <Section title="5. Seus direitos (LGPD)">
          Você pode, a qualquer momento: acessar seus dados, corrigi-los, exportá-los ou solicitar a exclusão
          definitiva da sua conta. Para exercer esses direitos, envie um e-mail para
          <a className="text-primary hover:underline" href="mailto:suporte.volant@gmail.com"> suporte.volant@gmail.com</a>.
        </Section>

        <Section title="6. Retenção de dados">
          Mantemos seus dados enquanto sua conta estiver ativa. Após a exclusão da conta, removemos os dados
          pessoais em até 30 dias, exceto quando houver obrigação legal de retenção (ex.: registros fiscais).
        </Section>

        <Section title="7. Cookies e tecnologias similares">
          Utilizamos armazenamento local do navegador (localStorage) para manter sua sessão e preferências
          visuais (ex.: tema escuro). Não utilizamos cookies de rastreamento publicitário de terceiros.
        </Section>

        <Section title="8. Crianças">
          O Serviço não se destina a menores de 18 anos. Não coletamos intencionalmente dados de menores.
        </Section>

        <Section title="9. Alterações nesta política">
          Esta política pode ser atualizada. Mudanças relevantes serão comunicadas pelo aplicativo ou por e-mail.
        </Section>

        <Section title="10. Encarregado de dados (DPO) e contato">
          Para qualquer questão relacionada a dados pessoais, fale com a gente em
          <a className="text-primary hover:underline" href="mailto:suporte.volant@gmail.com"> suporte.volant@gmail.com</a>.
        </Section>

        <p className="pt-4 text-[12px]">
          <Link to="/termos" className="text-primary hover:underline">Ver Termos de Uso →</Link>
        </p>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
      <p>{children}</p>
    </section>
  );
}
