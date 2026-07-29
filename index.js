hljs.highlightAll()

const playerEl = document.createElement('yurba-ap')
playerEl.config = { persist: false }
document.getElementById('demo-player-slot').appendChild(playerEl)
const player = playerEl

const eventsEl    = document.getElementById('demo-events')
const playlistEl  = document.getElementById('demo-playlist')

let demoPlaylist = []
let activeTrack  = null

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
            player._infoEl.hidden = true
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
                <div class="demo-track-name">${track.title || 'Unknown'}</div>
                ${track.author ? `<div class="demo-track-author">${track.author}</div>` : ''}
            </div>
            <button class="demo-track-remove" title="Remove">×</button>`

        item.querySelector('.demo-track-info').addEventListener('click', () => {
            player.setTrack(track)
            player.play()
        })

        item.querySelector('.demo-track-remove').addEventListener('click', e => {
            e.stopPropagation()
            removeTrack(i)
        })

        playlistEl.appendChild(item)
    })
}

player.addEventListener('yurba-ap.set_track', e => {
    activeTrack = e.track
    renderPlaylist()
    eventsEl.innerHTML = `<strong>yurba-ap.set_track</strong>${e.track ? ' — ' + e.track.title : ''}`
})

;['yurba-ap.play', 'yurba-ap.pause', 'yurba-ap.ended', 'yurba-ap.playlist_end'].forEach(name => {
    player.addEventListener(name, e => {
        eventsEl.innerHTML = `<strong>${name}</strong>${e.track ? ' — ' + e.track.title : ''}`
    })
})

document.getElementById('demo-load').addEventListener('click', () => {
    const title  = document.getElementById('demo-title').value.trim()
    const author = document.getElementById('demo-author').value.trim()
    const cover  = document.getElementById('demo-cover').value.trim()
    const url    = document.getElementById('demo-url').value.trim()

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

// sidebar active link tracking
const sections = document.querySelectorAll('.doc-section[id]')
const links    = document.querySelectorAll('.sidebar a')

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            links.forEach(l => l.classList.remove('is-active'))
            const active = document.querySelector(`.sidebar a[href="#${entry.target.id}"]`)
            if (active) active.classList.add('is-active')
        }
    })
}, { rootMargin: '-20% 0px -70% 0px' })

sections.forEach(s => observer.observe(s))
