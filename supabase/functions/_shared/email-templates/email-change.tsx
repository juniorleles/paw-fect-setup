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

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme a alteração do seu e-mail na MagicZap ✨</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>✨ MagicZap</Text>
        <Heading style={h1}>Alteração de e-mail</Heading>
        <Text style={text}>
          Você solicitou a alteração do seu e-mail de{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link>{' '}
          para{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Text style={text}>Clique no botão abaixo para confirmar:</Text>
        <Button style={button} href={confirmationUrl}>
          Confirmar alteração
        </Button>
        <Text style={footer}>
          Se você não solicitou essa alteração, proteja sua conta imediatamente.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Nunito', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const logo = { fontSize: '24px', fontWeight: 'bold' as const, fontFamily: "'Fredoka', Arial, sans-serif", color: '#7c3aed', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, fontFamily: "'Fredoka', Arial, sans-serif", color: '#2d1754', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#737380', lineHeight: '1.6', margin: '0 0 25px' }
const link = { color: '#7c3aed', textDecoration: 'underline' }
const button = { backgroundColor: '#7c3aed', color: '#ffffff', fontSize: '14px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
