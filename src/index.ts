import type { Plugin } from "@opencode-ai/plugin"

export type EventSoundEvent =
  | "session.idle"
  | "session.error"
  | "permission.updated"

/**
 * Voice usage (macOS):
 * By default this plugin calls `say` WITHOUT the -v flag, so macOS speaks with
 * the Default Voice from System Settings > Accessibility > Spoken Content.
 * To pin a specific voice, pass it via plugin options, e.g.:
 *
 *   "plugin": [["opencode-event-sound", { "voice": "Jian (Premium)" }]]
 *
 * List installed voices with `say -v '?'`. Premium voices must be downloaded
 * first (System Settings > Accessibility > Spoken Content > System Voice >
 * Manage Voices). The voice option only applies on macOS; on Linux the
 * system default of spd-say/espeak is used.
 */
export interface EventSoundOptions {
  voice?: string
  phrases?: Partial<Record<EventSoundEvent, string>>
}

const THROTTLE_MS = 1500

const DEFAULT_PHRASES: Record<EventSoundEvent, string> = {
  "session.idle": "다 됐다",
  "session.error": "뻑났다",
  "permission.updated": "승인 좀",
}

function ttsArgv(voice?: string): string[] | null {
  switch (process.platform) {
    case "darwin":
      return voice ? ["say", "-v", voice] : ["say"]
    case "linux": {
      const bin = Bun.which("spd-say") ?? Bun.which("espeak-ng") ?? Bun.which("espeak")
      return bin ? [bin] : null
    }
    default:
      return null
  }
}

export const EventSoundPlugin: Plugin = async (_input, options?: EventSoundOptions) => {
  const phrases = { ...DEFAULT_PHRASES, ...options?.phrases }
  const argv = ttsArgv(options?.voice)
  const lastPlayed = new Map<string, number>()

  return {
    event: async ({ event }) => {
      const phrase = phrases[event.type as EventSoundEvent]
      if (!phrase || !argv) return
      const now = Date.now()
      if (now - (lastPlayed.get(event.type) ?? 0) < THROTTLE_MS) return
      lastPlayed.set(event.type, now)
      try {
        Bun.spawn([...argv, phrase], {
          stdout: "ignore",
          stderr: "ignore",
        }).unref()
      } catch {}
    },
  }
}

export default EventSoundPlugin
