import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  amount?: string
  currency?: string
  portalUrl?: string
}

const PaymentFailedEmail = ({
  name = '',
  amount = '—',
  currency = 'R$',
  portalUrl = 'https://usevolant.app/ajustes',
}: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Não conseguimos processar sua cobrança</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Não conseguimos cobrar sua assinatura</Heading>
        <Text style={text}>
          Oi{name ? ` ${name}` : ''}, tentamos cobrar {currency} {amount} pela
          sua assinatura Volant, mas o pagamento foi recusado. Pode ser limite,
          cartão expirado ou bloqueio temporário do banco.
        </Text>

        <Section style={warn}>
          <Text style={warnTitle}>O que acontece agora?</Text>
          <Text style={warnBody}>
            Vamos tentar de novo automaticamente nos próximos dias. Para evitar
            que sua conta perca o acesso premium, atualize o método de pagamento
            ou regularize com seu banco.
          </Text>
        </Section>

        <Section style={{ textAlign: 'center', margin: '24px 0 8px' }}>
          <Button href={portalUrl} style={cta}>Atualizar pagamento</Button>
        </Section>

        <Hr style={hr} />
        <Text style={small}>
          Se já regularizou, pode ignorar este e-mail. Qualquer dúvida, é só
          responder por aqui que a gente ajuda.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentFailedEmail,
  subject: 'Pagamento recusado — atualize seu cartão',
  displayName: 'Volant',
  previewData: {
    name: 'João',
    amount: '19,90',
    currency: 'R$',
    portalUrl: 'https://usevolant.app/ajustes',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, Arial, sans-serif', padding: '24px 0' }
const container = { maxWidth: '520px', margin: '0 auto', padding: '0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#475569', margin: '0 0 16px', lineHeight: '1.6' }
const warn = { background: '#fef2f2', borderRadius: '12px', padding: '20px', border: '1px solid #fecaca', margin: '8px 0' }
const warnTitle = { fontSize: '14px', fontWeight: 'bold', color: '#991b1b', margin: '0 0 8px' }
const warnBody = { fontSize: '13px', color: '#7f1d1d', margin: '0', lineHeight: '1.5' }
const cta = { backgroundColor: '#dc2626', color: '#ffffff', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', textDecoration: 'none' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0 16px' }
const small = { fontSize: '12px', color: '#94a3b8', margin: '0', lineHeight: '1.5' }
