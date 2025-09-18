class WeatherApp {
  constructor() {
    this.apiKey = "b77cab0ce35f37e4c9107ad8c3661aed";
    this.baseUrl = "https://api.openweathermap.org/data/2.5";
    this.geoUrl = "https://api.openweathermap.org/geo/1.0";
    this.themeKey = "weather_theme";
    this.initializeApp();
    this.bindEvents();
    this.updateTime();
    this.initializeTheme();
    setInterval(() => this.updateTime(), 1000);
  }

  initializeApp() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.getWeatherByCoords(latitude, longitude);
        },
        (error) => {
          console.log("Geolocation error:", error);
          this.getWeatherByCity("New York");
        }
      );
    } else {
      this.getWeatherByCity("New York");
    }
  }

  bindEvents() {
    const searchBtn = document.getElementById("searchBtn");
    const searchModal = document.getElementById("searchModal");
    const searchClose = document.getElementById("searchClose");
    const searchInput = document.getElementById("searchInput");
    const themeToggle = document.getElementById("themeToggle");

    searchBtn.addEventListener("click", () => {
      searchModal.classList.add("active");
      searchInput.focus();
    });

    searchClose.addEventListener("click", () => {
      searchModal.classList.remove("active");
      searchInput.value = "";
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const city = searchInput.value.trim();
        if (city) {
          this.getWeatherByCity(city);
          searchModal.classList.remove("active");
          searchInput.value = "";
        }
      }
    });

    searchModal.addEventListener("click", (e) => {
      if (e.target === searchModal) {
        searchModal.classList.remove("active");
        searchInput.value = "";
      }
    });

    if (themeToggle) {
      themeToggle.addEventListener("click", () => this.toggleTheme());
    }
  }

  initializeTheme() {
    const saved = localStorage.getItem(this.themeKey);
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  }

  toggleTheme() {
    const current =
      document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(this.themeKey, next);
  }

  updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    document.getElementById("currentTime").textContent = timeString;
  }

  async getWeatherByCity(cityName) {
    try {
      this.showLoading();

      const geoResponse = await fetch(
        `${this.geoUrl}/direct?q=${encodeURIComponent(
          cityName
        )}&limit=1&appid=${this.apiKey}`
      );
      if (!geoResponse.ok) {
        throw new Error(`Geocoding request failed: ${geoResponse.status}`);
      }
      const geoData = await geoResponse.json();

      if (geoData.length === 0) {
        throw new Error("City not found");
      }

      const { lat, lon, name, country } = geoData[0];
      document.getElementById(
        "locationName"
      ).textContent = `${name}, ${country}`;

      await this.getWeatherByCoords(lat, lon);
    } catch (error) {
      console.error("Error fetching weather data:", error);
      this.showError("City not found. Please try again.");
    } finally {
      this.hideLoading();
    }
  }

  async getWeatherByCoords(lat, lon) {
    try {
      this.showLoading();

      const currentResponse = await fetch(
        `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
      );
      if (!currentResponse.ok) {
        throw new Error(
          `Current weather request failed: ${currentResponse.status}`
        );
      }
      const currentData = await currentResponse.json();

      const forecastResponse = await fetch(
        `${this.baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
      );
      if (!forecastResponse.ok) {
        throw new Error(`Forecast request failed: ${forecastResponse.status}`);
      }
      const forecastData = await forecastResponse.json();

      this.updateCurrentWeather(currentData);
      this.updateHourlyForecast(forecastData);
      this.updateDailyForecast(forecastData);
    } catch (error) {
      console.error("Error fetching weather data:", error);
      this.showError("Unable to fetch weather data. Please try again.");
    } finally {
      this.hideLoading();
    }
  }

  updateCurrentWeather(data) {
    const {
      main: { temp, humidity, pressure, temp_min, temp_max },
      weather: [{ description, icon }],
      wind: { speed },
      name,
    } = data;

    document.getElementById("currentTemp").textContent = Math.round(temp);
    document.getElementById("weatherDescription").textContent = description;
    document.getElementById(
      "weatherIcon"
    ).src = `https://openweathermap.org/img/wn/${icon}@2x.png`;
    document.getElementById("highTemp").textContent = `H:${Math.round(
      temp_max
    )}°`;
    document.getElementById("lowTemp").textContent = `L:${Math.round(
      temp_min
    )}°`;

    document.getElementById("humidity").textContent = `${humidity}%`;
    document.getElementById("pressure").textContent = `${pressure} hPa`;
    document.getElementById("windSpeed").textContent = `${Math.round(
      speed * 3.6
    )} km/h`;

    document.getElementById("uvIndex").textContent = "6";
  }

  updateHourlyForecast(data) {
    const hourlyContainer = document.getElementById("hourlyForecast");
    hourlyContainer.innerHTML = "";

    const hourlyData = data.list.slice(0, 5);

    hourlyData.forEach((item, index) => {
      const hour =
        index === 0
          ? "Now"
          : new Date(item.dt * 1000).toLocaleTimeString([], {
              hour: "numeric",
              hour12: true,
            });

      const hourlyItem = document.createElement("div");
      hourlyItem.className = "hourly-item";
      hourlyItem.innerHTML = `
                <span class="hour">${hour}</span>
                <img src="https://openweathermap.org/img/wn/${
                  item.weather[0].icon
                }@2x.png" alt="Weather" class="hourly-icon">
                <span class="hourly-temp">${Math.round(item.main.temp)}°</span>
            `;

      hourlyContainer.appendChild(hourlyItem);
    });
  }

  updateDailyForecast(data) {
    const dailyContainer = document.getElementById("dailyForecast");
    dailyContainer.innerHTML = "";

    const dailyData = this.groupForecastByDay(data.list);
    const days = Object.keys(dailyData).slice(0, 5);

    days.forEach((day, index) => {
      const dayData = dailyData[day];
      const dayName = this.getDayName(day, index);

      // Get min/max temperatures for the day
      const temps = dayData.map((item) => item.main.temp);
      const minTemp = Math.round(Math.min(...temps));
      const maxTemp = Math.round(Math.max(...temps));

      // Get most common weather condition for the day
      const weatherCounts = {};
      dayData.forEach((item) => {
        const weather = item.weather[0].icon;
        weatherCounts[weather] = (weatherCounts[weather] || 0) + 1;
      });

      const mostCommonWeather = Object.keys(weatherCounts).reduce((a, b) =>
        weatherCounts[a] > weatherCounts[b] ? a : b
      );

      const dailyItem = document.createElement("div");
      dailyItem.className = "daily-item";
      dailyItem.innerHTML = `
                <span class="day">${dayName}</span>
                <img src="https://openweathermap.org/img/wn/${mostCommonWeather}@2x.png" alt="Weather" class="daily-icon">
                <span class="daily-high">${maxTemp}°</span>
                <span class="daily-low">${minTemp}°</span>
            `;

      dailyContainer.appendChild(dailyItem);
    });
  }

  groupForecastByDay(forecastList) {
    const grouped = {};

    forecastList.forEach((item) => {
      const date = new Date(item.dt * 1000);
      const dayKey = date.toDateString();

      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(item);
    });

    return grouped;
  }

  getDayName(dateString, index) {
    if (index === 0) return "Today";
    if (index === 1) return "Tomorrow";

    const date = new Date(dateString);
    return date.toLocaleDateString([], { weekday: "long" });
  }

  showLoading() {
    const container = document.querySelector(".container");
    container.classList.add("loading");
  }

  hideLoading() {
    const container = document.querySelector(".container");
    container.classList.remove("loading");
  }

  showError(message) {
    // Create a simple toast notification
    const toast = document.createElement("div");
    toast.style.cssText = `
            position: fixed;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 59, 48, 0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 500;
            z-index: 1001;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  }
}

// Utility functions for weather conditions
const weatherConditions = {
  // Map OpenWeather condition codes to descriptions
  getConditionClass(conditionCode) {
    const conditions = {
      "01": "clear",
      "02": "partly-cloudy",
      "03": "cloudy",
      "04": "overcast",
      "09": "rain",
      10: "rain",
      11: "thunderstorm",
      13: "snow",
      50: "mist",
    };

    return conditions[conditionCode.substring(0, 2)] || "default";
  },

  // Get background gradient based on weather condition and time
  getWeatherGradient(conditionCode, isDay) {
    const condition = conditionCode.substring(0, 2);
    const timeOfDay = conditionCode.endsWith("d") ? "day" : "night";

    const gradients = {
      "01": {
        // Clear
        day: "linear-gradient(135deg, #74b9ff, #0984e3)",
        night: "linear-gradient(135deg, #2d3436, #636e72)",
      },
      "02": {
        // Few clouds
        day: "linear-gradient(135deg, #81ecec, #74b9ff)",
        night: "linear-gradient(135deg, #2d3436, #636e72)",
      },
      "03": {
        // Scattered clouds
        day: "linear-gradient(135deg, #ddd, #74b9ff)",
        night: "linear-gradient(135deg, #2d3436, #636e72)",
      },
      "04": {
        // Broken clouds
        day: "linear-gradient(135deg, #b2bec3, #636e72)",
        night: "linear-gradient(135deg, #2d3436, #636e72)",
      },
      "09": {
        // Shower rain
        day: "linear-gradient(135deg, #74b9ff, #0984e3)",
        night: "linear-gradient(135deg, #2d3436, #636e72)",
      },
      10: {
        // Rain
        day: "linear-gradient(135deg, #74b9ff, #0984e3)",
        night: "linear-gradient(135deg, #2d3436, #636e72)",
      },
      11: {
        // Thunderstorm
        day: "linear-gradient(135deg, #636e72, #2d3436)",
        night: "linear-gradient(135deg, #2d3436, #636e72)",
      },
      13: {
        // Snow
        day: "linear-gradient(135deg, #ddd, #b2bec3)",
        night: "linear-gradient(135deg, #2d3436, #636e72)",
      },
      50: {
        // Mist
        day: "linear-gradient(135deg, #ddd, #b2bec3)",
        night: "linear-gradient(135deg, #2d3436, #636e72)",
      },
    };

    return gradients[condition]?.[timeOfDay] || gradients["01"][timeOfDay];
  },
};

// Initialize the weather app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new WeatherApp();
});
