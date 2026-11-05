import type { AnalyticsService } from '../../ports'

/** Descarta los eventos. En desarrollo los deja en la consola de depuración. */
export class NoopAnalyticsService implements AnalyticsService {
  constructor(private readonly debug = false) {}
  track(event: string, props?: Record<string, string | number | boolean | null>) {
    if (this.debug) console.debug('[analytics:noop]', event, props ?? {})
  }
}
