export class RateLimiter {
  constructor(env) {
    this.state = env.RATE_LIMITER
  }

  async limit(key, limit = 100, window = 60) {
    const { success } = await this.state.blockConcurrencyWhile(async () => {
      const current = await this.state.get(key)
      if (current === null) {
        await this.state.put(key, 1, { expirationTtl: window })
        return { success: true }
      }
      if (current >= limit) {
        return { success: false }
      }
      await this.state.put(key, current + 1, { expirationTtl: window })
      return { success: true }
    })
    return success
  }
}
