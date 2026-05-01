// --- API ENDPOINT ---
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxsP8GJXrywhLSnteZsPYsNB-hulRLku4xPCPkQe5TzGfFPrFZhV-dzOCfQpQRPR6ni/exec';

// State Variables
let sunTimes = { sunrise: '--:--', sunset: '--:--' };
let isNight = false;

// Initialize Lucide Icons
lucide.createIcons();

// --- HELPER FUNCTIONS ---
const calculateAQI = (pm25, pm10) => {
    const pm25Breakpoints = [0, 30, 60, 90, 120, 250, 500];
    const pm25AQI =        [0, 50, 100, 200, 300, 400, 500];
    const pm10Breakpoints = [0, 50, 100, 250, 350, 430, 500];
    const pm10AQI =         [0, 50, 100, 200, 300, 400, 500];

    const calculateSubIndex = (value, breakpoints, aqiValues) => {
        if (value <= breakpoints[0]) return 0;
        for (let i = 1; i < breakpoints.length; i++) {
            if (value <= breakpoints[i]) {
                return Math.round(((aqiValues[i] - aqiValues[i - 1]) / (breakpoints[i] - breakpoints[i - 1])) * (value - breakpoints[i - 1]) + aqiValues[i - 1]);
            }
        }
        return aqiValues[aqiValues.length - 1];
    };

    return Math.max(calculateSubIndex(pm25, pm25Breakpoints, pm25AQI), calculateSubIndex(pm10, pm10Breakpoints, pm10AQI));
};

const calculateMoonPhase = (date) => {
    const referenceDate = new Date('2000-01-06T18:14:00Z');
    const lunarCycle = 29.53058867 * 24 * 60 * 60 * 1000;
    const diff = date - referenceDate;
    const phase = (diff % lunarCycle) / lunarCycle;
    const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
    return (illumination * 100).toFixed(1);
};

const updateAQIUI = (aqi) => {
    const statusEl = document.getElementById('aqi-status');
    const valueEl = document.getElementById('aqi-value');
    valueEl.textContent = isNaN(aqi) ? '--' : aqi;
    
    statusEl.className = 'text-sm font-bold uppercase tracking-wider'; // reset classes
    
    if (isNaN(aqi)) {
        statusEl.textContent = '--';
        return;
    }
    
    if (aqi <= 50) { statusEl.textContent = 'Good'; statusEl.classList.add('text-green-400'); }
    else if (aqi <= 100) { statusEl.textContent = 'Satisfactory'; statusEl.classList.add('text-yellow-400'); }
    else if (aqi <= 200) { statusEl.textContent = 'Moderate'; statusEl.classList.add('text-orange-400'); }
    else if (aqi <= 300) { statusEl.textContent = 'Poor'; statusEl.classList.add('text-red-400'); }
    else if (aqi <= 400) { statusEl.textContent = 'Very Poor'; statusEl.classList.add('text-purple-400'); }
    else { statusEl.textContent = 'Severe'; statusEl.classList.add('text-stone-400'); }
};

const checkIsNightTime = () => {
    if (sunTimes.sunrise === '--:--' || sunTimes.sunset === '--:--') return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [riseH, riseM] = sunTimes.sunrise.split(':').map(Number);
    const [setH, setM] = sunTimes.sunset.split(':').map(Number);
    
    const riseMinutes = riseH * 60 + riseM;
    const setMinutes = setH * 60 + setM;
    
    return currentMinutes < riseMinutes || currentMinutes >= setMinutes;
};

// --- BACKGROUND GENERATORS ---
const generateStars = () => {
    const container = document.getElementById('stars-layer');
    container.innerHTML = '';
    for(let i=0; i<100; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        const size = Math.random() * 2 + 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.opacity = Math.random() * 0.5 + 0.3;
        container.appendChild(star);
    }
};

const generateClouds = () => {
    const container = document.getElementById('clouds-layer');
    container.innerHTML = '';
    const configs = [
        { top: '5%', size: '120px', duration: '45s', delay: '0s', opacity: 0.3 },
        { top: '25%', size: '80px', duration: '60s', delay: '-15s', opacity: 0.2 },
        { top: '15%', size: '160px', duration: '80s', delay: '-40s', opacity: 0.15 },
        { top: '40%', size: '90px', duration: '55s', delay: '-25s', opacity: 0.25 },
        { top: '10%', size: '100px', duration: '70s', delay: '-10s', opacity: 0.2 }
    ];
    
    configs.forEach(conf => {
        const div = document.createElement('div');
        div.className = 'animate-cloud';
        div.style.top = conf.top;
        div.style.opacity = conf.opacity;
        div.style.animationDuration = conf.duration;
        div.style.animationDelay = conf.delay;
        div.style.left = '-200px';
        div.innerHTML = `<i data-lucide="cloud" style="width: ${conf.size}; height: ${conf.size};"></i>`;
        container.appendChild(div);
    });
    lucide.createIcons({ root: container }); // Re-init icons for injected clouds
};

