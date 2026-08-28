import crypto from 'crypto'
import { prisma } from './prisma'

export interface WebhookEvent {
  event: 'transfer.created' | 'transfer.completed' | 'transfer.downloaded' | 'transfer.expired'
  data: Record<string, any>
  timestamp: string
}

/**
 * Computes an HMAC-SHA256 signature for outgoing webhook verification.
 */
export function signWebhookPayload(payloadString: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payloadString).digest('hex')
}

/**
 * Dispatches outgoing webhook events to registered user webhook endpoints with cryptographic signatures.
 */
export async function dispatchUserWebhooks(userId: string, eventName: string, eventData: Record<string, any>) {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: { userId, isActive: true }
    })

    const relevant = webhooks.filter(w =>
      w.events.split(',').map(e => e.trim()).includes(eventName) || w.events.includes('*')
    )
    if (relevant.length === 0) return

    const payload: WebhookEvent = {
      event: eventName as any,
      data: eventData,
      timestamp: new Date().toISOString()
    }
    const payloadString = JSON.stringify(payload)

    for (const hook of relevant) {
      const signature = signWebhookPayload(payloadString, hook.secret)
      fetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'DropLync-Webhook-Dispatcher/1.0',
          'x-droplync-event': eventName,
          'x-droplync-signature': `sha256=${signature}`
        },
        body: payloadString
      }).catch(err => {
        console.warn(`Webhook delivery failure to ${hook.url}:`, err.message)
      })
    }
  } catch (err) {
    console.error('Webhook dispatch error:', err)
  }
}
