hljs.highlightAll()

const playerSlot = document.getElementById('demo-player-slot')
const eventsEl = document.getElementById('demo-events')
const playlistEl = document.getElementById('demo-playlist')
const loadButton = document.getElementById('demo-load')
const titleInput = document.getElementById('demo-title')
const authorInput = document.getElementById('demo-author')
const coverInput = document.getElementById('demo-cover')
const urlInput = document.getElementById('demo-url')

const player = document.createElement('yurba-ap')
player.config = { persist: false }
playerSlot.appendChild(player)

let demoPlaylist = []
let activeTrack = null

function showEvent(name, track) {
    const strong = document.createElement('strong')
    strong.textContent = name
    eventsEl.replaceChildren(strong, track ? ` - ${track.title}` : '')
}

function rebuildPlayerPlaylist() {
    const pl = {}
    demoPlaylist.forEach((t, i) => { pl[i] = t })
    player.setPlaylist(pl)
}

function removeTrack(i) {
    const wasActive = demoPlaylist[i] == activeTrack
    demoPlaylist.splice(i, 1)
    rebuildPlayerPlaylist()

    if (wasActive) {
        if (demoPlaylist.length > 0) {
            const next = demoPlaylist[Math.min(i, demoPlaylist.length - 1)]
            player.setTrack(next)
            player.play()
        } else {
            player.pause()
            player.infoElement.hidden = true
            activeTrack = null
            renderPlaylist()
        }
    } else {
        renderPlaylist()
    }
}

function renderPlaylist() {
    playlistEl.innerHTML = ''
    demoPlaylist.forEach((track, i) => {
        const item = document.createElement('div')
        item.className = 'demo-track-item' + (track == activeTrack ? ' is-active' : '')

        item.innerHTML = `
            <span class="demo-track-num">${i + 1}</span>
            <div class="demo-track-info">
                <div class="demo-track-name"></div>
                <div class="demo-track-author"></div>
            </div>
            <button class="demo-track-remove" title="Remove">×</button>`

        const info = item.querySelector('.demo-track-info')
        const name = item.querySelector('.demo-track-name')
        const author = item.querySelector('.demo-track-author')
        const remove = item.querySelector('.demo-track-remove')
        name.textContent = track.title || 'Unknown'
        if (track.author) author.textContent = track.author
        else author.remove()

        info.addEventListener('click', () => {
            player.setTrack(track)
            player.play()
        })

        remove.addEventListener('click', e => {
            e.stopPropagation()
            removeTrack(i)
        })

        playlistEl.appendChild(item)
    })
}

player.addEventListener('yurba-ap.set_track', e => {
    activeTrack = e.track
    renderPlaylist()
    showEvent('yurba-ap.set_track', e.track)
})

;['yurba-ap.play', 'yurba-ap.pause', 'yurba-ap.ended', 'yurba-ap.playlist_end'].forEach(name => {
    player.addEventListener(name, e => showEvent(name, e.track))
})

loadButton.addEventListener('click', () => {
    const title = titleInput.value.trim()
    const author = authorInput.value.trim()
    const cover = coverInput.value.trim()
    const url = urlInput.value.trim()

    if (!url) {
        eventsEl.innerHTML = '<strong style="color:#cc3300">Audio URL is required</strong>'
        return
    }

    const track = { title, author, cover: cover || null, url }
    demoPlaylist.push(track)
    player.pushPlaylist([track])

    if (demoPlaylist.length == 1) {
        player.setTrack(track)
        player.play()
    } else {
        renderPlaylist()
    }
})

const sections = document.querySelectorAll('.doc-section[id]')
const links = document.querySelectorAll('.sidebar a')

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return
        links.forEach(link => link.classList.toggle('is-active', link.getAttribute('href') == `#${entry.target.id}`))
    })
}, { rootMargin: '-20% 0px -70% 0px' })

sections.forEach(s => observer.observe(s))
