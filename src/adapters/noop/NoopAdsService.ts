import type { AdsService } from '../../ports'

export class NoopAdsService implements AdsService {
  readonly enabled = false
  slot() {
    return null
  }
}
