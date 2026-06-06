import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  carLabel?: string
  alertType?: string
  intervalKm?: string
  kmSinceLast?: string
  appUrl?: string
}

const labelFor = (t: string) => {
  if (t === 'oleo') return 'Troca de óleo'
  if (t === 'pneus') return 'Troca de pneus'
  return 'Manutenção preventiva'
}

const MaintenanceAlertEmail = ({
  name = '',
  carLabel = 'seu carro',
  alertType = 'oleo',
  intervalKm = '0',
  kmSinceLast = '0',
  appUrl = 'https://usevolant.app/app/ajustes/veiculos/manutencao',
}: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Hora de cuidar do seu carro</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{labelFor(alertType)} se aproximando 🔧</Heading>
        <Text style={text}>
          Oi{name ? ` ${name}` : ''}, com base nos seus registros, {carLabel} já
          rodou <b>{kmSinceLast} km</b> desde a última {labelFor(alertType).toLowerCase()},
          e o intervalo recomendado é de <b>{intervalKm} km</b>.
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>Por que isso importa?</Text>
          <Text style={cardBody}>
            Manter a manutenção em dia reduz quebras inesperadas, melhora o
            consumo de combustível e protege o valor do veículo.
          </Text>
        </Section>

        <Section style={{ textAlign: 'center', margin: '24px 0 8px' }}>
          <Button href={appUrl} style={cta}>Ver minhas manutenções</Button>
        </Section>

        <Hr style={hr} />
        <Text style={small}>
          Já fez essa manutenção? Registre no app para a gente parar de te avisar.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MaintenanceAlertEmail,
  subject: 'Lembrete de manutenção — Volant',
  displayName: 'Volant',
  previewData: {
    name: 'João', carLabel: 'seu Onix Plus',
    alertType: 'oleo', intervalKm: '10.000', kmSinceLast: '9.500',
    appUrl: 'https://usevolant.app/app/ajustes/veiculos/manutencao',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, Arial, sans-serif', padding: '24px 0' }
const container = { maxWidth: '520px', margin: '0 auto', padding: '0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#475569', margin: '0 0 16px', lineHeight: '1.6' }
const card = { background: '#fff7ed', borderRadius: '12px', padding: '20px', border: '1px solid #fed7aa', margin: '8px 0' }
const cardTitle = { fontSize: '14px', fontWeight: 'bold', color: '#9a3412', margin: '0 0 8px' }
const cardBody = { fontSize: '13px', color: '#7c2d12', margin: '0', lineHeight: '1.5' }
const cta = { backgroundColor: '#ea580c', color: '#ffffff', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', textDecoration: 'none' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0 16px' }
const small = { fontSize: '12px', color: '#94a3b8', margin: '0', lineHeight: '1.5' }
