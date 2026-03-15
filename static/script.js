let currentLat = 10.9323;
let currentLon = 78.0913;

async function geocodeLocation(query) {
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`);
    if (!r.ok) throw new Error('Geocode failed');
    const data = await r.json();
    if (!data.results || !data.results.length) return null;
    return {lat: data.results[0].latitude, lon: data.results[0].longitude, name: data.results[0].name};
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function fetchWeather(lat = currentLat, lon = currentLon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,apparent_temperature,relativehumidity_2m,uv_index,precipitation_probability&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min&timezone=auto`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('Weather API failed');
    return await r.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

function weatherCondition(code) {
  if (code === 0) return 'sunny';
  if ([1, 2, 3].includes(code)) return 'cloudy';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy';
  return 'cold';
}

async function initHome() {
  const weatherInfo = document.getElementById('weatherInfo');
  const quizResult = document.getElementById('quizResult');
  const quote = document.getElementById('quote');
  const locationInput = document.getElementById('locationInput');
  const locationSearch = document.getElementById('locationSearch');
  const locationStatus = document.getElementById('locationStatus');
  if (!weatherInfo) return;

  async function renderWeather() {
    weatherInfo.innerText = 'Loading weather...';
    const data = await fetchWeather();
    if (!data || !data.current_weather) {
      weatherInfo.innerText = 'Could not load weather.';
      return;
    }
    const cur = data.current_weather;
    weatherInfo.innerHTML = `<strong>${cur.temperature}°C</strong> | Wind ${cur.windspeed} km/h | Code ${cur.weathercode}`;
    if (quote) quote.innerText = ['Warm day? Pick light meals.', 'Rainy day comfort food checks.', 'Cool weather: hydrate and move.'][Math.floor(Math.random() * 3)];
    const actual = weatherCondition(cur.weathercode);
    document.querySelectorAll('.option').forEach(btn => {
      btn.onclick = () => {
        quizResult.innerHTML = actual === btn.dataset.answer ? `✅ Correct! It is ${actual}.` : `❌ Not quite. It is ${actual}.`;
      };
    });
  }

  if (navigator.geolocation && locationStatus) {
    locationStatus.innerText = 'Getting your location for smarter weather...';
    navigator.geolocation.getCurrentPosition(async pos => {
      currentLat = pos.coords.latitude;
      currentLon = pos.coords.longitude;
      locationStatus.innerText = `Using your location (${currentLat.toFixed(2)}, ${currentLon.toFixed(2)}).`;
      await renderWeather();
    }, async () => {
      locationStatus.innerText = 'Could not get location. Showing default weather.';
      await renderWeather();
    });
  } else {
    await renderWeather();
  }

  if (locationSearch && locationInput && locationStatus) {
    locationSearch.onclick = async () => {
      const city = locationInput.value.trim();
      if (!city) {
        locationStatus.innerText = 'Enter a city name.';
        return;
      }
      locationStatus.innerText = 'Loading city...';
      const loc = await geocodeLocation(city);
      if (!loc) {
        locationStatus.innerText = 'City not found.';
        return;
      }
      currentLat = loc.lat;
      currentLon = loc.lon;
      locationStatus.innerText = `Loaded weather for ${loc.name}.`;
      await renderWeather();
    };
  }
}

async function initWeatherPage() {
  const container = document.getElementById('weatherDetail');
  if (!container) return;
  const data = await fetchWeather();
  if (!data || !data.current_weather) {
    container.innerText = 'Could not load weather details.';
    return;
  }
  const c = data.current_weather;
  const d = data.daily;
  const h = data.hourly;
  const hourlyList = h.time.slice(0, 8).map((t, i) => `<li>${new Date(t).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}: ${h.temperature_2m[i]}°C</li>`).join('');
  const dailyList = d.time.slice(0, 7).map((t, i) => `<li>${t}: ${d.temperature_2m_min[i]}° / ${d.temperature_2m_max[i]}°C</li>`).join('');
  container.innerHTML = `<div class="card"><p><strong>Temp:</strong> ${c.temperature}°C</p><p><strong>Wind:</strong> ${c.windspeed} km/h</p><p><strong>UV Index:</strong> ${h.uv_index?.[0] ?? 'N/A'}</p><p><strong>Humidity:</strong> ${h.relativehumidity_2m?.[0] ?? 'N/A'}%</p><p><strong>Sunrise:</strong> ${d.sunrise[0] ?? 'N/A'}</p><p><strong>Sunset:</strong> ${d.sunset[0] ?? 'N/A'}</p></div><div class="card"><h4>Hourly</h4><ul>${hourlyList}</ul></div><div class="card"><h4>7-Day</h4><ul>${dailyList}</ul></div>`;
}

const dishes = [
  {name: 'Grilled Chicken Salad', calories: 320, sugar: 5, sodium: 420, fat: 10, type: 'Non-Veg', score: 4.8},
  {name: 'Veg Quinoa Bowl', calories: 280, sugar: 8, sodium: 360, fat: 9, type: 'Veg', score: 4.6},
  {name: 'Paneer Wrap', calories: 480, sugar: 7, sodium: 560, fat: 18, type: 'Veg', score: 3.9},
  {name: 'Salmon Teriyaki', calories: 520, sugar: 12, sodium: 720, fat: 22, type: 'Non-Veg', score: 3.4},
  {name: 'Fruit Oat Smoothie', calories: 220, sugar: 20, sodium: 120, fat: 5, type: 'Both', score: 4.2}
];

function dishHealthLabel(d) {
  if (d.score >= 4.5) return '<span style="color:#7ed97d;font-weight:700;">Healthy</span>';
  if (d.score >= 3.8) return '<span style="color:#f4d35e;font-weight:700;">Moderate</span>';
  return '<span style="color:#ff7676;font-weight:700;">Not healthy</span>';
}

function evaluateDish(dish, profile) {
  const warnings = [];
  if (!profile) return warnings;
  if (profile.diabetes === 'Yes' && dish.sugar > 10) warnings.push('High sugar for diabetes.');
  if (profile.blood_pressure === 'High' && dish.sodium > 600) warnings.push('High sodium for blood pressure.');
  if (profile.pressure_status === 'High' && dish.sodium > 500) warnings.push('Pressure status suggests lower sodium.');
  if (profile.cardiac === 'Yes' && dish.fat > 16) warnings.push('High fat may be risky for cardiac condition.');
  if (profile.pregnant === 'Yes' && dish.fat > 18) warnings.push('Discuss high fat choices when pregnant.');
  const calorieGoal = Number(profile.calorie_goal || 2000);
  if (dish.calories > calorieGoal) warnings.push('This dish exceeds your calorie goal.');
  return warnings;
}

async function initDishes() {
  const container = document.getElementById('dishesContainer');
  if (!container) return;
  try {
    const r = await fetch('/api/profile');
    if (!r.ok) throw new Error('profile');
    const profile = await r.json();
    const shuffled = dishes.sort(() => Math.random() - 0.5);
    container.innerHTML = shuffled.map(d => `<div class="card"><h3>${d.name}</h3><p>Calories: ${d.calories} | Sugar: ${d.sugar}g | Sodium: ${d.sodium}mg | ${dishHealthLabel(d)}</p><button class="btn dish-btn" data-name="${d.name}">Select</button></div>`).join('');
    container.querySelectorAll('.dish-btn').forEach(btn => {
      btn.onclick = () => {
        const dish = dishes.find(x => x.name === btn.dataset.name);
        const warnings = evaluateDish(dish, profile);
        const message = warnings.length ? `⚠️ ${warnings.join(' ')}` : '✅ Great choice for you.';
        localStorage.setItem('latest_warning', message);
        localStorage.setItem('last_dish', dish.name);
        const popup = document.getElementById('popup');
        const content = document.getElementById('popupContent');
        content.innerHTML = `<h3>${dish.name}</h3><p>Calories: ${dish.calories}</p><p>Sugar: ${dish.sugar}g | Sodium: ${dish.sodium}mg | Fat: ${dish.fat}g</p><p>${message}</p><p><a class="btn" href="/restaurants">Nearby Restaurants</a> <a class="btn" href="/recipe">Recipe</a> <a class="btn" href="/warning">Warning</a></p>`;
        popup.classList.remove('hidden');
      };
    });
    const close = document.getElementById('closePopup');
    if (close) close.onclick = () => document.getElementById('popup').classList.add('hidden');
  } catch (err) {
    container.innerHTML = '<p class="warning">Save your profile first to evaluate dishes. <a class="btn" href="/profile">Profile</a></p>';
  }
}

function distance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function initRestaurants() {
  const button = document.getElementById('loadRestaurants');
  const list = document.getElementById('restaurantList');
  if (!button || !list) return;
  button.onclick = () => {
    if (!navigator.geolocation) {
      list.innerText = 'Geolocation unsupported in this browser.';
      return;
    }
    list.innerText = 'Getting your location...';
    navigator.geolocation.getCurrentPosition(async pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const q = `[out:json][timeout:25];(node[amenity=restaurant](around:5000,${lat},${lon});way[amenity=restaurant](around:5000,${lat},${lon});relation[amenity=restaurant](around:5000,${lat},${lon}););out center;`;
      try {
        const r = await fetch('https://overpass-api.de/api/interpreter', {method: 'POST', body: q});
        const data = await r.json();
        if (!data.elements?.length) {
          list.innerHTML = '<p>No restaurants found nearby right now.</p>';
          return;
        }
        list.innerHTML = data.elements.slice(0, 8).map(e => {
          const name = e.tags?.name || 'Restaurant';
          const lat2 = e.lat ?? e.center?.lat;
          const lon2 = e.lon ?? e.center?.lon;
          const dist = lat2 && lon2 ? distance(lat, lon, lat2, lon2).toFixed(2) : 'N/A';
          return `<div class="card"><h4>${name}</h4><p>Distance: ${dist} km</p><a class="btn" href="https://www.google.com/maps/search/?api=1&query=${lat2},${lon2}" target="_blank">Navigate</a></div>`;
        }).join('');
      } catch {
        list.innerText = 'Could not fetch restaurants. Try again.';
      }
    }, err => {
      list.innerText = `Location error: ${err.message}`;
    });
  };
}

