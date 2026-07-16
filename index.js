// ---- Conversion factors ----
const METERS_PER_FOOT = 0.3048
const LITERS_PER_GALLON = 3.78541
const POUNDS_PER_KILO = 2.20462

const input = document.getElementById("unit-input")
const convertBtn = document.getElementById("convert-btn")
const themeToggle = document.getElementById("theme-toggle")
const app = document.querySelector(".app")

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

const cards = [
    {
        el: document.getElementById("length-result"),
        render: (n, p) => `${n} meters = <strong>${floor3((n / METERS_PER_FOOT) * p)}</strong> feet | ` +
                          `${n} feet = <strong>${floor3(n * METERS_PER_FOOT * p)}</strong> meters`
    },
    {
        el: document.getElementById("volume-result"),
        render: (n, p) => `${n} liters = <strong>${floor3((n / LITERS_PER_GALLON) * p)}</strong> gallons | ` +
                          `${n} gallons = <strong>${floor3(n * LITERS_PER_GALLON * p)}</strong> liters`
    },
    {
        el: document.getElementById("mass-result"),
        render: (n, p) => `${n} kilos = <strong>${floor3(n * POUNDS_PER_KILO * p)}</strong> pounds | ` +
                          `${n} pounds = <strong>${floor3((n / POUNDS_PER_KILO) * p)}</strong> kilos`
    }
]

// Round down to three decimal places, per the spec
function floor3(num) {
    return (Math.floor(num * 1000) / 1000).toFixed(3)
}

// ---- Convert + count-up animation ----
function convert() {
    const n = parseFloat(input.value)

    if (isNaN(n)) {
        input.classList.remove("shake")
        void input.offsetWidth // restart the animation
        input.classList.add("shake")
        return
    }

    // Always render the final values first, so results show even when
    // animation frames are unavailable (hidden tab, reduced motion)
    cards.forEach(card => {
        card.el.innerHTML = card.render(n, 1)
        const cardEl = card.el.parentElement
        cardEl.classList.remove("flash", "done")
        void cardEl.offsetWidth
        cardEl.classList.add("flash")
    })

    if (reduceMotion || document.hidden) {
        return
    }

    const duration = 750
    const start = performance.now()

    function frame(now) {
        const t = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
        cards.forEach(card => card.el.innerHTML = card.render(n, eased))
        if (t < 1) {
            requestAnimationFrame(frame)
        } else {
            cards.forEach(card => card.el.parentElement.classList.add("done"))
        }
    }
    requestAnimationFrame(frame)
}

convertBtn.addEventListener("click", function(e) {
    spawnRipple(e)
    burstConfetti()
    convert()
})

input.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
        burstConfetti()
        convert()
    }
})

// ---- Button ripple ----
function spawnRipple(e) {
    const rect = convertBtn.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const ripple = document.createElement("span")
    ripple.className = "ripple"
    ripple.style.width = ripple.style.height = `${size}px`
    ripple.style.left = `${(e.clientX || rect.left + rect.width / 2) - rect.left - size / 2}px`
    ripple.style.top = `${(e.clientY || rect.top + rect.height / 2) - rect.top - size / 2}px`
    convertBtn.appendChild(ripple)
    ripple.addEventListener("animationend", () => ripple.remove())
}

// ---- Theme toggle with radial wipe (persisted in localStorage) ----
const savedTheme = localStorage.getItem("theme")
if (savedTheme) {
    document.documentElement.dataset.theme = savedTheme
}

themeToggle.addEventListener("click", function() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark"

    if (reduceMotion) {
        applyTheme(next)
        return
    }

    const rect = themeToggle.getBoundingClientRect()
    const wipe = document.createElement("div")
    wipe.className = "theme-wipe"
    wipe.style.setProperty("--cx", `${rect.left + rect.width / 2}px`)
    wipe.style.setProperty("--cy", `${rect.top + rect.height / 2}px`)
    wipe.style.background = next === "dark" ? "#0b0a14" : "#f2f0fb"
    document.body.appendChild(wipe)

    requestAnimationFrame(() => requestAnimationFrame(() => wipe.classList.add("grow")))
    setTimeout(() => applyTheme(next), 380)
    setTimeout(() => wipe.remove(), 1100)
})

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme
    localStorage.setItem("theme", theme)
}

