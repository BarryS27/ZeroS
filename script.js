const $ = (id) => document.getElementById(id);

const config = {
    name: "Barry",
    notesKey: "zeros_sync_notes",
    bgKey: "zeros_local_bg",
    weatherKey: "zeros_local_weather",
    weatherMap: {
        0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
        45: '🌫️', 48: '🌫️',
        51: '🌦️', 53: '🌦️', 55: '🌦️',
        61: '🌧️', 63: '🌧️', 65: '🌧️',
        71: '❄️', 73: '❄️', 75: '❄️',
        80: '🌦️', 81: '🌧️', 82: '🌧️',
        95: '⛈️', 96: '⛈️', 99: '⛈️'
    }
};

function setGreeting() {
    const hour = new Date().getHours();
    const msg = (hour < 5 || hour >= 18) ? "Welcome back" : "Hello";
    $('greeting').textContent = `${msg}, ${config.name}`;
}

async function initNotes() {
    const el = $('notes');
    
    const result = await chrome.storage.sync.get([config.notesKey]);
    if (result[config.notesKey]) {
        el.value = result[config.notesKey];
    }

    let timer;
    el.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            chrome.storage.sync.set({ [config.notesKey]: el.value });
        }, 800);
    });

    el.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.substring(0, start) + "    " + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 4;
            chrome.storage.sync.set({ [config.notesKey]: this.value });
        }
    });
}

async function initWallpaper() {
    const result = await chrome.storage.local.get([config.bgKey]);
    if (result[config.bgKey]) {
        setBgImage(result[config.bgKey]);
    }

    const bingUrl = `https://bing.biturl.top/?resolution=1920&format=image&index=0`;
    const img = new Image();
    img.src = bingUrl;
    img.onload = () => {
        setBgImage(bingUrl);
        chrome.storage.local.set({ [config.bgKey]: bingUrl });
    };
}

function setBgImage(url) {
    const gradient = "linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3))";
    document.body.style.backgroundImage = `${gradient}, url(${url})`;
}

async function updateWeather() {
    const now = Date.now();
    const result = await chrome.storage.local.get([config.weatherKey]);
    
    if (result[config.weatherKey]) {
        const { data, timestamp } = result[config.weatherKey];
        if (now - timestamp < 30 * 60 * 1000) {
            renderWeather(data);
            return;
        }
    }

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            const { latitude: lat, longitude: lon } = pos.coords;
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const weatherData = await res.json();
            
            const info = {
                temp: Math.round(weatherData.current_weather.temperature),
                code: weatherData.current_weather.weathercode
            };
            
            renderWeather(info);
            chrome.storage.local.set({ 
                [config.weatherKey]: { data: info, timestamp: now } 
            });
        } catch (err) {
            console.log("Weather API failed");
        }
    }, () => {
        console.log("Location denied");
    }, { timeout: 8000 });
}

function renderWeather(data) {
    $('temp').textContent = `${data.temp}°`;
    $('weather-emoji').textContent = config.weatherMap[data.code] || '🌈';
}

document.addEventListener('DOMContentLoaded', () => {
    setGreeting();
    initNotes();
    initWallpaper();
    updateWeather();
});
