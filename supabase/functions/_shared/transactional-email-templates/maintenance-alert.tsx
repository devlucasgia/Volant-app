import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  carLabel?: string
  alertType?: string
  status?: 'approaching' | 'overdue'
  intervalKm?: string
  kmSinceLast?: string
  kmRemaining?: string
  kmOverdue?: string
  appUrl?: string
}

const labelFor = (t: string) => {
  if (t === 'oleo') return 'Troca de óleo'
  if (t === 'pneus') return 'Troca de pneus'
  return 'Manutenção preventiva'
}

// Paletas alinhadas com a Home e a Central de Notificações:
// approaching → laranja (warning), overdue → vermelho (destructive).
const PALETTES = {
  approaching: {
    accent: '#ea580c',
    cardBg: '#fff7ed',
    cardBorder: '#fed7aa',
    cardTitle: '#9a3412',
    cardBody: '#7c2d12',
    emoji: '🔧',
    preview: 'Manutenção se aproximando — programe-se',
  },
  overdue: {
    accent: '#dc2626',
    cardBg: '#fef2f2',
    cardBorder: '#fecaca',
    cardTitle: '#991b1b',
    cardBody: '#7f1d1d',
    emoji: '⚠️',
    preview: 'Manutenção atrasada — atenção',
  },
} as const

const MaintenanceAlertEmail = ({
  name = '',
  carLabel = 'seu carro',
  alertType = 'oleo',
  status = 'approaching',
  intervalKm = '0',
  kmSinceLast = '0',
  kmRemaining = '0',
  kmOverdue = '0',
  appUrl = 'https://usevolant.app/app/ajustes/veiculos/manutencao',
}: Props) => {
  const isOverdue = status === 'overdue'
  const palette = isOverdue ? PALETTES.overdue : PALETTES.approaching
  const label = labelFor(alertType)
  const title = isOverdue
    ? `${label} atrasada ${palette.emoji}`
    : `${label} se aproximando ${palette.emoji}`

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{palette.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{title}</Heading>

          {isOverdue ? (
            <Text style={text}>
              Oi{name ? ` ${name}` : ''}, com base nos seus registros, {carLabel} já
              passou em <b>{kmOverdue} km</b> do intervalo recomendado para a{' '}
              {label.toLowerCase()} (<b>{intervalKm} km</b>). Vale fazer assim que puder.
            </Text>
          ) : (
            <Text style={text}>
              Oi{name ? ` ${name}` : ''}, com base nos seus registros, faltam cerca de{' '}
              <b>{kmRemaining} km</b> para a próxima {label.toLowerCase()} em {carLabel}{' '}
              (intervalo de <b>{intervalKm} km</b>, já rodou <b>{kmSinceLast} km</b> desde a última).
            </Text>
          )}

          <Section style={{ ...card, background: palette.cardBg, borderColor: palette.cardBorder }}>
            <Text style={{ ...cardTitle, color: palette.cardTitle }}>
              {isOverdue ? 'Por que agir agora?' : 'Por que se programar?'}
            </Text>
            <Text style={{ ...cardBody, color: palette.cardBody }}>
              {isOverdue
                ? 'Rodar com a manutenção atrasada aumenta o risco de quebra, eleva o consumo de combustível e pode gerar gastos maiores no futuro.'
                : 'Manter a manutenção em dia reduz quebras inesperadas, melhora o consumo de combustível e protege o valor do veículo.'}
            </Text>
          </Section>

          <Section style={{ textAlign: 'center', margin: '24px 0 8px' }}>
            <Button href={appUrl} style={{ ...cta, backgroundColor: palette.accent }}>
              Ver minhas manutenções
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={small}>
            Já fez essa manutenção? Registre no app para a gente parar de te avisar.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: MaintenanceAlertEmail,
  subject: 'Lembrete de manutenção — Volant',
  displayName: 'Volant',
  previewData: {
    name: 'João', carLabel: 'seu Onix Plus',
    alertType: 'oleo', status: 'approaching',
    intervalKm: '10.000', kmSinceLast: '9.500', kmRemaining: '500', kmOverdue: '0',
    appUrl: 'https://usevolant.app/app/ajustes/veiculos/manutencao',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, Arial, sans-serif', padding: '24px 0' }
const container = { maxWidth: '520px', margin: '0 auto', padding: '0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#475569', margin: '0 0 16px', lineHeight: '1.6' }
const card = { borderRadius: '12px', padding: '20px', border: '1px solid', margin: '8px 0' }
const cardTitle = { fontSize: '14px', fontWeight: 'bold', margin: '0 0 8px' }
const cardBody = { fontSize: '13px', margin: '0', lineHeight: '1.5' }
const cta = { color: '#ffffff', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', textDecoration: 'none' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0 16px' }
const small = { fontSize: '12px', color: '#94a3b8', margin: '0', lineHeight: '1.5' }
