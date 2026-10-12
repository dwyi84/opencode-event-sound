import type { Plugin as V1Plugin } from "@opencode-ai/plugin"
import type { Plugin as OpenCodePlugin } from "@opencode/plugin"

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
 *   "plugins": [{ "package": "opencode-event-sound", "options": { "voice": "Jian (Premium)" } }]
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

function createEventHandler(options?: EventSoundOptions) {
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

  return (event: { type: string }) => {
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
  }
}

// opencode v2 ("opencode2") entrypoint: Plugin.define({ id, setup }). setup
// subscribes to the public event stream and returns a cleanup function.
const v2: OpenCodePlugin.Plugin = {
  id: "opencode-event-sound",
  setup(ctx: OpenCodePlugin.Context) {
    const onEvent = createEventHandler(ctx.options as EventSoundOptions)
    const controller = new AbortController()
    void (async () => {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        onEvent(event)
      }
    })().catch(() => {})
    return () => controller.abort()
  },
}

// opencode v1 entrypoint: a plugin function returning a hooks object.
const v1: V1Plugin = async (_input, options) => {
  const onEvent = createEventHandler(options as EventSoundOptions)
  return {
    event: async ({ event }) => onEvent(event),
  }
}

// A package can expose both V1 and V2 from one default export: V1 calls
// `server()`, V2 calls `setup()`. Supported by opencode >= 1.18.29.
export const EventSoundPlugin = v1
export default { ...v2, server: v1 }
