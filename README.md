## Weather App

Minimal, responsive weather app powered by OpenWeather. Supports city search, geolocation, hourly and 5‑day forecast, and light/dark theme.

### Live Demo
- https://HardityaGhuman.github.io/weather-app/

### Setup
1. Get an API key: https://home.openweathermap.org/api_keys
2. In `script.js`, set your key:
   - `this.apiKey = "YOUR_KEY";`

### Run locally
```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Notes
- Uses metric units; wind shown in km/h.
- Falls back to New York if geolocation is denied.
- UV index is a placeholder.
# weather-app