import nodemailer from 'nodemailer'
import env from '@/config/env'

export function getEmailTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.EMAIL_FROM) {
    return null
  }
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: Number(env.SMTP_PORT || 587) === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  })
}


