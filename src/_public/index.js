import './app.css';
import * as d3 from "d3";
import { io } from "socket.io-client";
import { configs } from "../_server/static/configs.js";

let hostname = window.location.hostname;
let protocol = window.location.protocol;
const socketUrl = protocol + "//" + hostname + ":" + configs.port;

export const socket = io(socketUrl);
socket.on("connect", () => {
  console.log("Connected to " + socketUrl + ".");
});
socket.on("disconnect", () => {
  console.log("Disconnected from " + socketUrl + ".");
});

document.addEventListener('DOMContentLoaded', () => {

  let allGames = [];
  let filteredGames = [];
  let selectedGameIds = new Set();
  const MAX_SELECTED_GAMES = 5;
  let currentHoveredGameId = null;

  // UI Element References
  const gameListItemsContainer = document.getElementById('game-list-items');
  const scatterplotContainer = d3.select("#scatterplot");
  const scatterplotSvg = d3.select("#scatterplot-svg");
  const scatterplotGroup = scatterplotSvg.append("g");
  const tooltip = d3.select("body").append("div")
                      .attr("class", "tooltip fixed bg-white p-2 rounded shadow-md text-sm text-gray-700 pointer-events-none opacity-0 transition-opacity duration-200 z-50");

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
  const ldaSlider = document.getElementById('lda-slider');
  const ldaValue = document.getElementById('lda-value');
  const kSlider = document.getElementById('k-slider');
  const kValue = document.getElementById('k-value');
  const recommendationToggle = document.getElementById('recommendation-toggle');

  const resetZoomBtn = d3.select("#reset-zoom");
  const zoomInBtn = d3.select("#zoom-in");
  const zoomOutBtn = d3.select("#zoom-out");

  // Barchart D3 Setup
  const mechanicBarchartSvg = d3.select("#mechanic-barchart");
  let barchartMargin = { top: 10, right: 20, bottom: 10, left: 5 };
  let barchartWidth, barchartHeight;
  let barchartInnerWidth, barchartInnerHeight;
  let barchartXScale, barchartYScale;

  const updateBarchartDimensions = () => {
    const barchartContainerNode = mechanicBarchartSvg.node();
    barchartWidth = barchartContainerNode.clientWidth;
    barchartHeight = barchartContainerNode.clientHeight;
    barchartInnerWidth = barchartWidth - barchartMargin.left - barchartMargin.right;
    barchartInnerHeight = barchartHeight - barchartMargin.top - barchartMargin.bottom;

    mechanicBarchartSvg.selectAll("text").filter(function() { return d3.select(this).text().includes("(Barchart will appear here)"); }).remove();

    if (filteredGames.length > 0) {
      drawBarchart(filteredGames);
    }
  };

  updateBarchartDimensions();
  window.addEventListener('resize', updateBarchartDimensions);


  // Scatterplot D3 Setup Variables
  let margin = { top: 20, right: 20, bottom: 50, left: 50 };
  let svgWidth, svgHeight;
  let innerWidth, innerHeight;

  const updateSvgDimensions = () => {
      svgWidth = scatterplotContainer.node().clientWidth;
      svgHeight = scatterplotContainer.node().clientHeight;
      innerWidth = svgWidth - margin.left - margin.right;
      innerHeight = svgHeight - margin.top - margin.bottom;

      scatterplotSvg
          .attr("width", svgWidth)
          .attr("height", svgHeight)
          .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`);

      scatterplotGroup.attr("transform", `translate(${margin.left},${margin.top})`);

      if (filteredGames.length > 0) {
        drawScatterplot(filteredGames);
      }
  };

  updateSvgDimensions();
  window.addEventListener('resize', updateSvgDimensions);

  let xScale, yScale;
  let xAxisD3, yAxisD3;

  xAxisD3 = scatterplotGroup.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`);

  yAxisD3 = scatterplotGroup.append("g")
      .attr("class", "y-axis");

  const zoom = d3.zoom()
      .scaleExtent([0.5, 10])
      .translateExtent([[-svgWidth, -svgHeight], [2 * svgWidth, 2 * svgHeight]])
      .on("zoom", (event) => {
          scatterplotGroup.attr("transform", event.transform);
      });
  scatterplotSvg.call(zoom);

  resetZoomBtn.on("click", () => scatterplotSvg.transition().duration(750).call(zoom.transform, d3.zoomIdentity));
  zoomInBtn.on("click", () => scatterplotSvg.transition().call(zoom.scaleBy, 1.2));
  zoomOutBtn.on("click", () => scatterplotSvg.transition().call(zoom.scaleBy, 0.8));


  // Socket.IO Event Listeners
  socket.on('initial_game_data', (data) => {
    console.log('Received initial game data from server:', data.length, 'games');
    allGames = data;
    initializeFilterRanges(allGames);
    applyFiltersAndDisplayGames();
  });

  socket.on('kmeans_results', (clusterAssignments) => {
      console.log('Received K-Means results from server.');
      const assignmentMap = new Map(clusterAssignments.map(item => [item.id, item.cluster_id]));
      filteredGames.forEach(game => {
          game.cluster_id = assignmentMap.get(game.id);
      });
      drawScatterplot(filteredGames);
  });


  // Helper Functions

  const initializeFilterRanges = (gamesData) => {
    if (!gamesData || gamesData.length === 0) return;

    const minOverallPlayers = Math.min(...gamesData.map(game => game.minplayers).filter(val => typeof val === 'number'));
    const maxOverallPlayers = Math.max(...gamesData.map(game => game.maxplayers).filter(val => typeof val === 'number'));

    const minOverallTime = Math.min(...gamesData.map(game => game.minplaytime).filter(val => typeof val === 'number'));
    const maxOverallTime = Math.max(...gamesData.map(game => game.maxplaytime).filter(val => typeof val === 'number'));

    const validRatings = gamesData
        .filter(game => game.rating && typeof game.rating.rating === 'number')
        .map(game => game.rating.rating);
    const minOverallRating = validRatings.length > 0 ? Math.min(...validRatings) : 0;
    const maxOverallRating = validRatings.length > 0 ? Math.max(...validRatings) : 10;


    if (playerMinSlider && playerMaxSlider) {
      playerMinSlider.min = minOverallPlayers;
      playerMinSlider.max = maxOverallPlayers;
      playerMinSlider.value = minOverallPlayers;
      playerMaxSlider.min = minOverallPlayers;
      playerMaxSlider.max = maxOverallPlayers;
      playerMaxSlider.value = maxOverallPlayers;
      playerRangeValue.textContent = `${minOverallPlayers} - ${maxOverallPlayers}`;
    }

    if (timeMinSlider && timeMaxSlider) {
      timeMinSlider.min = minOverallTime;
      timeMinSlider.max = maxOverallTime;
      timeMinSlider.value = minOverallTime;
      timeMaxSlider.min = minOverallTime;
      timeMaxSlider.max = maxOverallTime;
      timeMaxSlider.value = maxOverallTime;
      timeRangeValue.textContent = `${minOverallTime} - ${maxOverallTime}`;
    }

    if (ratingSlider) {
      ratingSlider.min = minOverallRating;
      ratingSlider.max = maxOverallRating;
      ratingSlider.value = minOverallRating;
      ratingValue.textContent = `${minOverallRating.toFixed(1)}+`;
    }
  };

  const setupSingleSlider = (slider, valueSpan, suffix = '') => {
    if (slider && valueSpan) {
      slider.addEventListener('input', () => {
        valueSpan.textContent = slider.value + suffix;
        applyFiltersAndDisplayGames();
      });
    }
  };

  const setupDualRangeSlider = (minSlider, maxSlider, valueSpan, suffix = '') => {
    if (minSlider && maxSlider && valueSpan) {
      const updateRangeValue = () => {
        let minValue = parseInt(minSlider.value);
        let maxValue = parseInt(maxSlider.value);

        if (minValue > maxValue) {
          minSlider.value = maxValue;
          minValue = maxValue;
        }
        if (maxValue < minValue) {
          maxSlider.value = minValue;
          maxValue = minValue;
        }

        valueSpan.textContent = `${minValue} - ${maxValue}${suffix}`;
        applyFiltersAndDisplayGames();
      };

      minSlider.addEventListener('input', updateRangeValue);
      maxSlider.addEventListener('input', updateRangeValue);
    }
  };

  const applyFiltersAndDisplayGames = () => {
    let currentFilteredGames = [...allGames];

    const minRating = parseFloat(ratingSlider.value);
    currentFilteredGames = currentFilteredGames.filter(game =>
      game.rating && game.rating.rating >= minRating
    );

    const minPlayers = parseInt(playerMinSlider.value);
    const maxPlayers = parseInt(playerMaxSlider.value);
    currentFilteredGames = currentFilteredGames.filter(game => {
      return game.minplayers <= maxPlayers && game.maxplayers >= minPlayers;
    });

    const minTime = parseInt(timeMinSlider.value);
    const maxTime = parseInt(timeMaxSlider.value);
    currentFilteredGames = currentFilteredGames.filter(game => {
      return game.minplaytime <= maxTime && game.maxplaytime >= minTime;
    });

    currentFilteredGames.sort((a, b) => (a.rank || Infinity) - (b.rank || Infinity));

    const topXLimit = parseInt(topXSlider.value);
    filteredGames = currentFilteredGames.slice(0, topXLimit);

    const kValue = parseInt(kSlider.value);
    if (filteredGames.length > 0 && kValue > 1) {
        const gameIdsToCluster = filteredGames.map(game => game.id);
        socket.emit('request_kmeans_clustering', { gameIdsToCluster, kValue });
    } else {
        filteredGames.forEach(game => game.cluster_id = filteredGames.length > 0 ? 0 : -1);
        drawScatterplot(filteredGames);
    }

    populateGameList(filteredGames);
    drawBarchart(filteredGames);
  };

  const populateGameList = (gamesToDisplay) => {
    gameListItemsContainer.innerHTML = '';

    if (!gamesToDisplay || gamesToDisplay.length === 0) {
      gameListItemsContainer.innerHTML = '<li class="text-gray-500 p-1.5">No games found matching criteria.</li>';
      return;
    }

    gamesToDisplay.forEach((game) => {
      const listItem = document.createElement('li');
      listItem.className = 'p-1.5 rounded-md hover:bg-gray-50 cursor-pointer flex justify-between items-center';
      listItem.dataset.gameId = game.id;

      if (selectedGameIds.has(game.id)) {
        listItem.classList.add('selected-game-item');
      }

      const gameNameSpan = document.createElement('span');
      gameNameSpan.textContent = game.title;
      gameNameSpan.className = 'flex-grow truncate';

      const gameRatingSpan = document.createElement('span');
      gameRatingSpan.textContent = game.rating ? game.rating.rating.toFixed(2) : 'N/A';
      gameRatingSpan.className = 'ml-2 text-gray-500 text-xs bg-gray-200 px-2 py-0.5 rounded-full';

      listItem.appendChild(gameNameSpan);
      listItem.appendChild(gameRatingSpan);
      gameListItemsContainer.appendChild(listItem);

      listItem.addEventListener('click', () => {
          toggleGameSelection(game.id);
      });

      listItem.addEventListener('mouseenter', (event) => {
          currentHoveredGameId = game.id;
          highlightGame(game.id, 'hover');
          if (recommendationToggle.checked && game.recommendations && game.recommendations.fans_liked) {
              highlightRecommendations(game.id, game.recommendations.fans_liked);
          }
          highlightMechanicsInBarchart(game.types ? game.types.mechanics : []);
      });

      listItem.addEventListener('mouseleave', () => {
          currentHoveredGameId = null;
          unhighlightGame('hover');
          hideTooltip();
          if (recommendationToggle.checked) {
              unhighlightRecommendations();
          }
          unhighlightMechanicsInBarchart();
      });
    });
  };

  // Scatterplot Drawing
  const clusterColorScale = d3.scaleOrdinal(d3.schemeCategory10);
  const pagerankColorScale = d3.scaleLinear()
                               .domain([0, d3.max(allGames, d => d.pagerank_score) || 0.001])
                               .range(['#fed976', '#bd0026']);

  const drawScatterplot = (gamesToDisplay) => {
      scatterplotGroup.selectAll("text").filter(function() { return d3.select(this).text().includes("(No games found"); }).remove();

      const validProjections = gamesToDisplay.filter(d => d.lda_projection && d.lda_projection.length === 2 && !isNaN(d.lda_projection[0]) && !isNaN(d.lda_projection[1]));

      if (!validProjections || validProjections.length === 0) {
          scatterplotGroup.append("text")
              .attr("x", innerWidth / 2)
              .attr("y", innerHeight / 2)
              .attr("text-anchor", "middle")
              .attr("fill", "#d1d5db")
              .attr("font-size", "1.2rem")
              .text("(No games found or projection data missing)");
          return;
      }

      const xDomain = d3.extent(validProjections, d => d.lda_projection[0]);
      const yDomain = d3.extent(validProjections, d => d.lda_projection[1]);

      const xPadding = (xDomain[1] - xDomain[0]) * 0.2;
      const yPadding = (yDomain[1] - yDomain[0]) * 0.2;

      xScale = d3.scaleLinear().domain([xDomain[0] - xPadding, xDomain[1] + xPadding]).range([0, innerWidth]);
      yScale = d3.scaleLinear().domain([yDomain[0] - yPadding, yDomain[1] + yPadding]).range([innerHeight, 0]);

      const points = scatterplotGroup.selectAll(".point-group")
          .data(validProjections, d => d.id)
          .join(
              enter => enter.append("g")
                  .attr("class", "point-group cursor-pointer")
                  .attr("data-game-id", d => d.id)
                  .attr("transform", d => `translate(${xScale(d.lda_projection[0])},${yScale(d.lda_projection[1])})`)
                  .call(enter => enter.append("circle")
                      .attr("r", 5)
                      .attr("fill", d => clusterColorScale(d.cluster_id))
                      .attr("stroke", "gray")
                      .attr("stroke-width", 0.5)
                      .attr("opacity", 0.8)
                  ),
              update => update
                  .transition().duration(500)
                  .attr("transform", d => `translate(${xScale(d.lda_projection[0])},${yScale(d.lda_projection[1])})`)
                  .call(update => update.select("circle")
                      .attr("fill", d => clusterColorScale(d.cluster_id))
                  ),
              exit => exit.remove()
          );

      scatterplotGroup.selectAll(".point-group circle")
          .attr("class", d => d.is_top_10_pagerank ? 'top-pagerank' : '');

      // Scatterplot Point Interactivity
      points.on('click', (event, d) => {
          toggleGameSelection(d.id);
      });

      points.on('mouseenter', (event, d) => {
          currentHoveredGameId = d.id;
          highlightGame(d.id, 'hover');
          showTooltip(d, event);
          if (recommendationToggle.checked && d.recommendations && d.recommendations.fans_liked) {
              highlightRecommendations(d.id, d.recommendations.fans_liked);
          }
          highlightMechanicsInBarchart(d.types ? d.types.mechanics : []);
      });

      points.on('mouseleave', () => {
          currentHoveredGameId = null;
          unhighlightGame('hover');
          hideTooltip();
          if (recommendationToggle.checked) {
              unhighlightRecommendations();
          }
          unhighlightMechanicsInBarchart();
      });

      updateScatterplotSelectionStyles();
  };

  const updateScatterplotSelectionStyles = () => {
      scatterplotGroup.selectAll(".point-group circle")
          .attr("stroke-width", d => selectedGameIds.has(d.id) ? 2 : (d.is_top_10_pagerank ? 2 : 0.5))
          .attr("stroke", d => selectedGameIds.has(d.id) ? '#2563eb' : (d.is_top_10_pagerank ? '#ef4444' : 'gray'))
          .attr("r", d => selectedGameIds.has(d.id) ? 6 : 5);
  };

  const highlightGame = (gameId, type) => {
      const point = scatterplotGroup.selectAll(`.point-group[data-game-id="${gameId}"] circle`);
      if (!point.empty()) {
          point.classed('hovered-point', type === 'hover');
          if (!selectedGameIds.has(gameId) && !point.classed('recommended-point') && !point.classed('top-pagerank')) {
              point.attr("r", 7)
                   .attr("stroke-width", 2)
                   .attr("stroke", '#f59e0b');
          }
      }

      const listItem = document.querySelector(`#game-list-items li[data-game-id="${gameId}"]`);
      if (listItem) {
          listItem.classList.add('highlighted-list-item');
          if (type === 'hover') listItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
  };

  const unhighlightGame = (type) => {
      scatterplotGroup.selectAll(".point-group circle")
          .classed('hovered-point', false)
          .attr("r", d => selectedGameIds.has(d.id) ? 6 : 5)
          .attr("stroke-width", d => selectedGameIds.has(d.id) ? 2 : (d.is_top_10_pagerank ? 2 : 0.5))
          .attr("stroke", d => selectedGameIds.has(d.id) ? '#2563eb' : (d.is_top_10_pagerank ? '#ef4444' : 'gray'));

      document.querySelectorAll('#game-list-items li.highlighted-list-item').forEach(item => {
          if (!selectedGameIds.has(parseInt(item.dataset.gameId))) {
             item.classList.remove('highlighted-list-item');
          }
      });
  };

  const highlightRecommendations = (sourceGameId, recommendedIds) => {
      unhighlightRecommendations();

      recommendedIds.forEach(recId => {
          const game = allGames.find(g => g.id === recId);
          if (game && !selectedGameIds.has(recId)) {
              const point = scatterplotGroup.selectAll(`.point-group[data-game-id="${recId}"] circle`);
              if (!point.empty()) {
                  point.classed('recommended-point', true)
                       .attr("stroke", pagerankColorScale(game.pagerank_score))
                       .attr("stroke-width", 2 + (game.pagerank_score * 500))
                       .attr("stroke-dasharray", "3 2");
              }

              const listItem = document.querySelector(`#game-list-items li[data-game-id="${recId}"]`);
              if (listItem && !selectedGameIds.has(recId)) {
                  listItem.classList.add('recommended-list-item');
              }
          }
      });
  };

  const unhighlightRecommendations = () => {
      scatterplotGroup.selectAll(".recommended-point")
          .classed('recommended-point', false)
          .attr("stroke-dasharray", "none")
          .attr("stroke", d => selectedGameIds.has(d.id) ? '#2563eb' : (d.is_top_10_pagerank ? '#ef4444' : 'gray'))
          .attr("stroke-width", d => selectedGameIds.has(d.id) ? 2 : (d.is_top_10_pagerank ? 2 : 0.5));

      document.querySelectorAll('.recommended-list-item').forEach(item => {
          if (!selectedGameIds.has(parseInt(item.dataset.gameId))) {
              item.classList.remove('recommended-list-item');
          }
      });
  };

  const showTooltip = (game, event) => {
      const tooltipHTML = `
          <div class="font-bold text-base">${game.title}</div>
          <div>Rating: ${game.rating ? game.rating.rating.toFixed(2) : 'N/A'}</div>
          <div>Players: ${game.minplayers}-${game.maxplayers}</div>
          <div>Time: ${game.minplaytime}-${game.maxplaytime} min</div>
          <div>Cluster: ${game.cluster_id !== undefined && game.cluster_id !== -1 ? game.cluster_id : 'N/A'}</div>
          <div>PageRank: ${game.pagerank_score !== undefined ? game.pagerank_score.toFixed(4) : 'N/A'}</div>
          ${game.is_top_10_pagerank ? '<div class="text-red-500 font-bold mt-1">Top 10 PageRank!</div>' : ''}
      `;
      tooltip.html(tooltipHTML)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px")
      .transition()
      .duration(200)
      .style("opacity", 0.9);
  };

  const hideTooltip = () => {
      tooltip.transition()
             .duration(500)
             .style("opacity", 0);
  };

  const toggleGameSelection = (gameId) => {
      if (selectedGameIds.has(gameId)) {
          selectedGameIds.delete(gameId);
      } else {
          if (selectedGameIds.size >= MAX_SELECTED_GAMES) {
              const oldestId = selectedGameIds.values().next().value;
              selectedGameIds.delete(oldestId);
          }
          selectedGameIds.add(gameId);
      }
      populateGameList(filteredGames);
      updateScatterplotSelectionStyles();

      if (recommendationToggle.checked && selectedGameIds.size > 0) {
          const latestSelectedGameId = Array.from(selectedGameIds).pop();
          const latestSelectedGame = allGames.find(g => g.id === latestSelectedGameId);
          if (latestSelectedGame) {
              highlightRecommendations(latestSelectedGame.id, latestSelectedGame.recommendations ? latestSelectedGame.recommendations.fans_liked : []);
          }
      } else if (recommendationToggle.checked && selectedGameIds.size === 0) {
          unhighlightRecommendations();
      }

      if (currentHoveredGameId) {
          highlightGame(currentHoveredGameId, 'hover');
      }
      // Re-evaluate barchart highlights based on new selection
      if (selectedGameIds.size > 0) {
        const allSelectedMechanics = new Set();
        selectedGameIds.forEach(id => {
            const game = allGames.find(g => g.id === id);
            if (game && game.types && game.types.mechanics) {
                game.types.mechanics.forEach(mech => allSelectedMechanics.add(mech));
            }
        });
        highlightMechanicsInBarchart(Array.from(allSelectedMechanics));
      } else {
        unhighlightMechanicsInBarchart();
      }
  };

  // Barchart Functions

  const getMechanicCounts = (games) => {
    const mechanicCounts = {};
    games.forEach(game => {
      if (game.types && game.types.mechanics) {
        game.types.mechanics.forEach(mechanic => {
          mechanicCounts[mechanic.name] = (mechanicCounts[mechanic.name] || 0) + 1;
        });
      }
    });
    return Object.entries(mechanicCounts)
                 .map(([name, count]) => ({ name, count }))
                 .sort((a, b) => b.count - a.count);
  };

  const drawBarchart = (gamesToDisplay) => {
    mechanicBarchartSvg.selectAll("g").remove();

    const mechanicData = getMechanicCounts(gamesToDisplay);

    if (!mechanicData || mechanicData.length === 0) {
      mechanicBarchartSvg.append("text")
          .attr("x", barchartWidth / 2)
          .attr("y", barchartHeight / 2)
          .attr("text-anchor", "middle")
          .attr("fill", "#d1d5db")
          .attr("font-size", "0.9rem")
          .text("(No mechanics found for filtered games)");
      return;
    }

    const maxBars = 10;
    const displayMechanics = mechanicData.slice(0, maxBars);

    barchartXScale = d3.scaleLinear()
      .domain([0, d3.max(displayMechanics, d => d.count) || 1])
      .range([0, barchartInnerWidth]);

    barchartYScale = d3.scaleBand()
      .domain(displayMechanics.map(d => d.name))
      .range([0, barchartInnerHeight])
      .paddingInner(0.1);

    const bars = mechanicBarchartSvg.append("g")
      .attr("transform", `translate(${barchartMargin.left}, ${barchartMargin.top})`)
      .selectAll(".bar-group")
      .data(displayMechanics, d => d.name)
      .join(
        enter => enter.append("g")
          .attr("class", "bar-group")
          .attr("data-mechanic-name", d => d.name)
          .attr("transform", d => `translate(0, ${barchartYScale(d.name)})`),
        update => update
          .transition().duration(500)
          .attr("transform", d => `translate(0, ${barchartYScale(d.name)})`),
        exit => exit.remove()
      );

    bars.selectAll("rect").remove();
    bars.append("rect")
      .attr("x", 0)
      .attr("height", barchartYScale.bandwidth())
      // Changed to a lighter, more subtle blue
      .attr("fill", "#60a5fa") // Tailwind blue-400 (previously blue-500)
      .transition().duration(500)
      .attr("width", d => barchartXScale(d.count));

    bars.selectAll("text").remove();
    bars.append("text")
      .attr("x", 5) // Small padding from the left of the bar
      .attr("y", barchartYScale.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "start")
      .attr("fill", "#f9fafb") // text-gray-50 for contrast on dark bars
      .attr("font-size", "0.7rem")
      .text(d => `${d.name} (${d.count})`);
  };

  const highlightMechanicsInBarchart = (mechanicsArray) => {
    unhighlightMechanicsInBarchart();

    const mechanicNamesToHighlight = new Set(mechanicsArray.map(m => m.name));

    mechanicNamesToHighlight.forEach(name => {
      mechanicBarchartSvg.selectAll(`.bar-group[data-mechanic-name="${name}"] rect`)
        .classed('highlighted-bar', true);
    });
  };

  const unhighlightMechanicsInBarchart = () => {
    mechanicBarchartSvg.selectAll(".bar-group rect.highlighted-bar")
      .classed('highlighted-bar', false);
  };


  // Initial Setup Calls
  document.querySelectorAll('.panel-toggle').forEach(button => {
    button.addEventListener('click', () => {
      const panel = button.closest('.panel-container');
      if (panel) {
        panel.classList.toggle('collapsed');
      }
    });
  });

  setupSingleSlider(topXSlider, topXValue, '');
  setupSingleSlider(ratingSlider, ratingValue, '+');
  setupSingleSlider(ldaSlider, ldaValue, '');
  setupSingleSlider(kSlider, kValue, '');
  setupDualRangeSlider(playerMinSlider, playerMaxSlider, playerRangeValue, '');
  setupDualRangeSlider(timeMinSlider, timeMaxSlider, timeRangeValue, '');

  recommendationToggle.addEventListener('change', () => {
      if (!recommendationToggle.checked) {
          unhighlightRecommendations();
      } else {
          if (currentHoveredGameId) {
              const game = allGames.find(g => g.id === currentHoveredGameId);
              if (game) highlightRecommendations(game.id, game.recommendations ? game.recommendations.fans_liked : []);
          } else if (selectedGameIds.size > 0) {
              const latestSelectedGame = allGames.find(g => g.id === Array.from(selectedGameIds).pop());
              if (latestSelectedGame) highlightRecommendations(latestSelectedGame.id, latestSelectedGame.recommendations ? latestSelectedGame.recommendations.fans_liked : []);
          }
      }
  });
});
