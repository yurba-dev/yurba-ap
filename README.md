# YurbaAudioPlayer

Minimal, zero-dependency audio player supporting dynamic playlists with auto-advance, smart playback persistence via LocalStorage, flexible speed cycling, and custom action buttons.

## Installation

```html
<link rel="stylesheet" href="/dist/yurba-ap.min.css">
<script src="/dist/yurba-ap.min.js"></script>
```

## Build

```bash
npm install
npm run build
```

Output: `dist/yurba-ap.min.js`, `dist/yurba-ap.min.css`

## Usage

The player is created entirely from JavaScript via the static `YurbaAP.create()` factory — no HTML markup needed. It appends itself to `document.body` and returns the element.

```js
const player = YurbaAP.create()

player.setTrack({
    title:  'His Theme',
    author: 'Toby Fox',
    cover:  'https://cdn.yurba.one/photos/4225.jpg',
    url:    'https://cdn.yurba.one/musebase/1.mp3',
})

player.play()
```

## API

### Static

| Method | Description |
|---|---|
| `YurbaAP.create(config)` | Create and mount a player. Returns the element. |

**Config options:**

| Key | Type | Default | Description |
|---|---|---|---|
| `icons` | object | built-in | Override button icons. Keys: `play`, `volume`. Each value is an HTML string. |
| `controls` | object | all visible | Hide built-in controls. Keys: `volume`, `speed`. Set to `false` to hide. |
| `buttons` | array | `[]` | Custom buttons. Each: `{ html, onClick? }`. `onClick(player, event)` is called on click. |
| `persist` | boolean | `true` | Save and restore volume, speed, and last track via `localStorage`. |
| `speedSteps` | array | `[0.5, 0.75, 1, 1.25, 1.5, 2]` | Playback speed cycle steps. Clicking the speed label cycles through them. |

### Instance

| Method | Description |
|---|---|
| `setTrack(track)` | Load and display a track. See track object below. |
| `play()` | Start playback. |
| `pause()` | Pause playback. |
| `togglePlay()` | Toggle play/pause. Returns `true` if now playing. |
| `isPaused()` | Returns `true` if paused or no track loaded. |
| `setPlaylist(playlist)` | Set the playlist object (keyed by index). |
| `getPlaylist()` | Returns the current playlist object. |
| `pushPlaylist(tracks)` | Append an array of track objects to the playlist. |
| `playFirst()` | Set and play the first track in the playlist. |
| `prevTrack()` | Play the previous track, if any. |
| `nextTrack()` | Play the next track. Fires `yurba-ap.playlist_end` if already on the last track. |
| `getPlayingIndex()` | Returns the current playlist index. |
| `setPlayingIndex(i)` | Set the current playlist index. |

**Track object:**

| Key | Type | Description |
|---|---|---|
| `title` | string | Track name shown in the player. |
| `author` | string | Artist name shown in the player. |
| `cover` | string | Cover image URL. Hidden if omitted or falsy. |
| `url` | string | Audio file URL. |

Any extra fields on the track object are preserved and accessible via `event.track` in event handlers.

## Events

All events fire on the `<yurba-ap>` element and carry an `event.track` property with the current track object.

| Event | Description |
|---|---|
| `yurba-ap.set_track` | A new track was loaded via `setTrack()`. |
| `yurba-ap.play` | Playback started. |
| `yurba-ap.pause` | Playback paused. |
| `yurba-ap.ended` | Current track ended. |
| `yurba-ap.playlist_end` | Reached the end of the playlist (last track ended, or `nextTrack()` called on the last track). |
| `yurba-ap.progress` | Playback position updated (fires on `timeupdate`). |
| `yurba-ap.volume` | Volume changed by user. |
| `yurba-ap.speed` | Playback speed changed. |

## CSS variables

The player ships with a light theme by default. Override these on the element or any parent:

```css
yurba-ap {
    --y-ap-bg:     #ffffff;
    --y-ap-text:   #1c1c1e;
    --y-ap-muted:  rgba(0, 0, 0, 0.4);
    --y-ap-accent: #4e7cff;
    --y-ap-track:  rgba(0, 0, 0, 0.08);
}
```

See [demo](https://yurba-dev.github.io/yurba-ap/) for full documentation.