async function initRecipe() {
  const btn = document.getElementById('getRecipe');
  const out = document.getElementById('recipeResult');
  const input = document.getElementById('mealQuery');
  const source = document.getElementById('recipeSource');
  if (!btn || !out || !input || !source) return;
  const lastDish = localStorage.getItem('last_dish');
  if (lastDish) {
    input.value = lastDish;
    await loadRecipe(lastDish, out, source.value);
  }
  btn.onclick = async () => {
    const q = input.value.trim();
    if (!q) {
      out.innerText = 'Enter a meal name.';
      return;
    }
    await loadRecipe(q, out, source.value);
  };
}

const tamilTranslate = {
  Chicken: 'சிக்கன்',
  Salad: 'சாலட்',
  Pasta: 'பாஸ்தா',
  Paneer: 'பன்னீர்',
  Honey: 'தேன்',
  Garlic: 'பூண்டு',
  Tomato: 'தக்காளி',
  Oil: 'எண்ணெய்',
  Salt: 'உப்பு',
  Spinach: 'கீரை',
  Flatbread: 'தோசை/ரொட்டி',
  Vegetables: 'காய்கறிகள்',
  Serve: 'சேவை செய்',
  Cook: 'சமையல்',
  Mix: 'கலப்பு',
  Sauce: 'சாஸ்',
  Greens: 'பச்சை கீரைகள்',
  Nuts: 'கீரை',
  Rice: 'அரிசி'
};

