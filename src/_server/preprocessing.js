import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to get __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let allGamesData = [];

/**
 * Loads the board games data from a JSON file.
 * This function should be called once when the server starts.
 */
export const loadGamesData = () => {
    try {
        // Resolve the path to the boardgames100.json file
        // Assumes data/boardgames100.json is at the project root relative to src/_server
        const dataPath = path.resolve(__dirname, '../../data/boardgames_100.json');
        const data = fs.readFileSync(dataPath, 'utf8');
        allGamesData = JSON.parse(data);
        console.log(`Successfully loaded ${allGamesData.length} games from ${dataPath}`);
    } catch (error) {
        console.error("Error loading board games data:", error);
        allGamesData = []; // Ensure data is empty if loading fails
    }
};

/**
 * Returns the currently loaded all games data.
 * @returns {Array} An array of game objects.
 */
export const getAllGames = () => {
    return allGamesData;
};

// Initial data load when this module is imported (e.g., when server starts)
loadGamesData();
