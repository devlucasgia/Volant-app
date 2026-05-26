import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Termos de Uso — página pública, base revisável.
 * Aplicada com o tema escuro fixo para combinar com a identidade Volant.
 * O conteúdo é um rascunho jurídico inicial; deve ser revisto por um
 * advogado antes da abertura comercial.
 */
export default function Termos() {
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
          <h1 className="text-[17px] font-bold leading-tight tracking-tight">Termos de Uso</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 text-[14px] leading-relaxed text-muted-foreground">
        <p className="text-[12px] text-muted-foreground/70">Última atualização: 26/05/2026</p>

        <Section title="1. Aceitação dos termos">
          Ao criar uma conta e utilizar o aplicativo Volant ("Serviço"), você concorda com estes Termos de Uso.
          Caso não concorde, não utilize o Serviço.
        </Section>

        <Section title="2. Sobre o Serviço">
          O Volant é um aplicativo de gestão financeira voltado para motoristas de aplicativo (Uber, 99, inDrive
          e similares). Permite registrar ganhos, gastos, jornadas, quilometragem e gerar relatórios e indicadores.
        </Section>

        <Section title="3. Cadastro e conta">
          O usuário é responsável por manter a confidencialidade de suas credenciais e por todas as atividades
          realizadas em sua conta. Você se compromete a fornecer informações verdadeiras e atualizadas no cadastro.
        </Section>

        <Section title="4. Assinatura e pagamentos">
          O Serviço é oferecido em modelo de assinatura paga, processada por um provedor de pagamentos terceirizado
          (Stripe). Os valores, periodicidade e formas de pagamento são apresentados antes da contratação. A renovação
          é automática salvo cancelamento prévio. Você pode cancelar a qualquer momento através do próprio aplicativo;
          o acesso permanece ativo até o fim do período já pago.
        </Section>

        <Section title="5. Uso adequado">
          É vedado utilizar o Serviço para qualquer finalidade ilícita, tentar acessar dados de outros usuários,
          aplicar engenharia reversa, ou interferir no funcionamento da plataforma.
        </Section>

        <Section title="6. Propriedade intelectual">
          Todo o conteúdo, marcas, layouts, código-fonte e identidade visual do Volant são de propriedade exclusiva
          de seus titulares. Os dados financeiros inseridos pelo usuário pertencem ao próprio usuário.
        </Section>

        <Section title="7. Limitação de responsabilidade">
          O Volant é uma ferramenta de organização financeira. As decisões tomadas a partir dos relatórios são de
          responsabilidade do usuário. Não nos responsabilizamos por perdas decorrentes de uso indevido, falhas de
          conexão, indisponibilidade temporária ou interpretação incorreta dos dados apresentados.
        </Section>

        <Section title="8. Alterações nos termos">
          Estes termos podem ser atualizados periodicamente. Mudanças relevantes serão comunicadas pelo aplicativo
          ou por e-mail. O uso continuado após a alteração caracteriza aceite da nova versão.
        </Section>

        <Section title="9. Contato">
          Em caso de dúvidas, entre em contato pelo e-mail <a className="text-primary hover:underline" href="mailto:suporte.volant@gmail.com">suporte.volant@gmail.com</a>.
        </Section>

        <p className="pt-4 text-[12px]">
          <Link to="/privacidade" className="text-primary hover:underline">Ver Política de Privacidade →</Link>
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