function makeTamil(sentence) {
  if (!sentence) return '';
  return sentence.split(' ').map(w => tamilTranslate[w.replace(/[.,]/g, '')] || w).join(' ');
}

function aiRecipeExtract(query) {
  const core = query.trim();
  if (!core) return null;
  return {
    name: `AI ${core} Recipe`,
    ingredients: ['Main ingredient', 'Spices', 'Oil', 'Salt'],
    instructions: `Cook ${core} with spices and vegetables. Serve hot.`
  };
}

const localRecipeDB = {
  Chicken: {name: 'Honey Garlic Chicken', instructions: 'Pan-sear chicken, add honey garlic sauce, serve with veggies.', ingredients: ['Chicken', 'Honey', 'Garlic']},
  Salad: {name: 'Rainbow Garden Salad', instructions: 'Toss greens, cucumber, tomato, and nuts. Dress with olive oil and lemon.', ingredients: ['Lettuce', 'Tomato', 'Cucumber', 'Nuts']},
  Pasta: {name: 'Creamy Tomato Pasta', instructions: 'Cook pasta, mix with tomato cream sauce and herbs.', ingredients: ['Pasta', 'Tomato', 'Cream', 'Basil']},
  Paneer: {name: 'Paneer Spinach Wrap', instructions: 'Sauté paneer with spinach, wrap in flatbread.', ingredients: ['Paneer', 'Spinach', 'Flatbread']}
};

