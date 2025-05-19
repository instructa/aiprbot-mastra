# Weather Workflow Diagram

```mermaid
flowchart TD
    A[Trigger: User provides city] --> B[Step: fetchWeather<br/>Fetches weather forecast for city]
    B --> C[Step: planActivities<br/>Suggests activities based on weather]
    C --> D[Output: Activity recommendations]
```

fetchWeather Step

```mermaid
sequenceDiagram
    participant Trigger as Trigger Data (city)
    participant Step as fetchWeather Step
    participant GeocodingAPI as Geocoding API
    participant WeatherAPI as Weather API

    Trigger->>Step: getStepResult('trigger')\n(city)
    Step->>GeocodingAPI: Fetch coordinates for city
    GeocodingAPI-->>Step: Return latitude, longitude, name
    Step->>WeatherAPI: Fetch weather forecast for coordinates
    WeatherAPI-->>Step: Return daily weather data
    Step->>Step: Map weather data to forecast array
    Step-->>Trigger: Return forecast
```

**Step details:**
- **Trigger:** The workflow starts when a user provides a city name.
- **fetchWeather:** Uses the city to fetch latitude/longitude, then retrieves a weather forecast for that location.
- **planActivities:** Takes the weather forecast and generates activity recommendations using the agent.
- **Output:** Returns the formatted activity recommendations. 