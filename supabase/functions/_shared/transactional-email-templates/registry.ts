/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as newUserSignup } from './new-user-signup.tsx'
import { template as newSubscription } from './new-subscription.tsx'
import { template as subscriptionCanceled } from './subscription-canceled.tsx'
import { template as paymentFailedInternal } from './payment-failed-internal.tsx'
import { template as welcome } from './welcome.tsx'
import { template as subscriptionReceipt } from './subscription-receipt.tsx'
import { template as paymentFailed } from './payment-failed.tsx'
import { template as weeklySummary } from './weekly-summary.tsx'
import { template as maintenanceAlert } from './maintenance-alert.tsx'
import { template as trialWelcome } from './trial-welcome.tsx'
import { template as trialEndingSoon } from './trial-ending-soon.tsx'
import { template as trialEnded } from './trial-ended.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'new-user-signup': newUserSignup,
  'new-subscription': newSubscription,
  'subscription-canceled': subscriptionCanceled,
  'payment-failed-internal': paymentFailedInternal,
  'welcome': welcome,
  'subscription-receipt': subscriptionReceipt,
  'payment-failed': paymentFailed,
  'weekly-summary': weeklySummary,
  'maintenance-alert': maintenanceAlert,
  'trial-welcome': trialWelcome,
  'trial-ending-soon': trialEndingSoon,
  'trial-ended': trialEnded,
}
