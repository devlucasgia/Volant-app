import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  appUrl?: string
}

const TrialWelcomeEmail = ({ name = '', appUrl = 'https://usevolant.app/app' }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu trial do Volant começou — 7 dias pra ver o que sobra de verdade</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Seu trial começou{name ? `, ${name}` : ''}! 🚗</Heading>
        <Text style={text}>
          Você tem <strong>7 dias gratuitos</strong> pra usar o Volant Premium completo.
          Pra esse tempo valer a pena, faça hoje 3 coisas rápidas — em 2 minutos você
          já vê o que está sobrando no fim do dia.
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>Em 2 minutos:</Text>
          <Text style={item}><strong>1.</strong> Cadastre o seu carro</Text>
          <Text style={item}><strong>2.</strong> Registre 1 ganho de hoje (Uber, 99, inDrive…)</Text>
          <Text style={item}><strong>3.</strong> Registre 1 gasto (combustível ou alimentação)</Text>
          <Text style={hint}>
            Pronto. Já dá pra ver seu líquido real, R$/km e o quanto falta pra bater
            sua meta do mês.
          </Text>
        </Section>

        <Section style={{ textAlign: 'center', margin: '24px 0 8px' }}>
          <Button href={appUrl} style={cta}>Abrir o Volant agora</Button>
        </Section>

        <Hr style={hr} />
        <Text style={small}>
          Dica: registre todo dia ao terminar de rodar — leva 10 segundos e dá
          uma clareza que planilha nenhuma dá.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TrialWelcomeEmail,
  subject: 'Seu trial começou — bora ver o que sobra de verdade 🚗',
  displayName: 'Volant',
  previewData: { name: 'João', appUrl: 'https://usevolant.app/app' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, Arial, sans-serif', padding: '24px 0' }
const container = { maxWidth: '520px', margin: '0 auto', padding: '0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#475569', margin: '0 0 16px', lineHeight: '1.6' }
const card = { background: '#f8fafc', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', margin: '8px 0' }
const cardTitle = { fontSize: '14px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 10px' }
const item = { fontSize: '14px', color: '#334155', margin: '4px 0', lineHeight: '1.5' }
const hint = { fontSize: '13px', color: '#64748b', margin: '12px 0 0', lineHeight: '1.5' }
const cta = { backgroundColor: '#16a34a', color: '#ffffff', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', textDecoration: 'none' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0 16px' }
const small = { fontSize: '12px', color: '#94a3b8', margin: '0', lineHeight: '1.5' }
