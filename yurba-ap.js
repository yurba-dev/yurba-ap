class YurbaAP extends HTMLElement {
    static LABELS = {
        play: 'Play',
        pause: 'Pause',
        prev: 'Previous track',
        next: 'Next track',
        volume: 'Volume',
        speed: 'Playback speed',
        seek: 'Seek',
    }

    static ICONS = {
        play: '<span class="material-symbols-rounded">play_arrow</span>',
        pause: '<span class="material-symbols-rounded">pause</span>',
        prev: '<span class="material-symbols-rounded">skip_previous</span>',
        next: '<span class="material-symbols-rounded">skip_next</span>',
        volume: '<span class="material-symbols-rounded">volume_up</span>',
    }

    static create(config = {}) {
        const element = document.createElement('yurba-ap')
        element.config = config
        document.body.appendChild(element)
        return element
    }

    // Throws when the browser blocks site data
    static storage() {
        try {
            return localStorage
        } catch {
            return {}
        }
    }

    connectedCallback() {
        if (!this.built) this.build()

        this.connection = new AbortController()
        document.addEventListener('click', () => this.closePopups(), { signal: this.connection.signal })
    }

    disconnectedCallback() {
        this.connection?.abort()
    }

    build() {
        this.built = true
        const config = this.config || {}
        const icons = this.icons = {}
        Object.keys(YurbaAP.ICONS).forEach(name => { icons[name] = config.icons?.[name] || YurbaAP.ICONS[name] })
        const controls = config.controls || {}
        const buttons = config.buttons || []
        this.persist = config.persist != false
        this.speedSteps = config.speedSteps || [0.5, 0.75, 1, 1.25, 1.5, 2]
        this.labels = Object.assign({}, YurbaAP.LABELS, config.labels || {})
        const labels = this.labels
        function attribute(text) {
            return String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
        }

        const storage = YurbaAP.storage()
        const savedVolume = this.persist && storage.yap_volume != null ? Number(storage.yap_volume) : 0.5
        const savedSpeed = this.persist && storage.yap_speed != null ? Number(storage.yap_speed) : 1

        const showVolume = controls.volume != false
        const showSpeed = controls.speed != false
        const speedMin = this.speedSteps[0]
        const speedMax = this.speedSteps[this.speedSteps.length - 1]

        const customButtons = buttons.map((button, index) =>
            `<div class="y-ap__btn" data-ap-btn="${index}" role="button" tabindex="0"${button.label ? ` aria-label="${attribute(button.label)}"` : ''}>${button.html}</div>`
        ).join('')

        this.innerHTML = `<div class="y-ap">
            <div class="y-ap__info" hidden>
                <img class="y-ap__cover" alt="">
                <div class="y-ap__meta">
                    <p class="y-ap__author"></p>
                    <p class="y-ap__title"></p>
                </div>
                <div class="y-ap__player-controls">
                    <div class="y-ap__btn-prev" role="button" tabindex="0" aria-label="${attribute(labels.prev)}" hidden>${icons.prev}</div>
                    <div class="y-ap__play" role="button" tabindex="0" aria-label="${attribute(labels.play)}">${icons.play}</div>
                    <div class="y-ap__btn-next" role="button" tabindex="0" aria-label="${attribute(labels.next)}" hidden>${icons.next}</div>
                </div>
                <div class="y-ap__side-controls">
                    ${showVolume ?
                        `<div class="y-ap__popup-wrap">
                            <span class="y-ap__icon y-ap__icon--volume" role="button" tabindex="0" aria-label="${attribute(labels.volume)}">${icons.volume}</span>
                            <div class="y-ap__vol-popup y-ap__popup">
                                <input type="range" class="y-ap__slider y-ap__slider--volume" aria-label="${attribute(labels.volume)}" min="0" max="1" step="0.01" value="${savedVolume}">
                            </div>
                        </div>` : ''}
                    ${showSpeed ?
                        `<div class="y-ap__popup-wrap">
                            <span class="y-ap__speed" role="button" tabindex="0" aria-label="${attribute(labels.speed)}">${savedSpeed.toFixed(2)}x</span>
                            <div class="y-ap__speed-popup y-ap__popup">
                                <input type="range" class="y-ap__slider y-ap__slider--speed" aria-label="${attribute(labels.speed)}" min="${speedMin}" max="${speedMax}" step="0.05" value="${savedSpeed}">
                            </div>
                        </div>` : ''}
                    ${customButtons}
                </div>
            </div>
            <div class="y-ap__progress">
                <span class="y-ap__time y-ap__time--current">00:00</span>
                <div class="y-ap__track-wrap">
                    <input type="range" class="y-ap__slider y-ap__slider--time" aria-label="${attribute(labels.seek)}" min="0" step="1" value="0">
                    <div class="y-ap__buffered"></div>
                </div>
                <span class="y-ap__time y-ap__time--duration">00:00</span>
            </div>
        </div>`

        this.infoElement = this.querySelector('.y-ap__info')
        this.playButton = this.querySelector('.y-ap__play')
        this.prevButton = this.querySelector('.y-ap__btn-prev')
        this.nextButton = this.querySelector('.y-ap__btn-next')
        this.currentTimeElement = this.querySelector('.y-ap__time--current')
        this.durationElement = this.querySelector('.y-ap__time--duration')
        this.timeSlider = this.querySelector('.y-ap__slider--time')
        this.volumeSlider = this.querySelector('.y-ap__slider--volume')
        this.speedLabel = this.querySelector('.y-ap__speed')
        this.bufferedElement = this.querySelector('.y-ap__buffered')
        this.coverElement = this.querySelector('.y-ap__cover')
        this.titleElement = this.querySelector('.y-ap__title')
        this.authorElement = this.querySelector('.y-ap__author')

        this.playlist = {}
        this.playingIndex = 0
        this.bindMediaSession()

        this.addEventListener('keydown', event => {
            if (event.key != 'Enter' && event.key != ' ') return
            if (event.target.getAttribute('role') != 'button') return
            event.preventDefault()
            event.target.click()
        })

        this.playButton.addEventListener('click', event => {
            event.stopPropagation()
            this.togglePlay()
        })

        if (this.prevButton) this.prevButton.addEventListener('click', event => {
            event.stopPropagation()
            this.prevTrack()
        })

        if (this.nextButton) this.nextButton.addEventListener('click', event => {
            event.stopPropagation()
            this.nextTrack()
        })

        if (this.timeSlider) this.timeSlider.addEventListener('input', () => {
            if (this.audio) {
                this.audio.currentTime = this.timeSlider.value
                this.updateSlider(this.timeSlider)
            }
        })

        if (this.volumeSlider) this.volumeSlider.addEventListener('input', () => this.onVolumeInput())

        buttons.forEach((button, index) => {
            const element = this.querySelector(`[data-ap-btn="${index}"]`)
            if (element && button.onClick) element.addEventListener('click', event => button.onClick(this, event))
        })

        if (this.volumeSlider) this.updateSlider(this.volumeSlider)

        const volumeIcon = this.querySelector('.y-ap__icon--volume')
        const volumePopup = this.querySelector('.y-ap__vol-popup')
        const speedPopup = this.querySelector('.y-ap__speed-popup')

        if (volumeIcon && volumePopup) {
            volumeIcon.addEventListener('click', event => {
                event.stopPropagation()
                volumePopup.classList.toggle('is-open')
                if (speedPopup) speedPopup.classList.remove('is-open')
            })
        }

        if (volumePopup) volumePopup.addEventListener('click', event => event.stopPropagation())
        if (speedPopup) speedPopup.addEventListener('click', event => event.stopPropagation())

        if (this.speedLabel && speedPopup) {
            const speedSlider = speedPopup.querySelector('.y-ap__slider--speed')
            if (speedSlider) {
                this.updateSlider(speedSlider)
                speedSlider.addEventListener('input', () => {
                    this.setSpeed(Number(speedSlider.value))
                    this.updateSlider(speedSlider)
                })
            }

            this.speedLabel.addEventListener('click', event => {
                event.stopPropagation()
                speedPopup.classList.toggle('is-open')
                if (volumePopup) volumePopup.classList.remove('is-open')
            })
        }

        if (this.persist && storage.yap_lastTrack) {
            try {
                const last = JSON.parse(storage.yap_lastTrack)
                // /musebase/<n>.mp3 URLs are not served
                if (/\/musebase\/-?\d+\.mp3/.test(last?.url ?? '')) throw new Error('stale')
                this.setTrack(last)
            } catch { }
        }
    }

    closePopups() {
        this.querySelectorAll('.y-ap__popup.is-open').forEach(popup => popup.classList.remove('is-open'))
    }

    setTrack(track) {
        if (!track || this.currentTrack == track) return

        if (this.audio) {
            this.audioListeners.abort()
            if (!this.audio.paused) {
                this.audio.pause()
                this.emit('pause')
            }
            this.audio.removeAttribute('src')
            this.audio.load()
        }

        this.currentTrack = track

        if (this.timeSlider) {
            this.timeSlider.value = 0
            this.updateSlider(this.timeSlider)
        }

        if (this.currentTimeElement) this.currentTimeElement.textContent = '00:00'
        if (this.durationElement) this.durationElement.textContent = '00:00'
        if (this.bufferedElement) this.bufferedElement.style.width = '0'
        // The last track's length would let a seek land past the end of this one
        if (this.timeSlider) this.timeSlider.max = 0

        if (this.persist) {
            try {
                YurbaAP.storage().yap_lastTrack = JSON.stringify(track)
            } catch { }
        }

        this.titleElement.textContent = track.title ?? ''
        this.authorElement.textContent = track.author ?? ''

        if (track.cover) {
            this.coverElement.src = track.cover
            this.coverElement.hidden = false
        } else {
            this.coverElement.hidden = true
        }

        this.infoElement.hidden = false

        const storage = YurbaAP.storage()
        const volume = this.volumeSlider ? Number(this.volumeSlider.value) : (this.persist && storage.yap_volume != null ? Number(storage.yap_volume) : 0.5)
        const speed = this.currentSpeed()

        this.audio = new Audio()
        if (track.url) this.audio.src = track.url
        this.audio.preload = 'metadata'
        // Non-finite values from storage make these setters throw
        this.audio.volume = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.5
        // load() resets playbackRate to the default one
        this.audio.defaultPlaybackRate = this.audio.playbackRate = Number.isFinite(speed) && speed > 0 ? speed : 1

        this.audioListeners = new AbortController()
        const signal = this.audioListeners.signal

        this.audio.addEventListener('timeupdate', () => this.onTimeUpdate(), { signal })
        this.audio.addEventListener('progress', () => this.onProgress(), { signal })
        this.audio.addEventListener('ended', () => this.onEnded(), { signal })

        this.audio.addEventListener('play', () => { this.syncPlayButton(); this.emit('play') }, { signal })
        this.audio.addEventListener('pause', () => { this.syncPlayButton(); this.emit('pause') }, { signal })
        this.audio.addEventListener('error', () => this.onError(), { signal })
        this.audio.addEventListener('durationchange', () => this.onDuration(), { signal })

        this.syncPlayButton()
        this.updatePlayingIndex()
        this.updateMediaSession()
        this.emit('set_track')
    }

    // Some mp3s report Infinity until the end is reached
    onDuration() {
        const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0
        if (this.timeSlider) {
            this.timeSlider.max = duration
            this.updateSlider(this.timeSlider)
        }

        if (this.durationElement) this.durationElement.textContent = this.formatTime(duration)
    }

    // A network error mid-track leaves the element unpaused but silent
    onError() {
        if (!this.audio.paused) this.audio.pause()
        this.emit('error')
    }

    bindMediaSession() {
        const session = navigator.mediaSession
        if (!session) return
        const handlers = {
            play: () => this.play(),
            pause: () => this.pause(),
            previoustrack: () => this.prevTrack(),
            nexttrack: () => this.nextTrack(),
            seekto: details => {
                if (!this.audio || !Number.isFinite(details.seekTime)) return
                this.audio.currentTime = details.seekTime
                this.onTimeUpdate()
            },
        }
        for (const action in handlers) {
            try { session.setActionHandler(action, handlers[action]) } catch { }
        }
    }

    updateMediaSession() {
        const session = navigator.mediaSession
        if (!session || typeof MediaMetadata != 'function') return
        const track = this.currentTrack
        // A cover URL the browser cannot parse makes MediaMetadata throw
        try {
            session.metadata = track ? new MediaMetadata({
                title: track.title ?? '',
                artist: track.author ?? '',
                artwork: track.cover ? [{ src: track.cover }] : [],
            }) : null
        } catch {
            session.metadata = null
        }
    }

    updatePlayingIndex() {
        const keys = Object.keys(this.playlist)
        const index = keys.findIndex(key => this.playlist[key] == this.currentTrack)

        if (index != -1) {
            this.playingIndex = index
            return
        }

        this.playlist = { 0: this.currentTrack }
        this.playingIndex = 0
        this.updateNavButtons()
    }

    // The playing track may come as another object with the same id: it is adopted, so the queue goes on from it
    setPlaylist(playlist) {
        this.playlist = playlist
        const current = this.currentTrack
        const keys = Object.keys(playlist)
        const index = keys.findIndex(key => playlist[key] == current || (current?.id != null && String(playlist[key]?.id) == String(current.id)))
        if (index != -1) {
            this.playingIndex = index
            this.currentTrack = playlist[keys[index]]
        }
        this.updateNavButtons()
    }

    getPlaylist() {
        return this.playlist
    }

    pushPlaylist(tracks) {
        tracks.forEach(track => {
            this.playlist[Object.keys(this.playlist).length] = track
        })
        this.updateNavButtons()
    }

    playableIndex(from, step) {
        const length = Object.keys(this.playlist).length
        for (let index = from + step; index >= 0 && index < length; index += step) {
            if (this.playlist[index]?.url) return index
        }

        return -1
    }

    playAt(index) {
        this.playingIndex = index
        this.setTrack(this.playlist[index])
        this.play()
    }

    prevTrack() {
        const index = this.playableIndex(this.playingIndex, -1)
        if (index != -1) this.playAt(index)
    }

    nextTrack() {
        const index = this.playableIndex(this.playingIndex, 1)
        if (index != -1) this.playAt(index)
        else this.emit('playlist_end')
    }

    updateNavButtons() {
        const show = Object.keys(this.playlist).length > 1
        if (this.prevButton) this.prevButton.hidden = !show
        if (this.nextButton) this.nextButton.hidden = !show
    }

    playFirst() {
        const index = this.playableIndex(-1, 1)
        if (index != -1) this.playAt(index)
    }

    getPlayingIndex() { return this.playingIndex }
    setPlayingIndex(index) { this.playingIndex = index }

    togglePlay() {
        if (!this.audio) return
        if (this.isPaused()) this.play()
        else this.pause()
        return !this.isPaused()
    }

    isPaused() {
        return !this.audio || this.audio.paused
    }

    play() {
        if (!this.audio) return
        const audio = this.audio
        // An element that failed never loads again by itself
        if (audio.error) {
            const time = audio.currentTime
            audio.load()
            if (time) audio.currentTime = time
        }
        // A failed source rejects play() but stays unpaused
        audio.play()?.catch(() => {
            if (this.audio == audio && !audio.paused) audio.pause()
        })
    }

    pause() {
        if (!this.audio) return
        this.audio.pause()
    }

    syncPlayButton() {
        const playing = !this.isPaused()
        this.playButton.innerHTML = playing ? this.icons.pause : this.icons.play
        this.playButton.setAttribute('aria-label', playing ? this.labels.pause : this.labels.play)
        if (navigator.mediaSession) navigator.mediaSession.playbackState = !this.currentTrack ? 'none' : playing ? 'playing' : 'paused'
    }

    onTimeUpdate() {
        if (this.timeSlider) { this.timeSlider.value = this.audio.currentTime; this.updateSlider(this.timeSlider) }
        if (this.currentTimeElement) this.currentTimeElement.textContent = this.formatTime(this.audio.currentTime)
        this.emit('progress')
    }

    onProgress() {
        if (this.audio.buffered.length > 0 && this.bufferedElement && this.audio.duration) {
            this.bufferedElement.style.width = (this.audio.buffered.end(this.audio.buffered.length - 1) / this.audio.duration * 100) + '%'
        }
    }

    onEnded() {
        this.syncPlayButton()
        this.emit('ended')
        this.nextTrack()
    }

    onVolumeInput() {
        if (this.audio) this.audio.volume = this.volumeSlider.value
        if (this.persist) YurbaAP.storage().yap_volume = this.volumeSlider.value
        this.updateSlider(this.volumeSlider)
        this.emit('volume')
    }

    currentSpeed() {
        if (this.speedLabel) return parseFloat(this.speedLabel.textContent) || 1
        const storage = YurbaAP.storage()
        return this.persist && storage.yap_speed != null ? Number(storage.yap_speed) : 1
    }

    cycleSpeed() {
        const steps = this.speedSteps
        const current = this.audio ? this.audio.playbackRate : this.currentSpeed()
        const index = steps.findIndex(step => Math.abs(step - current) < 0.01)
        this.setSpeed(steps[(index + 1) % steps.length])
    }

    setSpeed(speed) {
        if (this.audio) this.audio.playbackRate = speed
        if (this.speedLabel) this.speedLabel.textContent = speed.toFixed(2) + 'x'
        const speedSlider = this.querySelector('.y-ap__slider--speed')
        if (speedSlider && Number(speedSlider.value) != speed) {
            speedSlider.value = speed
            this.updateSlider(speedSlider)
        }
        if (this.persist) YurbaAP.storage().yap_speed = speed
        this.emit('speed')
    }

    updateSlider(slider) {
        const min = Number(slider.min) || 0
        const max = Number(slider.max) || 1
        const value = Number(slider.value) || 0
        const percent = max > min ? ((value - min) / (max - min) * 100) : 0
        slider.style.background = `linear-gradient(to right, var(--y-ap-accent) ${percent}%, var(--y-ap-track) ${percent}%)`
    }

    emit(name) {
        const event = new CustomEvent(`yurba-ap.${name}`, { bubbles: true })
        event.track = this.currentTrack
        this.dispatchEvent(event)
    }

    formatTime(time) {
        if (!Number.isFinite(time) || time <= 0) return '00:00'
        const minutes = Math.floor(time / 60)
        const seconds = Math.floor(time % 60)
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
}

customElements.define('yurba-ap', YurbaAP)
