import type { AnalyticsService } from '../../ports'
import { NotImplementedError } from '../../core/result'

/** GA4 o PostHog en el futuro: eventos anónimos, sin PII ni ids publicitarios. */
export class ProviderAnalyticsService implements AnalyticsService {
  track(): never {
    throw new NotImplementedError('ProviderAnalyticsService.track')
  }
}
