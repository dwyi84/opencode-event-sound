# opencode-event-sound

Speak sound cues through your OS text-to-speech engine when [opencode](https://opencode.ai) sessions go idle, error out, or request permission.

> 세션 완료·에러·승인 요청 시 OS 음성(TTS)으로 소리로 알려주는 opencode 플러그인입니다. 기본 대사는 한국어이며 자유롭게 바꿀 수 있습니다.

## Install

Add the plugin to your opencode config (`~/.config/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [["opencode-event-sound"]]
}
```

Restart opencode. That's it — on macOS it speaks with your **Default Voice** (System Settings > Accessibility > Spoken Content).

## Options

Pass options via the tuple form:

```json
{
  "plugin": [
    [
      "opencode-event-sound",
      {
        "voice": "Jian (Premium)",
        "phrases": {
          "session.idle": "작업 끝!",
          "session.error": "에러 났어",
          "permission.updated": "확인해줘"
        }
      }
    ]
  ]
}
```

| Option    | Type                  | Default                                        | Description                                                                 |
| --------- | --------------------- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| `voice`   | `string`              | *(unset → macOS Default Voice)*                | Voice name passed to `say -v` on macOS. Ignored on Linux.                    |
| `phrases` | `Record<event, text>` | Korean defaults below                          | Override what is spoken per event. Set a phrase to `""` to silence an event. |

### Events

| Event                 | Fires when                        | Default phrase |
| --------------------- | --------------------------------- | -------------- |
| `session.idle`        | The agent finished its response   | `다 됐다`       |
| `session.error`       | The session hit an error          | `뻑났다`       |
| `permission.updated`  | Permission approval is requested  | `승인 좀`       |

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
