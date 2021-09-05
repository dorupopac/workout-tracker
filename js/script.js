'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178)
// const cycling1 = new Cycling([39, -12], 27, 95, 523)
// console.log(run1, cycling1);

//////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const resetButton = document.querySelector('.reset__workouts');

const htmlErrorEl = document.querySelector('.workout__error--message');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #formDisplayed = false;
  #marker = [];

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Render reset button
    this._toggleResetButton();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));
    resetButton.addEventListener('click', this._resetWorkouts.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          document.querySelector('body').innerHTML = ''
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._toggleForm.bind(this));

    this.#workouts.forEach(work => this._renderWorkoutMarker(work));
  }

  _toggleForm(mapE) {
    if (!this.#formDisplayed) {
      this.#mapEvent = mapE;
      form.classList.remove('hidden');
      inputDistance.focus();
    }
    if (this.#formDisplayed) {
      form.classList.add('hidden');

      this._clearInputs();
    }
    this.#formDisplayed = !this.#formDisplayed;
  }

  _hideForm() {
    this._clearInputs();

    if (this.#formDisplayed) this.#formDisplayed = !this.#formDisplayed;

    form.classList.add('hidden');
    form.style.display = 'none';
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout === running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(distance) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        form.classList.add('workout__error');
        setTimeout(() => form.classList.remove('workout__error'), 500);

        // Add error msg
        if (htmlErrorEl.classList.contains('workout__error--message--hidden')) {
          htmlErrorEl.classList.remove('workout__error--message--hidden');
        }
        return;
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout === cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        form.classList.add('workout__error');
        setTimeout(() => form.classList.remove('workout__error'), 500);

        // Add error msg
        if (htmlErrorEl.classList.contains('workout__error--message--hidden')) {
          htmlErrorEl.classList.remove('workout__error--message--hidden');
        }
        return;
      }

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new obj to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on the list
    this._renderWorkout(workout);

    // Hide form + clear input fields + remove err msg if it exists
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();

    // Render reset button
    this._toggleResetButton();
  }

  _renderWorkoutMarker(workout) {
    this.#marker.push(
      L.marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(
          L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`,
          })
        )
        .setPopupContent(
          `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'} ${workout.description}`
        )
        .openPopup()
    );
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <span class="workout__close">&#10005;</span>
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;
    }
    htmlErrorEl.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    const closeEl = e.target.closest('.workout__close');

    if (closeEl) return;
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(work => this._renderWorkout(work));
  }

  _deleteWorkout(e) {
    const workoutEl = e.target.closest('.workout');
    const closeEl = e.target.closest('.workout__close');

    if (!closeEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#workouts = this.#workouts.filter(work => work.id !== workout.id);

    this.#map.removeLayer(
      this.#marker.find(marker => marker._latlng.lat === workout.coords[0])
    );
    const workoutInList = closeEl.closest('.workout');
    workoutInList.remove();

    this._setLocalStorage();

    // Remove display button if there are 0 workouts in the list
    this._toggleResetButton();
  }

  _resetWorkouts() {
    const confirm = window.confirm(
      'Are you sure you want to delete all workouts?'
    );
    if (!confirm) return;

    const allWorkouts = document.querySelectorAll('.workout');
    allWorkouts.forEach(workout => workout.remove());
    this.#marker.forEach(marker => this.#map.removeLayer(marker));
    this.#workouts = [];

    this._hideForm();
    this._toggleResetButton();

    localStorage.removeItem('workouts');
  }

  _toggleResetButton() {
    const lengthCondition = this.#workouts.length !== 0 ? 'remove' : 'add';
    resetButton.classList[lengthCondition]('reset__workouts--hidden');
  }

  _clearInputs() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    if (!htmlErrorEl.classList.contains('workout__error--message--hidden')) {
      htmlErrorEl.classList.add('workout__error--message--hidden');
    }
  }
}

const app = new App();