async function loadRecipe(query, out, source) {
  out.innerText = 'Searching recipe...';
  const sanitized = query.trim();
  if (!sanitized) {
    out.innerHTML = '<div class="card warning"><p>Please enter a meal name.</p></div>';
    return;
  }
  const canonicalKey = sanitized.split(' ')[0].charAt(0).toUpperCase() + sanitized.split(' ')[0].slice(1).toLowerCase();

  if (source === 'local') {
    const recipe = localRecipeDB[canonicalKey];
    if (!recipe) {
      out.innerHTML = `<div class="card warning"><p>No local recipe found for "${sanitized}". Try Chicken, Salad, Pasta, or Paneer.</p></div>`;
      return;
    }
    out.innerHTML = `<div class="card cute"><h3>${recipe.name}</h3><p><em>தமிழ்: ${makeTamil(recipe.name)}</em></p><h4>Ingredients</h4><ul>${recipe.ingredients.map(i => `<li>${i} (${makeTamil(i)})</li>`).join('')}</ul><h4>Instructions</h4><p>EN: ${recipe.instructions}</p><p>TA: ${makeTamil(recipe.instructions)}</p></div>`;
    return;
  }

  if (source === 'ai') {
    const recipe = aiRecipeExtract(sanitized);
    if (!recipe) {
      out.innerHTML = `<div class="card warning"><p>AI could not generate a recipe. Try a different term.</p></div>`;
      return;
    }
    out.innerHTML = `<div class="card cute"><h3>${recipe.name}</h3><p><em>தமிழ்: ${makeTamil(recipe.name)}</em></p><h4>Ingredients</h4><ul>${recipe.ingredients.map(i => `<li>${i} (${makeTamil(i)})</li>`).join('')}</ul><h4>Instructions</h4><p>EN: ${recipe.instructions}</p><p>TA: ${makeTamil(recipe.instructions)}</p></div>`;
    return;
  }

  try {
    const r = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(sanitized)}`);
    const data = await r.json();
    if (!data.meals) {
      const fallback = localRecipeDB[canonicalKey];
      if (fallback) {
        out.innerHTML = `<div class="card cute"><h3>${fallback.name}</h3><h4>Ingredients</h4><ul>${fallback.ingredients.map(i => `<li>${i}</li>`).join('')}</ul><h4>Instructions</h4><p>${fallback.instructions}</p></div>`;
        return;
      }
      out.innerHTML = `<div class="card warning"><p>No recipes found for "${sanitized}". Try local source.</p></div>`;
      return;
    }
    const meal = data.meals[0];
    const ing = [];
    for (let i = 1; i <= 20; i += 1) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (ingredient && ingredient.trim()) ing.push(`<li>${measure || ''} ${ingredient}</li>`);
    }
    out.innerHTML = `<div class="card cute"><h3>${meal.strMeal}</h3><p><em>தமிழ்: ${makeTamil(meal.strMeal)}</em></p><img src="${meal.strMealThumb}" alt="${meal.strMeal}" style="width:100%;border-radius:10px;max-height:260px;object-fit:cover;"/><h4>Ingredients</h4><ul>${ing.join('')}</ul><h4>Instructions</h4><p>EN: ${meal.strInstructions}</p><p>TA: ${makeTamil(meal.strInstructions)}</p></div>`;
  } catch (err) {
    console.error('Recipe load error', err);
    const fallback = localRecipeDB[canonicalKey];
    if (fallback) {
      out.innerHTML = `<div class="card cute"><h3>${fallback.name}</h3><h4>Ingredients</h4><ul>${fallback.ingredients.map(i => `<li>${i}</li>`).join('')}</ul><h4>Instructions</h4><p>${fallback.instructions}</p></div>`;
      return;
    }
    out.innerHTML = '<div class="card warning"><p>Could not load recipe. Please try local source.</p></div>';
  }
}

async function initWarningPage() {
  const container = document.getElementById('warningContainer');
  if (!container) return;
  const latest = localStorage.getItem('latest_warning');
  container.innerHTML = latest ? `<p>${latest}</p><p><a class="btn" href="/dishes">Pick a healthier dish</a></p>` : '<p>No warning recorded yet. Choose a dish first from Dishes page.</p>';
}

async function initProfileUpdate() {
  const form = document.getElementById('profileUpdateForm');
  if (!form) return;
  form.onsubmit = async e => {
    e.preventDefault();
    const data = new FormData(form);
    const payload = {
      name: data.get('name'),
      age: data.get('age'),
      height: data.get('height'),
      weight: data.get('weight'),
      blood_pressure: data.get('blood_pressure'),
      diabetes: data.get('diabetes'),
      cholesterol: data.get('cholesterol'),
      cardiac: data.get('cardiac'),
      pregnant: data.get('pregnant'),
      pressure_status: data.get('pressure_status'),
      location: data.get('location'),
      calorie_goal: data.get('calorie_goal'),
      preference: data.get('preference')
    };
    try {
      const r = await fetch('/api/save-profile', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      const msg = document.getElementById('updateMsg');
      if (r.ok) {
        msg.innerText = 'Profile saved successfully.';
        setTimeout(() => window.location.reload(), 400);
      } else {
        const j = await r.json();
        msg.innerText = j.error || 'Save failed.';
      }
    } catch {
      document.getElementById('updateMsg').innerText = 'Network error while saving.';
    }
  };
}

window.addEventListener('DOMContentLoaded', () => {
  initHome();
  initWeatherPage();
  initDishes();
  initRestaurants();
  initRecipe();
  initWarningPage();
  initProfileUpdate();
});