// --- SVG ARC GENERATOR ---
const renderArc = () => {
    const container = document.getElementById('arc-container');
    if (sunTimes.sunrise === '--:--' || sunTimes.sunset === '--:--') {
        container.innerHTML = '';
        return;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [riseH, riseM] = sunTimes.sunrise.split(':').map(Number);
    const [setH, setM] = sunTimes.sunset.split(':').map(Number);
    const riseMins = riseH * 60 + riseM;
    const setMins = setH * 60 + setM;

    let progress = 0;
    if (isNight) {
        const nightDuration = (24 * 60 - setMins) + riseMins;
        progress = currentMinutes >= setMins 
            ? (currentMinutes - setMins) / nightDuration 
            : ((24 * 60 - setMins) + currentMinutes) / nightDuration;
    } else {
        const dayDuration = setMins - riseMins;
        progress = (currentMinutes - riseMins) / dayDuration;
    }
    progress = Math.max(0, Math.min(1, progress));

    const arcRadius = 70;
    const centerX = 140;
    const centerY = 90;
    const startAngle = Math.PI;
    const endAngle = 0;
    const currentAngle = startAngle - (startAngle - endAngle) * progress;

    const iconX = centerX + arcRadius * Math.cos(currentAngle);
    const iconY = centerY - arcRadius * Math.sin(currentAngle);
    
    const arcPath = `M ${centerX - arcRadius} ${centerY} A ${arcRadius} ${arcRadius} 0 0 1 ${centerX + arcRadius} ${centerY}`;
    const progressArcPath = `M ${centerX - arcRadius} ${centerY} A ${arcRadius} ${arcRadius} 0 0 1 ${iconX} ${iconY}`;
    
    const strokeColor = isNight ? "#818CF8" : "#FDE047";
    const bgBody = isNight ? `<circle cx="0" cy="0" r="8" fill="#F8FAFC" /><path d="M 2 -6 A 8 8 0 0 1 2 6 A 6 6 0 0 0 2 -6 Z" fill="#94A3B8" />` 
                           : `<circle cx="0" cy="0" r="7" fill="#FDE047" /><line x1="0" y1="-11" x2="0" y2="-14" stroke="#FDE047" stroke-width="2" stroke-linecap="round"/><line x1="0" y1="11" x2="0" y2="14" stroke="#FDE047" stroke-width="2" stroke-linecap="round"/><line x1="-11" y1="0" x2="-14" y2="0" stroke="#FDE047" stroke-width="2" stroke-linecap="round"/><line x1="11" y1="0" x2="14" y2="0" stroke="#FDE047" stroke-width="2" stroke-linecap="round"/><line x1="-8" y1="-8" x2="-10" y2="-10" stroke="#FDE047" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="8" x2="10" y2="10" stroke="#FDE047" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="-8" x2="10" y2="-10" stroke="#FDE047" stroke-width="2" stroke-linecap="round"/><line x1="-8" y1="8" x2="-10" y2="10" stroke="#FDE047" stroke-width="2" stroke-linecap="round"/>`;

    container.innerHTML = `
        <svg width="280" height="120" viewBox="0 0 280 120" class="w-full max-w-[280px] overflow-visible">
            <line x1="${centerX - arcRadius - 30}" y1="${centerY}" x2="${centerX + arcRadius + 30}" y2="${centerY}" stroke="rgba(255, 255, 255, 0.4)" stroke-width="2" stroke-dasharray="4 4" />
            <path d="${arcPath}" fill="none" stroke="rgba(255, 255, 255, 0.15)" stroke-width="4" stroke-linecap="round" />
            ${progress > 0 ? `<path d="${progressArcPath}" fill="none" stroke="${strokeColor}" stroke-width="4" stroke-linecap="round" style="filter: drop-shadow(0 4px 3px rgb(0 0 0 / 0.07));" />` : ''}
            <g transform="translate(${iconX}, ${iconY})" style="filter: drop-shadow(0 10px 8px rgb(0 0 0 / 0.04));">
                ${bgBody}
            </g>
            <g transform="translate(${centerX - arcRadius}, ${centerY + 22})">
                <text x="0" y="0" text-anchor="middle" fill="white" font-size="13" font-weight="600" style="filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.1));">${isNight ? sunTimes.sunset : sunTimes.sunrise}</text>
            </g>
            <g transform="translate(${centerX + arcRadius}, ${centerY + 22})">
                <text x="0" y="0" text-anchor="middle" fill="white" font-size="13" font-weight="600" style="filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.1));">${isNight ? sunTimes.sunrise : sunTimes.sunset}</text>
            </g>
        </svg>
    `;
};

// --- UPDATE UI LOGIC ---
const updateTheme = () => {
    isNight = checkIsNightTime();
    document.body.className = `min-h-screen p-4 md:p-8 text-white relative ${isNight ? 'theme-night' : 'theme-day'}`;
    
    if (isNight) {
        document.getElementById('stars-layer').classList.remove('hidden');
        document.getElementById('clouds-layer').classList.add('hidden');
        
        document.getElementById('arc-title-text').textContent = 'Lunar Trajectory';
        document.getElementById('arc-title-icon').setAttribute('data-lucide', 'moon');
        document.getElementById('rise-label').textContent = 'Moonrise';
        document.getElementById('set-label').textContent = 'Moonset';
        document.getElementById('rise-icon').setAttribute('data-lucide', 'sunrise');
        document.getElementById('rise-icon').className = 'w-4 h-4 text-indigo-300';
        document.getElementById('set-icon').setAttribute('data-lucide', 'sunset');
        document.getElementById('set-icon').className = 'w-4 h-4 text-indigo-400';
        document.getElementById('illum-icon').setAttribute('data-lucide', 'moon');
        
    } else {
        document.getElementById('stars-layer').classList.add('hidden');
        document.getElementById('clouds-layer').classList.remove('hidden');
        
        document.getElementById('arc-title-text').textContent = 'Solar Arc';
        document.getElementById('arc-title-icon').setAttribute('data-lucide', 'sun');
        document.getElementById('rise-label').textContent = 'Sunrise';
        document.getElementById('set-label').textContent = 'Sunset';
        document.getElementById('rise-icon').setAttribute('data-lucide', 'sunrise');
        document.getElementById('rise-icon').className = 'w-4 h-4 text-yellow-300';
        document.getElementById('set-icon').setAttribute('data-lucide', 'sunset');
        document.getElementById('set-icon').className = 'w-4 h-4 text-orange-300';
        document.getElementById('illum-icon').setAttribute('data-lucide', 'sun');
    }
    lucide.createIcons();
    renderArc();
};

const updateClock = () => {
    const now = new Date();
    document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('current-time').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    updateTheme(); // Recalculate arc position and theme based on new time
};

// --- DATA FETCHING ---
const fetchSunData = async () => {
    try {
        const response = await fetch('https://api.sunrise-sunset.org/json?lat=23.6889&lng=86.9661&formatted=0');
        const data = await response.json();
        if (data.status === "OK") {
            const sRise = new Date(data.results.sunrise);
            const sSet = new Date(data.results.sunset);
            sunTimes = {
                sunrise: sRise.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).slice(0, 5),
                sunset: sSet.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).slice(0, 5)
            };
            
            document.getElementById('rise-time').textContent = isNight ? sunTimes.sunset : sunTimes.sunrise;
            document.getElementById('set-time').textContent = isNight ? sunTimes.sunrise : sunTimes.sunset;
            updateTheme();
        }
    } catch (e) { console.error("Sun API Failed"); }
};

const updateWeatherUI = (data, isLive) => {
    document.getElementById('main-temp').textContent = data.temp;
    document.getElementById('main-condition').textContent = data.condition;
    document.getElementById('high-temp').textContent = data.high;
    document.getElementById('low-temp').textContent = data.low;
    document.getElementById('humidity').textContent = data.humidity;
    document.getElementById('wind-speed').textContent = data.windSpeed;
    document.getElementById('wind-dir').textContent = data.windDirection;
    document.getElementById('wind-icon').style.transform = `rotate(${data.windDegree}deg)`;
    document.getElementById('pressure').textContent = data.pressure;
    document.getElementById('rainfall').textContent = data.rainfall;
    document.getElementById('co-level').textContent = data.co;
    document.getElementById('no2-level').textContent = data.no2;
    document.getElementById('feels-like').textContent = data.feelsLike;
    document.getElementById('uv-index').textContent = data.uvIndex;
    document.getElementById('pm25').textContent = data.pm25;
    document.getElementById('pm10').textContent = data.pm10;
    document.getElementById('illumination').textContent = calculateMoonPhase(new Date());
    
    updateAQIUI(data.aqi);

    // Dynamic Main Icon
    let iconName = 'sun';
    let iconColor = 'text-yellow-300';
    if (data.condition.includes('Rain')) { iconName = 'cloud-rain'; iconColor = 'text-blue-200'; }
    else if (data.condition.includes('Cloud')) { iconName = 'cloud'; iconColor = 'text-white/90'; }
    else if (data.condition.includes('Clear') || isNight) { iconName = 'moon'; iconColor = 'text-indigo-200'; }
    
    document.getElementById('main-icon-container').innerHTML = `<i data-lucide="${iconName}" class="w-24 h-24 ${iconColor}"></i>`;
    lucide.createIcons();

    // Status Pill
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    if (isLive) {
        dot.className = 'w-4 h-4 rounded-full bg-green-400 shadow-[0_0_15px_#4ade80]';
        text.textContent = 'Live API';
    } else {
        dot.className = 'w-4 h-4 rounded-full bg-yellow-400 shadow-[0_0_15px_#facc15] animate-pulse';
        text.textContent = 'Mocking Data';
    }
};

const fetchWeatherData = async () => {
    try {
        const response = await fetch(APP_SCRIPT_URL);
        const result = await response.json();
        
        if (result.status === 'success' && result.data.length > 0) {
            const currentData = result.data[0];
            
            // Wind Logic
            const windStr = currentData[11] || 'N';
            const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
            let windDegrees = 0;
            if (isNaN(windStr)) {
                const idx = directions.indexOf(String(windStr).toUpperCase());
                windDegrees = idx >= 0 ? idx * 22.5 : 0;
            } else {
                windDegrees = parseFloat(windStr);
            }
            const compassDir = directions[Math.round(windDegrees / 22.5) % 16];
            
            const pm25Val = parseFloat(currentData[6]) || 0;
            const pm10Val = parseFloat(currentData[7]) || 0;
            const rainfallVal = parseFloat(currentData[12]) || 0;
            const humidityVal = parseFloat(currentData[1]) || 0;

            let conditionStr = "Sunny";
            if (rainfallVal > 0) conditionStr = "Raining";
            else if (humidityVal > 80) conditionStr = "Cloudy";
            else if (humidityVal > 60) conditionStr = "Partly Cloudy";
            else if (isNight) conditionStr = "Clear Night";

            updateWeatherUI({
                temp: parseFloat(currentData[0]).toFixed(1) || 0,
                humidity: humidityVal.toFixed(0),
                high: parseFloat(currentData[2]).toFixed(1) || 0,
                low: parseFloat(currentData[3]).toFixed(1) || 0,
                pressure: parseFloat(currentData[4]).toFixed(0) || 0,
                uvIndex: parseFloat(currentData[5]).toFixed(0) || 0,
                pm25: pm25Val.toFixed(1),
                pm10: pm10Val.toFixed(1),
                co: parseFloat(currentData[8]).toFixed(1) || 0,
                no2: parseFloat(currentData[9]).toFixed(1) || 0,
                windSpeed: parseFloat(currentData[10]).toFixed(1) || 0,
                windDirection: compassDir,
                windDegree: Math.round(windDegrees),
                rainfall: rainfallVal.toFixed(1),
                aqi: calculateAQI(pm25Val, pm10Val),
                feelsLike: parseFloat(currentData[0]).toFixed(1),
                condition: conditionStr
            }, true);
        } else {
            throw new Error("Invalid API Data");
        }
    } catch (e) {
        console.warn("API fetch failed, using fallback mock data.");
        // Mock data logic (from React version)
        const hour = new Date().getHours();
        updateWeatherUI({
            temp: (25 + 10 * Math.sin(hour * Math.PI / 12)).toFixed(1),
            humidity: (50 + 30 * Math.sin(hour * Math.PI / 12)).toFixed(0),
            high: (32.0).toFixed(1),
            low: (18.0).toFixed(1),
            pressure: (1012 + (Math.random() * 4 - 2)).toFixed(0),
            uvIndex: Math.min(10, Math.max(1, Math.round(3 + 5 * Math.sin(hour * Math.PI / 12)))),
            aqi: Math.min(300, Math.max(20, Math.round(50 + 100 * Math.sin(hour * Math.PI / 12)))),
            co: (0.5 + (Math.random() * 2)).toFixed(1),
            no2: (15 + Math.random() * 5).toFixed(1),
            pm25: (15 + Math.random() * 20).toFixed(1),
            pm10: (30 + Math.random() * 30).toFixed(1),
            windSpeed: (2 + (Math.random() * 5)).toFixed(1),
            windDirection: 'NW',
            windDegree: 315,
            rainfall: hour > 6 && hour < 18 ? (Math.random() * 5).toFixed(1) : "0.0",
            feelsLike: (24 + 10 * Math.sin(hour * Math.PI / 12)).toFixed(1),
            condition: isNight ? 'Clear Night' : 'Partly Cloudy'
        }, false);
    }
};

// --- INITIALIZATION ---
generateStars();
generateClouds();
updateClock();
setInterval(updateClock, 1000);

fetchSunData().then(fetchWeatherData);
setInterval(fetchWeatherData, 300000); // 5 mins
