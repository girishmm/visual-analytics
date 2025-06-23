import { print_clientConnected, print_clientDisconnected } from "./static/utils.js"
import { getAllGames, performKMeans } from './preprocessing.js';

export function setupConnection(socket) {
  print_clientConnected(socket.id);

  // Emit the initial board games data
  socket.emit('initial_game_data', getAllGames());

  // Handle K-Means clustering request
  socket.on('request_kmeans_clustering', ({ gameIdsToCluster, kValue }) => {
    console.log(`K-Means request for ${gameIdsToCluster.length} games with K=${kValue}.`);

    // Retrieve the actual game objects based on IDs
    const gamesToCluster = getAllGames().filter(game => gameIdsToCluster.includes(game.id));

    // Perform K-Means on the subset
    const clusterAssignments = performKMeans(gamesToCluster, kValue);

    // Send back the cluster assignments for the filtered games
    socket.emit('kmeans_results', clusterAssignments);
  });

  socket.on("disconnect", () => {
    print_clientDisconnected(socket.id);
  });
}
