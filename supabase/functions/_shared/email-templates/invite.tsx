/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Você foi convidado(a) para a Secretária Pet 🐾</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>🐾 Secretária Pet</Text>
        <Heading style={h1}>Você foi convidado(a)!</Heading>
        <Text style={text}>
          Você recebeu um convite para a{' '}
          <Link href={siteUrl} style={link}><strong>Secretária Pet</strong></Link>.
          Clique no botão abaixo para aceitar e criar sua conta.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Aceitar convite
        </Button>
        <Text style={footer}>
          Se você não esperava esse convite, pode ignorar este e-mail.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Nunito', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const logo = { fontSize: '24px', fontWeight: 'bold' as const, fontFamily: "'Fredoka', Arial, sans-serif", color: '#7c3aed', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, fontFamily: "'Fredoka', Arial, sans-serif", color: '#2d1754', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#737380', lineHeight: '1.6', margin: '0 0 25px' }
const link = { color: '#7c3aed', textDecoration: 'underline' }
const button = { backgroundColor: '#7c3aed', color: '#ffffff', fontSize: '14px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
