import { configs } from './static/configs.js';
import * as preprocessing from '../_server/preprocessing.js';

let allGames = [];

export const initWebSocket = async (io) => {
    try {
        await preprocessing.loadGamesData();
        allGames = preprocessing.getAllGames();
        console.log('WebSocket module: Server is ready with preprocessed data.');

        io.on("connection", (socket) => {
            console.log("Client connected: " + socket.id);

            socket.emit('initial_game_data', allGames);

            socket.on('request_kmeans_clustering', (data) => {
                const { gameIdsToCluster, kValue } = data;
                const gamesSubset = allGames.filter(game => gameIdsToCluster.includes(game.id));
                const kmeansResults = preprocessing.performKMeans(gamesSubset, kValue);
                socket.emit('kmeans_results', kmeansResults);
            });

            socket.on("disconnect", () => {
                console.log("Client disconnected: " + socket.id);
            });
        });

    } catch (error) {
        console.error("WebSocket module: Failed to load initial game data and set up listeners:", error);
    }
};
