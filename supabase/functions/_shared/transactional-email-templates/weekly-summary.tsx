import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  periodLabel?: string
  gross?: string
  expenses?: string
  net?: string
  km?: string
  hours?: string
  rpkm?: string
  rpHour?: string
  appUrl?: string
}

const WeeklySummaryEmail = ({
  name = '',
  periodLabel = 'últimos 7 dias',
  gross = 'R$ 0,00',
  expenses = 'R$ 0,00',
  net = 'R$ 0,00',
  km = '0',
  hours = '0',
  rpkm = 'R$ 0,00',
  rpHour = 'R$ 0,00',
  appUrl = 'https://usevolant.app/app',
}: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu resumo da semana no Volant</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Resumo semanal{name ? `, ${name}` : ''}</Heading>
        <Text style={text}>Aqui está como foi sua semana ({periodLabel}):</Text>

        <Section style={card}>
          <Row label="Bruto" value={gross} />
          <Row label="Gastos" value={expenses} muted />
          <Row label="Líquido" value={net} highlight />
        </Section>

        <Section style={card}>
          <Row label="KM rodados" value={km} />
          <Row label="Horas trabalhadas" value={hours} />
          <Row label="R$/km líquido" value={rpkm} />
          <Row label="R$/h líquido" value={rpHour} />
        </Section>

        <Section style={{ textAlign: 'center', margin: '24px 0 8px' }}>
          <Button href={appUrl} style={cta}>Ver relatório completo</Button>
        </Section>

        <Hr style={hr} />
        <Text style={small}>
          Quer parar de receber resumos? É só ajustar as preferências no app.
        </Text>
      </Container>
    </Body>
  </Html>
)

const Row = ({ label, value, muted, highlight }: { label: string; value: string; muted?: boolean; highlight?: boolean }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
    <tbody>
      <tr>
        <td style={{ padding: '6px 0', color: '#64748b' }}>{label}</td>
        <td style={{
          padding: '6px 0', textAlign: 'right',
          fontWeight: 'bold',
          color: highlight ? '#16a34a' : muted ? '#dc2626' : '#0f172a',
          fontSize: highlight ? '16px' : '14px',
        }}>{value}</td>
      </tr>
    </tbody>
  </table>
)

export const template = {
  component: WeeklySummaryEmail,
  subject: 'Seu resumo semanal Volant',
  displayName: 'Volant',
  previewData: {
    name: 'João', periodLabel: '01/06 a 07/06',
    gross: 'R$ 2.450,00', expenses: 'R$ 680,00', net: 'R$ 1.770,00',
    km: '1.230', hours: '52', rpkm: 'R$ 1,44', rpHour: 'R$ 34,04',
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
