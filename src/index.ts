import type { Plugin } from "@opencode-ai/plugin"

export type EventSoundEvent =
  | "session.idle"
  | "session.error"
  | "permission.asked"
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
// After an error the session goes idle immediately, which would play the
// "done" cue right after the "error" cue. Suppress idle cues shortly after
// an error cue.
const IDLE_SUPPRESS_AFTER_ERROR_MS = 5000

const DEFAULT_PHRASES: Record<EventSoundEvent, string> = {
  "session.idle": "다 됐다",
  "session.error": "뻑났다",
  "permission.asked": "승인 좀",
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
  // opencode renamed the permission event in ~1.18.x:
  //   old: permission.updated (properties.type)
  //   new: permission.asked   (properties.permission, title moved to metadata)
  // Only one of the two names fires per opencode version, so both keys share
  // the same phrase; whichever the running version emits gets spoken.
  const configured = options?.phrases ?? {}
  const permissionPhrase =
    configured["permission.asked"] ??
    configured["permission.updated"] ??
    DEFAULT_PHRASES["permission.asked"]
  const phrases: Record<EventSoundEvent, string> = {
    ...DEFAULT_PHRASES,
    ...configured,
    "permission.asked": permissionPhrase,
    "permission.updated": permissionPhrase,
  }
  const argv = ttsArgv(options?.voice)
  const lastPlayed = new Map<string, number>()
  let lastErrorAt = 0

  return {
    event: async ({ event }) => {
      const now = Date.now()
      if (event.type === "session.error") lastErrorAt = now
      if (
        event.type === "session.idle" &&
        now - lastErrorAt < IDLE_SUPPRESS_AFTER_ERROR_MS
      )
        return
      const phrase = phrases[event.type as EventSoundEvent]
      if (!phrase || !argv) return
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