// ---- 3D tilt following the mouse ----
document.addEventListener("mousemove", function(e) {
    if (reduceMotion) return
    const rect = app.getBoundingClientRect()
    const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
    const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)
    const clamp = v => Math.max(-1.4, Math.min(1.4, v))
    app.style.setProperty("--tilt-y", `${clamp(dx) * 5}deg`)
    app.style.setProperty("--tilt-x", `${clamp(dy) * -5}deg`)
})

// ---- Glare position on cards ----
document.querySelectorAll(".card").forEach(cardEl => {
    cardEl.addEventListener("mousemove", function(e) {
        const rect = cardEl.getBoundingClientRect()
        cardEl.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`)
        cardEl.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`)
    })
})

// ---- Constellation particle field ----
const particleCanvas = document.getElementById("particles")
const pCtx = particleCanvas.getContext("2d")
let particles = []

function sizeCanvas(canvas) {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
}

function initParticles() {
    sizeCanvas(particleCanvas)
    const count = Math.min(70, Math.floor(window.innerWidth / 22))
    particles = Array.from({ length: count }, () => ({
        x: Math.random() * particleCanvas.width,
        y: Math.random() * particleCanvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 0.6,
        tw: Math.random() * Math.PI * 2 // twinkle phase
    }))
}

function particleColor() {
    return getComputedStyle(document.documentElement).getPropertyValue("--particle").trim()
}

function drawParticles(now) {
    const w = particleCanvas.width
    const h = particleCanvas.height
    const rgb = particleColor()
    pCtx.clearRect(0, 0, w, h)

    for (const p of particles) {
        p.x = (p.x + p.vx + w) % w
        p.y = (p.y + p.vy + h) % h
        const alpha = 0.35 + 0.3 * Math.sin(now / 900 + p.tw)
        pCtx.beginPath()
        pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        pCtx.fillStyle = `rgba(${rgb}, ${alpha})`
        pCtx.fill()
    }

    // connect close particles into constellations
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x
            const dy = particles[i].y - particles[j].y
            const dist = Math.hypot(dx, dy)
            if (dist < 120) {
                pCtx.beginPath()
                pCtx.moveTo(particles[i].x, particles[i].y)
                pCtx.lineTo(particles[j].x, particles[j].y)
                pCtx.strokeStyle = `rgba(${rgb}, ${0.14 * (1 - dist / 120)})`
                pCtx.lineWidth = 1
                pCtx.stroke()
            }
        }
    }
}

// ---- Confetti ----
const confettiCanvas = document.getElementById("confetti")
const cCtx = confettiCanvas.getContext("2d")
let confetti = []
const CONFETTI_COLORS = ["#6943ff", "#a855f7", "#22d3ee", "#f472b6", "#facc15", "#4ade80"]

function burstConfetti() {
    if (reduceMotion) return
    sizeCanvas(confettiCanvas)
    const rect = convertBtn.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    for (let i = 0; i < 90; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 8 + 3
        confetti.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 4,
            w: Math.random() * 8 + 4,
            h: Math.random() * 5 + 3,
            rot: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 0.35,
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            life: 1,
            circle: Math.random() < 0.3
        })
    }
}

function drawConfetti() {
    if (confetti.length === 0) return
    cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height)
    confetti = confetti.filter(c => c.life > 0 && c.y < confettiCanvas.height + 20)
    for (const c of confetti) {
        c.x += c.vx
        c.y += c.vy
        c.vy += 0.22      // gravity
        c.vx *= 0.99      // air drag
        c.rot += c.vr
        c.life -= 0.008
        cCtx.save()
        cCtx.translate(c.x, c.y)
        cCtx.rotate(c.rot)
        cCtx.globalAlpha = Math.max(c.life, 0)
        cCtx.fillStyle = c.color
        if (c.circle) {
            cCtx.beginPath()
            cCtx.arc(0, 0, c.w / 2, 0, Math.PI * 2)
            cCtx.fill()
        } else {
            cCtx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h)
        }
        cCtx.restore()
    }
    if (confetti.length === 0) {
        cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height)
    }
}

// ---- Master animation loop ----
function loop(now) {
    drawParticles(now)
    drawConfetti()
    requestAnimationFrame(loop)
}

window.addEventListener("resize", () => {
    initParticles()
    sizeCanvas(confettiCanvas)
})

if (!reduceMotion) {
    initParticles()
    sizeCanvas(confettiCanvas)
    requestAnimationFrame(loop)
}

// Render the default value (20) on load
convert()
