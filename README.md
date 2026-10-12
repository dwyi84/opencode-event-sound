# opencode-event-sound

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![opencode plugin](https://img.shields.io/badge/opencode-plugin-000000?style=flat-square&logo=opencode&logoColor=white)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

Speak sound cues through your OS text-to-speech engine when [opencode](https://opencode.ai) sessions go idle, error out, or request permission.

> 세션 완료·에러·승인 요청 시 OS 음성(TTS)으로 소리로 알려주는 opencode 플러그인입니다. 기본 대사는 한국어이며 자유롭게 바꿀 수 있습니다.

## Install

On OpenCode v2 (opencode2), add the plugin to your opencode config (`~/.config/opencode/opencode.jsonc`) using the `plugins` array:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [{ "package": "opencode-event-sound", "options": {} }]
}
```

Or install it as a global package plugin:

```sh
opencode plugin add opencode-event-sound
```

Restart opencode. That's it — on macOS it speaks with your **Default Voice** (System Settings > Accessibility > Spoken Content).

> On OpenCode v1, use the `plugin` key with tuple form instead: `"plugin": [["opencode-event-sound", {}]]`. The same package supports both v1 and v2 (v1 object entrypoints require opencode `1.18.29`+).

## Options

Pass options via the object form on v2:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-event-sound",
      "options": {
        "voice": "Jian (Premium)",
        "phrases": {
          "session.idle": "작업 끝!",
          "session.error": "에러 났어",
          "permission.asked": "확인해줘"
        }
      }
    }
  ]
}
```

> On v1 the equivalent is the tuple form: `"plugin": [["opencode-event-sound", { ... }]]`.

| Option    | Type                  | Default                                        | Description                                                                 |
| --------- | --------------------- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| `voice`   | `string`              | *(unset → macOS Default Voice)*                | Voice name passed to `say -v` on macOS. Ignored on Linux.                    |
| `phrases` | `Record<event, text>` | Korean defaults below                          | Override what is spoken per event. Set a phrase to `""` to silence an event. |

### Events

| Event                 | Fires when                        | Default phrase |
| --------------------- | --------------------------------- | -------------- |
| `session.idle`        | The agent finished its response   | `다 됐다`       |
| `session.error`       | The session hit an error          | `뻑났다`        |
| `permission.asked`    | Permission approval is requested  | `승인 좀`       |

> opencode renamed the permission event around v1.18: `permission.updated` (old) → `permission.asked` (new). Both names are supported — configure either one and it applies to whichever your running version emits. A completion cue is also suppressed for 5s after an error, since the session goes idle right after failing.

Duplicate cues for the same event within 1.5s are throttled to avoid spam.

## Platform support

- **macOS**: [`say`](https://ss64.com/mac/say.html) — uses the system Default Voice unless `voice` option is set. List installed voices: `say -v '?'`
- **Linux**: `spd-say`, falling back to `espeak-ng` / `espeak` if installed
- **Other platforms**: silently does nothing

TTS failures never interrupt your opencode session; they are swallowed quietly.

## Related

- [opencode-notificator](https://github.com/panta82/opencode-notificator), [opencode-notify](https://github.com/kdcokenny/opencode-notify) — desktop notification alternatives

## License

[MIT](./LICENSE)
