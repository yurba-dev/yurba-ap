class YurbaAP extends HTMLElement {
    static create(config = {}) {
        const element = document.createElement('yurba-ap')
        element.config = config
        document.body.appendChild(element)
        return element
    }

    connectedCallback() {
        const config = this.config || {}
        const icons = config.icons || {}
        const controls = config.controls || {}
        const buttons = config.buttons || []
        this.persist = config.persist !== false
        this.speedSteps = config.speedSteps || [0.5, 0.75, 1, 1.25, 1.5, 2]

        const savedVolume = this.persist && localStorage.yap_volume != null ? localStorage.yap_volume : 0.5
        const savedSpeed = this.persist && localStorage.yap_speed != null ? Number(localStorage.yap_speed) : 1

        const showVolume = controls.volume !== false
        const showSpeed = controls.speed !== false
        const speedMin = this.speedSteps[0]
        const speedMax = this.speedSteps[this.speedSteps.length - 1]

        const playHtml = icons.play || '<span class="material-symbols-rounded">play_arrow</span>'
        const volumeHtml = icons.volume || '<span class="material-symbols-rounded">volume_up</span>'

        const customButtons = buttons.map((button, index) =>
            `<div class="y-ap__btn" data-ap-btn="${index}">${button.html}</div>`
        ).join('')

        this.innerHTML = `<div class="y-ap">
            <div class="y-ap__info" hidden>
                <img class="y-ap__cover" alt="">
                <div class="y-ap__meta">
                    <p class="y-ap__author"></p>
                    <p class="y-ap__title"></p>
                </div>
                <div class="y-ap__player-controls">
                    <div class="y-ap__btn-prev" hidden><span class="material-symbols-rounded">skip_previous</span></div>
                    <div class="y-ap__play">${playHtml}</div>
                    <div class="y-ap__btn-next" hidden><span class="material-symbols-rounded">skip_next</span></div>
                </div>
                <div class="y-ap__side-controls">
                    ${showVolume ?
                        `<div class="y-ap__popup-wrap">
                            <span class="y-ap__icon y-ap__icon--volume">${volumeHtml}</span>
                            <div class="y-ap__vol-popup y-ap__popup">
                                <input type="range" class="y-ap__slider y-ap__slider--volume" min="0" max="1" step="0.01" value="${savedVolume}">
                            </div>
                        </div>` : ''}
                    ${showSpeed ?
                        `<div class="y-ap__popup-wrap">
                            <span class="y-ap__speed">${savedSpeed.toFixed(2)}x</span>
                            <div class="y-ap__speed-popup y-ap__popup">
                                <input type="range" class="y-ap__slider y-ap__slider--speed" min="${speedMin}" max="${speedMax}" step="0.05" value="${savedSpeed}">
                            </div>
                        </div>` : ''}
                    ${customButtons}
                </div>
            </div>
            <div class="y-ap__progress">
                <span class="y-ap__time y-ap__time--current">00:00</span>
                <div class="y-ap__track-wrap">
                    <input type="range" class="y-ap__slider y-ap__slider--time" min="0" step="1" value="0">
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

        document.addEventListener('click', () => {
            if (volumePopup) volumePopup.classList.remove('is-open')
            if (speedPopup) speedPopup.classList.remove('is-open')
        })

        if (this.persist && localStorage.yap_lastTrack) {
            try {
                this.setTrack(JSON.parse(localStorage.yap_lastTrack))
            } catch (error) { }
        }
    }

    setTrack(track) {
        if (this.currentTrack == track) return
        this.currentTrack = track

        if (this.audio) this.pause()

        if (this.timeSlider) {
            this.timeSlider.value = 0
            this.updateSlider(this.timeSlider)
        }

        if (this.currentTimeElement) this.currentTimeElement.textContent = '00:00'
        if (this.durationElement) this.durationElement.textContent = '00:00'

        if (this.persist) {
            try {
                localStorage.yap_lastTrack = JSON.stringify(track)
            } catch (error) { }
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

        const volume = this.volumeSlider ? Number(this.volumeSlider.value) : (this.persist && localStorage.yap_volume != null ? Number(localStorage.yap_volume) : 0.5)
        const speed = this.currentSpeed()

        this.audio = new Audio()
        this.audio.src = track.url
        this.audio.preload = 'metadata'
        this.audio.volume = volume
        this.audio.playbackRate = speed

        this.audio.addEventListener('timeupdate', () => this.onTimeUpdate())
        this.audio.addEventListener('progress', () => this.onProgress())
        this.audio.addEventListener('ended', () => this.onEnded())

        this.audio.addEventListener('loadedmetadata', () => {
            if (this.timeSlider) {
                this.timeSlider.max = this.audio.duration
                this.updateSlider(this.timeSlider)
            }

            if (this.durationElement) this.durationElement.textContent = this.formatTime(this.audio.duration)
        }, { once: true })

        this.updatePlayingIndex()
        this.emit('set_track')
    }

    updatePlayingIndex() {
        const keys = Object.keys(this.playlist)
        const index = keys.findIndex(key => this.playlist[key] == this.currentTrack)

        if (index != -1) this.playingIndex = index
    }

    setPlaylist(playlist) {
        this.playlist = playlist
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

    prevTrack() {
        if (this.playingIndex > 0) {
            this.playingIndex--
            this.setTrack(this.playlist[this.playingIndex])
            this.play()
        }
    }

    nextTrack() {
        const keys = Object.keys(this.playlist)
        if (this.playingIndex + 1 < keys.length) {
            this.playingIndex++
            this.setTrack(this.playlist[this.playingIndex])
            this.play()
        } else {
            this.emit('playlist_end')
        }
    }

    updateNavButtons() {
        const show = Object.keys(this.playlist).length > 1
        if (this.prevButton) this.prevButton.hidden = !show
        if (this.nextButton) this.nextButton.hidden = !show
    }

    playFirst() {
        if (Object.keys(this.playlist).length > 0) {
            this.playingIndex = 0
            this.setTrack(this.playlist[0])
            this.play()
        }
    }

    getPlayingIndex() { return this.playingIndex }
    setPlayingIndex(index) { this.playingIndex = index }

    togglePlay() {
        if (!this.audio) return
        this.isPaused() ? this.play() : this.pause()
        return !this.isPaused()
    }

    isPaused() {
        return !this.audio || this.audio.paused
    }

    play() {
        if (!this.audio) return
        this.audio.play()
        this.playButton.innerHTML = '<span class="material-symbols-rounded">pause</span>'
        this.emit('play')
    }

    pause() {
        if (!this.audio) return
        this.audio.pause()
        this.playButton.innerHTML = '<span class="material-symbols-rounded">play_arrow</span>'
        this.emit('pause')
    }

    onTimeUpdate() {
        if (this.timeSlider) { this.timeSlider.value = this.audio.currentTime; this.updateSlider(this.timeSlider) }
        if (this.currentTimeElement) this.currentTimeElement.textContent = this.formatTime(this.audio.currentTime)
        this.emit('progress')
    }

    onProgress() {
        if (this.audio.buffered.length > 0 && this.bufferedElement && this.audio.duration) {
            this.bufferedElement.style.width = (this.audio.buffered.end(0) / this.audio.duration * 100) + '%'
        }
    }

    onEnded() {
        this.emit('ended')
        const keys = Object.keys(this.playlist)
        if (keys.length > 0 && this.playingIndex + 1 < keys.length) {
            this.playingIndex++
            this.setTrack(this.playlist[this.playingIndex])
            this.play()
        } else {
            this.emit('playlist_end')
        }
    }

    onVolumeInput() {
        if (this.audio) this.audio.volume = this.volumeSlider.value
        if (this.persist) localStorage.yap_volume = this.volumeSlider.value
        this.updateSlider(this.volumeSlider)
        this.emit('volume')
    }

    currentSpeed() {
        if (this.speedLabel) return parseFloat(this.speedLabel.textContent) || 1
        return this.persist && localStorage.yap_speed != null ? Number(localStorage.yap_speed) : 1
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
        if (this.persist) localStorage.yap_speed = speed
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
        if (!time || isNaN(time)) return '00:00'
        const minutes = Math.floor(time / 60)
        const seconds = Math.floor(time % 60)
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
}

customElements.define('yurba-ap', YurbaAP)
