// Import the CSS file at the top of your JavaScript entry point
import './app.css';
import * as d3 from "d3"
import {io} from "socket.io-client"
import {configs} from "../_server/static/configs.js"

let hostname = window.location.hostname
let protocol = window.location.protocol
const socketUrl = protocol + "//" + hostname + ":" + configs.port

export const socket = io(socketUrl)
socket.on("connect", () => {
  console.log("Connected to " + socketUrl + ".")
})
socket.on("disconnect", () => {
  console.log("Disconnected from " + socketUrl + ".")
})

document.addEventListener('DOMContentLoaded', () => {

  let allGames = []; // To store all game data received from the server
  let filteredGames = []; // To store games after applying filters

  // --- UI Element References ---
  const gameListItemsContainer = document.getElementById('game-list-items');

  // Slider elements and their value displays
  const topXSlider = document.getElementById('top-x-slider');
  const topXValue = document.getElementById('top-x-value');
  const ratingSlider = document.getElementById('rating-slider');
  const ratingValue = document.getElementById('rating-value');
  const playerMinSlider = document.getElementById('player-min-slider');
  const playerMaxSlider = document.getElementById('player-max-slider');
  const playerRangeValue = document.getElementById('player-range-value');
  const timeMinSlider = document.getElementById('time-min-slider');
  const timeMaxSlider = document.getElementById('time-max-slider');
  const timeRangeValue = document.getElementById('time-range-value');
  const ldaSlider = document.getElementById('lda-slider'); // Placeholder for future use
  const ldaValue = document.getElementById('lda-value');
  const kSlider = document.getElementById('k-slider');     // Placeholder for future use
  const kValue = document.getElementById('k-value');
  const recommendationToggle = document.getElementById('recommendation-toggle');

  // --- Socket.IO Event Listeners ---
  socket.on('initial_game_data', (data) => {
    console.log('Received initial game data from server:', data.length, 'games');
    allGames = data;
    initializeFilterRanges(allGames); // Set slider ranges based on received data
    applyFiltersAndDisplayGames(); // Initial display of all games
  });

  // --- Helper Functions ---

  /**
   * Initializes the min/max ranges and current values of sliders based on the loaded data.
   * @param {Array} gamesData The full array of game objects.
   */
  const initializeFilterRanges = (gamesData) => {
    if (!gamesData || gamesData.length === 0) return;

    // Calculate dynamic ranges from the data
    const minOverallPlayers = Math.min(...gamesData.map(game => game.minplayers).filter(val => typeof val === 'number'));
    const maxOverallPlayers = Math.max(...gamesData.map(game => game.maxplayers).filter(val => typeof val === 'number'));
    const minOverallTime = Math.min(...gamesData.map(game => game.minplaytime).filter(val => typeof val === 'number'));
    const maxOverallTime = Math.max(...gamesData.map(game => game.maxplaytime).filter(val => typeof val === 'number'));
    const minOverallRating = Math.min(...gamesData.map(game => game.rating && game.rating.rating).filter(val => typeof val === 'number'));
    const maxOverallRating = Math.max(...gamesData.map(game => game.rating && game.rating.rating).filter(val => typeof val === 'number'));

    // Set Players sliders
    if (playerMinSlider && playerMaxSlider) {
      playerMinSlider.min = minOverallPlayers;
      playerMinSlider.max = maxOverallPlayers;
      playerMinSlider.value = minOverallPlayers; // Set initial value to actual min
      playerMaxSlider.min = minOverallPlayers;
      playerMaxSlider.max = maxOverallPlayers;
      playerMaxSlider.value = maxOverallPlayers; // Set initial value to actual max
      playerRangeValue.textContent = `${minOverallPlayers} - ${maxOverallPlayers}`;
    }

    // Set Play Time sliders
    if (timeMinSlider && timeMaxSlider) {
      timeMinSlider.min = minOverallTime;
      timeMinSlider.max = maxOverallTime;
      timeMinSlider.value = minOverallTime; // Set initial value to actual min
      timeMaxSlider.min = minOverallTime;
      timeMaxSlider.max = maxOverallTime;
      timeMaxSlider.value = maxOverallTime; // Set initial value to actual max
      timeRangeValue.textContent = `${minOverallTime} - ${maxOverallTime} min`;
    }

    // Set Rating slider
    if (ratingSlider) {
      ratingSlider.min = minOverallRating;
      ratingSlider.max = maxOverallRating;
      ratingSlider.value = minOverallRating; // Set initial value to actual min
      ratingValue.textContent = `${minOverallRating.toFixed(1)}+`;
    }

    // Top X slider can remain static as it's a display limit, not data range.
    // LDA and K-clusters are fixed ranges as per HTML.
  };

  // Function to handle single slider updates
  const setupSingleSlider = (slider, valueSpan, suffix = '') => {
    if (slider && valueSpan) {
      slider.addEventListener('input', () => {
        valueSpan.textContent = slider.value + suffix;
        applyFiltersAndDisplayGames(); // Re-filter and display on change
      });
      // Initial value set in initializeFilterRanges or defaults from HTML
    }
  };

  // Function to handle dual-range slider updates
  const setupDualRangeSlider = (minSlider, maxSlider, valueSpan, suffix = '') => {
    if (minSlider && maxSlider && valueSpan) {
      const updateRangeValue = () => {
        let minValue = parseInt(minSlider.value);
        let maxValue = parseInt(maxSlider.value);

        // Ensure min value does not exceed max value
        if (minValue > maxValue) {
          minSlider.value = maxValue;
          minValue = maxValue;
        }
        // Ensure max value does not go below min value
        if (maxValue < minValue) {
          maxSlider.value = minValue;
          maxValue = minValue;
        }

        valueSpan.textContent = `${minValue} - ${maxValue}${suffix}`;
        applyFiltersAndDisplayGames(); // Re-filter and display on change
      };

      minSlider.addEventListener('input', updateRangeValue);
      maxSlider.addEventListener('input', updateRangeValue);

      // Initial value set in initializeFilterRanges or defaults from HTML
    }
  };

  // --- Filtering Logic ---
  const applyFiltersAndDisplayGames = () => {
    let currentFilteredGames = [...allGames]; // Start with a copy of all games

    // Apply "Rating" filter
    const minRating = parseFloat(ratingSlider.value);
    currentFilteredGames = currentFilteredGames.filter(game =>
      game.rating && game.rating.rating >= minRating
    );

    // Apply "Players" filter
    const minPlayers = parseInt(playerMinSlider.value);
    const maxPlayers = parseInt(playerMaxSlider.value);
    currentFilteredGames = currentFilteredGames.filter(game => {
      // Check if game has valid player ranges and overlaps with selected range
      return game.minplayers <= maxPlayers && game.maxplayers >= minPlayers;
    });

    // Apply "Play time" filter
    const minTime = parseInt(timeMinSlider.value);
    const maxTime = parseInt(timeMaxSlider.value);
    currentFilteredGames = currentFilteredGames.filter(game => {
      // Check if game has valid play time ranges and overlaps with selected range
      return game.minplaytime <= maxTime && game.maxplaytime >= minTime;
    });

    // After all filtering, sort by rank and then apply the top X limit
    // Ensure 'rank' exists and is a number, otherwise treat as Infinity for sorting
    currentFilteredGames.sort((a, b) => (a.rank || Infinity) - (b.rank || Infinity));

    // Apply "Games" (Top X) limit after sorting
    const topXLimit = parseInt(topXSlider.value);
    filteredGames = currentFilteredGames.slice(0, topXLimit);

    // Now display the filtered games
    populateGameList(filteredGames);
  };

  // Function to populate the game list with actual filtered data
  const populateGameList = (gamesToDisplay) => {
    gameListItemsContainer.innerHTML = ''; // Clear existing items

    if (!gamesToDisplay || gamesToDisplay.length === 0) {
      gameListItemsContainer.innerHTML = '<li class="text-gray-500 p-1.5">No games found matching criteria.</li>';
      return;
    }

    gamesToDisplay.forEach((game) => {
      const listItem = document.createElement('li');
      listItem.className = 'p-1.5 rounded-md hover:bg-gray-50 cursor-pointer flex justify-between items-center';
      listItem.dataset.gameId = game.id; // Store game ID on the element

      // Example: Mark two games as selected for demonstration (can be made dynamic later)
      // These specific IDs (3 and 5) are hardcoded for now, for real app this would be state based
      if (game.id === 3 || game.id === 5) { // Samurai and Terraforming Mars
        listItem.classList.add('selected-game-item');
      }

      const gameNameSpan = document.createElement('span');
      gameNameSpan.textContent = game.title; // Use 'title' from JSON
      gameNameSpan.className = 'flex-grow truncate';

      const gameRatingSpan = document.createElement('span');
      gameRatingSpan.textContent = game.rating ? game.rating.rating.toFixed(2) : 'N/A';
      gameRatingSpan.className = 'ml-2 text-gray-500 text-xs bg-gray-200 px-2 py-0.5 rounded-full';

      listItem.appendChild(gameNameSpan);
      listItem.appendChild(gameRatingSpan);
      gameListItemsContainer.appendChild(listItem);
    });
  };

  // --- Initial Setup Calls ---

  // Setup panel toggles
  document.querySelectorAll('.panel-toggle').forEach(button => {
    button.addEventListener('click', () => {
      const panel = button.closest('.panel-container');
      if (panel) {
        panel.classList.toggle('collapsed');
      }
    });
  });

  // Setup all sliders with event listeners that trigger filtering
  // Initial values and ranges will be set by initializeFilterRanges
  setupSingleSlider(topXSlider, topXValue, '');
  setupSingleSlider(ratingSlider, ratingValue, '+');
  setupSingleSlider(ldaSlider, ldaValue, '');
  setupSingleSlider(kSlider, kValue, '');
  setupDualRangeSlider(playerMinSlider, playerMaxSlider, playerRangeValue, '');
  setupDualRangeSlider(timeMinSlider, timeMaxSlider, timeRangeValue, ' min');

  // The initial_game_data socket event listener will now trigger
  // initializeFilterRanges and then applyFiltersAndDisplayGames
});
