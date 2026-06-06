import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  appUrl?: string
}

const WelcomeEmail = ({ name = '', appUrl = 'https://usevolant.app/app' }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Bem-vindo ao Volant — gestão financeira pra quem dirige</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Bem-vindo ao Volant{name ? `, ${name}` : ''}!</Heading>
        <Text style={text}>
          Que bom ter você por aqui. O Volant foi feito pra motoristas de app
          enxergarem o que realmente sobra no fim do mês — sem planilha, sem
          complicação.
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>Pra começar bem, recomendamos:</Text>
          <Text style={item}>1. Cadastrar o seu veículo</Text>
          <Text style={item}>2. Informar os custos fixos (IPVA, seguro, financiamento…)</Text>
          <Text style={item}>3. Configurar a meta de planejamento inteligente</Text>
          <Text style={hint}>
            Em poucos minutos você já vê seu R$/km líquido, quanto faltar para
            bater a meta e quantos km ainda precisa rodar.
          </Text>
        </Section>

        <Section style={{ textAlign: 'center', margin: '24px 0 8px' }}>
          <Button href={appUrl} style={cta}>Abrir o Volant</Button>
        </Section>

        <Hr style={hr} />
        <Text style={small}>
          Qualquer dúvida, é só responder este e-mail. Boas estradas! 🚗
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Bem-vindo ao Volant 🚗',
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
