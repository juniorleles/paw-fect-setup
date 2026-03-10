/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu link de login na MagicZap ✨</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>✨ MagicZap</Text>
        <Heading style={h1}>Seu link de acesso</Heading>
        <Text style={text}>
          Clique no botão abaixo para entrar na Secretária Pet. Este link expira em breve.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Entrar
        </Button>
        <Text style={footer}>
          Se você não solicitou este link, pode ignorar este e-mail com segurança.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Nunito', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const logo = { fontSize: '24px', fontWeight: 'bold' as const, fontFamily: "'Fredoka', Arial, sans-serif", color: '#7c3aed', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, fontFamily: "'Fredoka', Arial, sans-serif", color: '#2d1754', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#737380', lineHeight: '1.6', margin: '0 0 25px' }
const button = { backgroundColor: '#7c3aed', color: '#ffffff', fontSize: '14px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
