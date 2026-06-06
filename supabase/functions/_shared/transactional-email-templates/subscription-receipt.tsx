import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  amount?: string
  currency?: string
  periodEnd?: string
  invoiceUrl?: string
  appUrl?: string
}

const SubscriptionReceiptEmail = ({
  name = '',
  amount = '—',
  currency = 'BRL',
  periodEnd = '—',
  invoiceUrl,
  appUrl = 'https://usevolant.app/app',
}: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Recibo da sua assinatura Volant</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Assinatura confirmada{name ? `, ${name}` : ''} ✅</Heading>
        <Text style={text}>
          Recebemos seu pagamento. Sua assinatura Volant está ativa e você já
          tem acesso a tudo: planejamento inteligente, KM inteligente, relatórios
          e personalização.
        </Text>

        <Section style={card}>
          <Row label="Valor pago" value={`${currency} ${amount}`} />
          <Row label="Próxima cobrança" value={periodEnd} />
        </Section>

        <Section style={{ textAlign: 'center', margin: '24px 0 8px' }}>
          <Button href={appUrl} style={cta}>Abrir o Volant</Button>
        </Section>

        {invoiceUrl ? (
          <Text style={smallCenter}>
            <a href={invoiceUrl} style={{ color: '#16a34a' }}>Ver recibo completo</a>
          </Text>
        ) : null}

        <Hr style={hr} />
        <Text style={small}>
          Obrigado por apoiar o Volant. Bora rodar com tudo no controle 🚗
        </Text>
      </Container>
    </Body>
  </Html>
)

const Row = ({ label, value }: { label: string; value: string }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
    <tbody>
      <tr>
        <td style={{ padding: '6px 0', color: '#64748b' }}>{label}</td>
        <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>{value}</td>
      </tr>
    </tbody>
  </table>
)

export const template = {
  component: SubscriptionReceiptEmail,
  subject: 'Volant — assinatura confirmada',
  displayName: 'Volant',
  previewData: {
    name: 'João',
    amount: '19,90',
    currency: 'R$',
    periodEnd: '06/07/2026',
    invoiceUrl: 'https://example.com/invoice',
    appUrl: 'https://usevolant.app/app',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, Arial, sans-serif', padding: '24px 0' }
const container = { maxWidth: '520px', margin: '0 auto', padding: '0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#475569', margin: '0 0 16px', lineHeight: '1.6' }
const card = { background: '#f8fafc', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', margin: '8px 0' }
const cta = { backgroundColor: '#16a34a', color: '#ffffff', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', textDecoration: 'none' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0 16px' }
const small = { fontSize: '12px', color: '#94a3b8', margin: '0', lineHeight: '1.5' }
const smallCenter = { fontSize: '12px', color: '#64748b', margin: '12px 0 0', textAlign: 'center' as const }
