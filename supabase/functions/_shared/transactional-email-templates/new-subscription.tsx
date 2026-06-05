import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  email?: string
  userId?: string
  priceId?: string
  productId?: string
  status?: string
  periodEnd?: string
  environment?: string
}

const NewSubscriptionEmail = ({
  email = '—', userId = '—', priceId = '—', productId = '—',
  status = '—', periodEnd = '—', environment = '—',
}: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Nova assinatura no Volant: {email}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Nova assinatura ativada</Heading>
        <Text style={text}>Um usuário acabou de iniciar uma assinatura paga.</Text>
        <Section style={card}>
          <Row label="E-mail" value={email} />
          <Row label="Status" value={status} />
          <Row label="Ambiente" value={environment} />
          <Row label="Price" value={priceId} mono />
          <Row label="Product" value={productId} mono />
          <Row label="Período até" value={periodEnd} />
          <Row label="User ID" value={userId} mono />
        </Section>
      </Container>
    </Body>
  </Html>
)

const Row = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
    <tbody>
      <tr>
        <td style={{ padding: '6px 0', color: '#64748b' }}>{label}</td>
        <td style={{
          padding: '6px 0', textAlign: 'right',
          fontFamily: mono ? 'ui-monospace, Menlo, monospace' : undefined,
          fontSize: mono ? '12px' : undefined,
          fontWeight: mono ? 'normal' : 'bold', color: '#0f172a',
        }}>{value}</td>
      </tr>
    </tbody>
  </table>
)

export const template = {
  component: NewSubscriptionEmail,
  subject: (d: Record<string, any>) => `[Volant] Nova assinatura: ${d.email || 'usuário'}`,
  to: 'suporte@usevolant.com.br',
  displayName: 'Nova assinatura paga (interno)',
  previewData: {
    email: 'joao@example.com', userId: '00000000-0000-0000-0000-000000000000',
    priceId: 'price_123', productId: 'prod_123', status: 'active',
    periodEnd: new Date().toISOString(), environment: 'live',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, Arial, sans-serif', padding: '24px 0' }
const container = { maxWidth: '520px', margin: '0 auto', padding: '0 24px' }
const h1 = { fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#475569', margin: '0 0 16px', lineHeight: '1.5' }
const card = { background: '#f8fafc', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }
