const API_KEY = 'API_for_Weather_App'; // replace with your OpenWeatherMap API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');    
const locationBtn = document.getElementById('location-btn');
const celsiusBtn = document.getElementById('celsius-btn');
const fahrenheitBtn = document.getElementById('fahrenheit-btn');

const errorMessage = document.getElementById('error-message');
const loading = document.getElementById('loading');
const currentWeather = document.getElementById('current-weather');

const cityName = document.getElementById('city-name');
const dateTime = document.getElementById('date-time');
const temperature = document.getElementById('temperature');
const weatherIcon = document.getElementById('weather-icon');
const weatherDescription = document.getElementById('weather-description');
const feelsLike = document.getElementById('feels-like');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('wind-speed');
const pressure = document.getElementById('pressure');
const forecastContainer = document.getElementById('forecast-container');

let currentUnit = 'celsius';
let currentData = null;

function init() {
  const savedUnit = localStorage.getItem('temperatureUnit');
  if (savedUnit) {
    currentUnit = savedUnit;
    updateUnitButtons();
  }

  const lastCity = localStorage.getItem('lastSearchedCity');
  if (lastCity) {
    getWeatherByCity(lastCity);
  }

  searchBtn.addEventListener('click', handleSearch);
  locationBtn.addEventListener('click', getLocation);

  cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  celsiusBtn.addEventListener('click', () => switchUnit('celsius'));
  fahrenheitBtn.addEventListener('click', () => switchUnit('fahrenheit'));
}

function handleSearch() {
  const city = cityInput.value.trim();
  if (!city) return showError('Please enter a city name');
  getWeatherByCity(city);
}

async function getWeatherByCity(city) {
  showLoading();
  hideError();

  try {
    const currentRes = await fetch(`${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric`);
    if (!currentRes.ok) throw new Error('City not found or API error');
    const currentDataJson = await currentRes.json();

    const forecastRes = await fetch(`${BASE_URL}/forecast?q=${city}&appid=${API_KEY}&units=metric`);
    if (!forecastRes.ok) throw new Error('Failed to fetch forecast data');
    const forecastDataJson = await forecastRes.json();

    currentData = { current: currentDataJson, forecast: forecastDataJson };
    updateCurrentWeather(currentDataJson);
    updateForecast(forecastDataJson);

    localStorage.setItem('lastSearchedCity', city);
  } catch (err) {
    showError(err.message);
  } finally {
    hideLoading();
  }
}

function getLocation() {
  if (!navigator.geolocation) return showError('Geolocation not supported by your browser');

  showLoading();
  hideError();

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;

    try {
      const currentRes = await fetch(`${BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`);
      const currentDataJson = await currentRes.json();

      const forecastRes = await fetch(`${BASE_URL}/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`);
      const forecastDataJson = await forecastRes.json();

      currentData = { current: currentDataJson, forecast: forecastDataJson };
      updateCurrentWeather(currentDataJson);
      updateForecast(forecastDataJson);

      cityInput.value = currentDataJson.name;
      localStorage.setItem('lastSearchedCity', currentDataJson.name);

    } catch (err) {
      showError(err.message);
    } finally {
      hideLoading();
    }
  }, (err) => {
    hideLoading();
    switch (err.code) {
      case err.PERMISSION_DENIED: showError('Location access denied'); break;
      case err.POSITION_UNAVAILABLE: showError('Location unavailable'); break;
      case err.TIMEOUT: showError('Location request timed out'); break;
      default: showError('Unknown location error');
    }
  });
}

function updateCurrentWeather(data) {
  cityName.textContent = `${data.name}, ${data.sys.country}`;
  const now = new Date();
  dateTime.textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  updateTemperatures(data);

  const iconCode = data.weather[0].icon;
  weatherIcon.innerHTML = getWeatherIcon(iconCode);
  weatherDescription.textContent = data.weather[0].description;

  currentWeather.style.display = 'block';
}

function updateTemperatures(data) {
  let temp, feelsLikeTemp, windSpeedValue;

  if (currentUnit === 'celsius') {
    temp = Math.round(data.main.temp);
    feelsLikeTemp = Math.round(data.main.feels_like);
    windSpeedValue = `${data.wind.speed} m/s`;
  } else {
    temp = Math.round((data.main.temp * 9/5) + 32);
    feelsLikeTemp = Math.round((data.main.feels_like * 9/5) + 32);
    windSpeedValue = `${(data.wind.speed * 2.237).toFixed(1)} mph`;
  }

  temperature.textContent = `${temp}°${currentUnit === 'celsius' ? 'C' : 'F'}`;
  feelsLike.textContent = `${feelsLikeTemp}°${currentUnit === 'celsius' ? 'C' : 'F'}`;
  humidity.textContent = `${data.main.humidity}%`;
  windSpeed.textContent = windSpeedValue;
  pressure.textContent = `${data.main.pressure} hPa`;
}

function updateForecast(data) {
  forecastContainer.innerHTML = '';
  const dailyForecasts = [];
  const datesAdded = new Set();

  for (let i = 0; i < data.list.length; i++) {
    const forecast = data.list[i];
    const forecastDate = new Date(forecast.dt * 1000);
    const dateKey = forecastDate.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!datesAdded.has(dateKey)) {
      dailyForecasts.push(forecast);
      datesAdded.add(dateKey);
    }

    if (dailyForecasts.length === 5) break; // only 5 days
  }

  dailyForecasts.forEach(forecast => {
    const forecastDate = new Date(forecast.dt * 1000);
    const dayName = forecastDate.toLocaleDateString('en-US', { weekday: 'short' });
    const date = forecastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    let highTemp = currentUnit === 'celsius' ? Math.round(forecast.main.temp_max) : Math.round((forecast.main.temp_max * 9/5) + 32);
    let lowTemp = currentUnit === 'celsius' ? Math.round(forecast.main.temp_min) : Math.round((forecast.main.temp_min * 9/5) + 32);

    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `
      <div class="forecast-date">${dayName}</div>
      <div class="forecast-date">${date}</div>
      <div class="forecast-icon">${getWeatherIcon(forecast.weather[0].icon)}</div>
      <div class="weather-description">${forecast.weather[0].description}</div>
      <div class="forecast-temp">
        <span class="forecast-high">${highTemp}°</span>
        <span class="forecast-low">${lowTemp}°</span>
      </div>
    `;
    forecastContainer.appendChild(card);
  });
}

function getWeatherIcon(iconCode) {
  const iconMap = {
    '01d': 'fas fa-sun',
    '01n': 'fas fa-moon',
    '02d': 'fas fa-cloud-sun',
    '02n': 'fas fa-cloud-moon',
    '03d': 'fas fa-cloud',
    '03n': 'fas fa-cloud',
    '04d': 'fas fa-cloud',
    '04n': 'fas fa-cloud',
    '09d': 'fas fa-cloud-rain',
    '09n': 'fas fa-cloud-rain',
    '10d': 'fas fa-cloud-sun-rain',
    '10n': 'fas fa-cloud-moon-rain',
    '11d': 'fas fa-bolt',
    '11n': 'fas fa-bolt',
    '13d': 'fas fa-snowflake',
    '13n': 'fas fa-snowflake',
    '50d': 'fas fa-smog',
    '50n': 'fas fa-smog'
  };
  return `<i class="${iconMap[iconCode] || 'fas fa-question'}"></i>`;
}

function switchUnit(unit) {
  if (currentUnit === unit) return;
  currentUnit = unit;
  localStorage.setItem('temperatureUnit', unit);
  updateUnitButtons();

  if (currentData) {
    updateTemperatures(currentData.current);
    updateForecast(currentData.forecast);
  }
}

function updateUnitButtons() {
  celsiusBtn.classList.toggle('active', currentUnit === 'celsius');
  fahrenheitBtn.classList.toggle('active', currentUnit === 'fahrenheit');
}

function showLoading() {
  loading.style.display = 'block';
  currentWeather.style.display = 'none';
  forecastContainer.innerHTML = '';
}

function hideLoading() { loading.style.display = 'none'; }

function showError(msg) { 
  errorMessage.textContent = msg; 
  errorMessage.style.display = 'block'; 
}

function hideError() { errorMessage.style.display = 'none'; }

document.addEventListener('DOMContentLoaded', init);
