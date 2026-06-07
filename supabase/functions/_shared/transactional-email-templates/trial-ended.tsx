import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  netTotal?: string
  entriesCount?: number
  checkoutUrl?: string
  couponCode?: string
}

const TrialEndedEmail = ({
  name = '',
  netTotal = 'R$ 0,00',
  entriesCount = 0,
  checkoutUrl = 'https://usevolant.app/app',
  couponCode = 'primeiros25',
}: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu trial acabou — seus dados estão salvos, é só ativar pra continuar</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Seu trial acabou{name ? `, ${name}` : ''} 🏁</Heading>
        <Text style={text}>
          Nesses 7 dias você registrou <strong>{entriesCount} lançamento{entriesCount === 1 ? '' : 's'}</strong> e
          viu <strong style={{ color: '#16a34a' }}>{netTotal}</strong> de líquido
          no Volant. Esse histórico continua salvo — só falta reativar pra
          continuar de onde parou.
        </Text>

        <Section style={cardHighlight}>
          <Text style={badgeText}>CUPOM AINDA VÁLIDO</Text>
          <Text style={offerTitle}>25% off no primeiro pagamento</Text>
          <Text style={offerCode}>
            Cupom: <strong>{couponCode}</strong>
          </Text>
          <Text style={offerHint}>
            Volte a registrar suas corridas e a ver seu lucro real em segundos.
          </Text>
        </Section>

        <Section style={{ textAlign: 'center', margin: '24px 0 8px' }}>
          <Button href={checkoutUrl} style={cta}>Voltar a usar o Volant</Button>
        </Section>

        <Hr style={hr} />
        <Text style={small}>
          Qualquer dúvida, é só responder este e-mail. Estamos aqui pra ajudar
          você a lucrar mais.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TrialEndedEmail,
  subject: 'Seu trial acabou — seus dados estão te esperando 🏁',
  displayName: 'Volant',
  previewData: {
    name: 'João',
    netTotal: 'R$ 1.245,80',
    entriesCount: 12,
    checkoutUrl: 'https://usevolant.app/app',
    couponCode: 'primeiros25',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, Arial, sans-serif', padding: '24px 0' }
const container = { maxWidth: '520px', margin: '0 auto', padding: '0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#475569', margin: '0 0 16px', lineHeight: '1.6' }
const cardHighlight = { background: '#f0fdf4', borderRadius: '12px', padding: '20px', border: '1px solid #bbf7d0', margin: '8px 0', textAlign: 'center' as const }
const badgeText = { fontSize: '11px', fontWeight: 'bold', color: '#16a34a', letterSpacing: '0.12em', margin: '0 0 6px' }
const offerTitle = { fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 10px' }
const offerCode = { fontSize: '14px', color: '#334155', margin: '0 0 8px' }
const offerHint = { fontSize: '12px', color: '#64748b', margin: '0', lineHeight: '1.5' }
const cta = { backgroundColor: '#16a34a', color: '#ffffff', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', textDecoration: 'none' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0 16px' }
const small = { fontSize: '12px', color: '#94a3b8', margin: '0', lineHeight: '1.5' }
