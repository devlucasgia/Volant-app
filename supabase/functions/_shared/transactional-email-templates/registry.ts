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

export const TEMPLATES: Record<string, TemplateEntry> = {
  'new-user-signup': newUserSignup,
  'new-subscription': newSubscription,
  'subscription-canceled': subscriptionCanceled,
  'payment-failed-internal': paymentFailedInternal,
}
