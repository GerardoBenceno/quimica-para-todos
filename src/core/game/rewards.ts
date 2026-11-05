import type { ContentBundle } from '../content/bundle'
import type { Reward } from '../../models'
import { uuid } from '../ids'
import { chestRewards, freezeReward, type GameValues } from './config'
import { lessonsOfWorld } from './structure'
import type { UserState } from './state'

export interface ChestNode {
  id: string
  reward: Reward
  afterLessonId: string
  /** Posición (1-based) de la lección tras la que cuelga el cofre. */
  afterIndex: number
  status: 'locked' | 'ready' | 'claimed'
}

/** Cofres de la ruta de un mundo: uno cada `trigger.every` lecciones. */
export function chestNodes(b: ContentBundle, worldId: string, s: UserState, completed: Set<string>): ChestNode[] {
  const lessons = lessonsOfWorld(b, worldId)
  const claimed = new Set(s.user_rewards.map((r) => r.source))
  const out: ChestNode[] = []
  for (const r of chestRewards(b)) {
    const every = r.trigger.every ?? 0
    lessons.forEach((l, i) => {
      if ((i + 1) % every !== 0) return
      const id = `chest:${r.id}:${l.id}`
      out.push({
        id,
        reward: r,
        afterLessonId: l.id,
        afterIndex: i + 1,
        status: claimed.has(id) ? 'claimed' : completed.has(l.id) ? 'ready' : 'locked',
      })
    })
  }
  return out
}

/** Abre un cofre listo: su value se suma a las monedas. */
export function claimChest(s: UserState, node: ChestNode, now: Date): UserState {
  if (node.status !== 'ready') return s
  return {
    ...s,
    user: { ...s.user, coins: s.user.coins + node.reward.value },
    user_rewards: [
      ...s.user_rewards,
      { id: uuid(), user_id: s.user.id, reward_id: node.reward.id, source: node.id, obtained_at: now.toISOString(), claimed: true },
    ],
  }
}

export function canSpend(s: UserState, amount: number): boolean {
  return amount >= 0 && s.user.coins >= amount
}

export function spendCoins(s: UserState, amount: number): UserState | null {
  if (!canSpend(s, amount)) return null
  return { ...s, user: { ...s.user, coins: s.user.coins - amount } }
}

/** Compra una congelación de racha (tienda). */
export function buyFreeze(b: ContentBundle, s: UserState, g: GameValues, now: Date): UserState | null {
  const r = freezeReward(b)
  if (!r) return null
  const paid = spendCoins(s, g.freezeCost)
  if (!paid) return null
  return {
    ...paid,
    streak: { ...paid.streak, freezes_available: paid.streak.freezes_available + r.value },
    user_rewards: [
      ...paid.user_rewards,
      { id: uuid(), user_id: s.user.id, reward_id: r.id, source: 'shop', obtained_at: now.toISOString(), claimed: true },
    ],
  }
}
