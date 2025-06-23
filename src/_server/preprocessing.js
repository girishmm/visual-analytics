import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PCA } from 'ml-pca'; // Correctly imported PCA class
import * as d3 from 'd3'; // Used for internal normalization (d3.extent, d3.scaleLinear)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let allGamesData = [];
let uniqueMechanics = new Set();
let gameMechanicMatrix = [];

export const loadGamesData = () => {
    try {
        const dataPath = path.resolve(__dirname, '../../data/boardgames_100.json');
        const data = fs.readFileSync(dataPath, 'utf8');
        allGamesData = JSON.parse(data);
        console.log(`Successfully loaded ${allGamesData.length} games from ${dataPath}`);

        extractUniqueMechanicsAndBuildMatrix();
        projectMechanicsTo2D(); // PCA for 2D projection
        calculatePageRank(); // PageRank for recommendations

        console.log('Finished initial server-side data preprocessing (PCA, PageRank).');

    } catch (error) {
        console.error("Error loading or preprocessing board games data:", error);
        allGamesData = [];
    }
};

const extractUniqueMechanicsAndBuildMatrix = () => {
    allGamesData.forEach(game => {
        if (game.types && game.types.mechanics) {
            game.types.mechanics.forEach(mechanic => {
                uniqueMechanics.add(mechanic.name);
            });
        }
    });
    uniqueMechanics = Array.from(uniqueMechanics).sort();

    gameMechanicMatrix = allGamesData.map(game => {
        const row = Array(uniqueMechanics.length).fill(0);
        if (game.types && game.types.mechanics) {
            game.types.mechanics.forEach(mechanic => {
                const index = uniqueMechanics.indexOf(mechanic.name);
                if (index !== -1) {
                    row[index] = 1;
                }
            });
        }
        return row;
    });
};

const projectMechanicsTo2D = () => {
    if (gameMechanicMatrix.length < 2 || uniqueMechanics.length < 2) {
        console.warn("Not enough data points or features for PCA. Defaulting projection to [0,0].");
        allGamesData.forEach(game => game.lda_projection = [0, 0]);
        return;
    }

    try {
        const pca = new PCA(gameMechanicMatrix, {
            scale: true,
            center: true,
        });

        // *** FIX: Use pca.predict() to get the transformed data ***
        const principalComponents = pca.predict(gameMechanicMatrix, { nComponents: 2 });

        allGamesData.forEach((game, index) => {
            game.lda_projection = principalComponents[index] || [0, 0];
        });

        // Normalize the projection values to a standard range (-1 to 1)
        const xExtent = d3.extent(allGamesData, d => d.lda_projection[0]);
        const yExtent = d3.extent(allGamesData, d => d.lda_projection[1]);

        if (xExtent[0] !== undefined && xExtent[1] !== undefined && yExtent[0] !== undefined && yExtent[1] !== undefined) {
            const scaleX = d3.scaleLinear().domain(xExtent).range([-1, 1]);
            const scaleY = d3.scaleLinear().domain(yExtent).range([-1, 1]);
            allGamesData.forEach(game => {
                game.lda_projection[0] = scaleX(game.lda_projection[0]);
                game.lda_projection[1] = scaleY(game.lda_projection[1]);
            });
        }

    } catch (e) {
        console.error("Error during PCA calculation. Ensure 'ml-pca' is installed and data is valid. Defaulting projections to [0,0].", e);
        allGamesData.forEach(game => game.lda_projection = [0, 0]);
    }
};

export const performKMeans = (gamesSubset, k) => {
    if (!gamesSubset || gamesSubset.length === 0 || k < 2) {
        return gamesSubset.map(game => ({ id: game.id, cluster_id: -1 }));
    }

    const dataPoints = gamesSubset.map(game => ({
        id: game.id,
        point: game.lda_projection
    })).filter(dp => dp.point && dp.point.length === 2 && !isNaN(dp.point[0]) && !isNaN(dp.point[1]));

    if (dataPoints.length === 0) {
        return gamesSubset.map(game => ({ id: game.id, cluster_id: -1 }));
    }

    const actualK = Math.min(k, dataPoints.length);

    let centroids = [];
    const shuffledPoints = [...dataPoints].sort(() => 0.5 - Math.random());
    for (let i = 0; i < actualK; i++) {
        centroids.push([...shuffledPoints[i].point]);
    }

    const maxIterations = 100;
    const epsilon = 1e-4;

    let assignments = new Map();

    for (let iter = 0; iter < maxIterations; iter++) {
        let prevAssignments = new Map(assignments);
        let clusters = Array.from({ length: actualK }, () => []);

        dataPoints.forEach(dp => {
            const point = dp.point;
            let minDistance = Infinity;
            let newAssignment = -1;

            for (let i = 0; i < actualK; i++) {
                const centroid = centroids[i];
                const dist = Math.sqrt(Math.pow(point[0] - centroid[0], 2) + Math.pow(point[1] - centroid[1], 2));
                if (dist < minDistance) {
                    minDistance = dist;
                    newAssignment = i;
                }
            }
            assignments.set(dp.id, newAssignment);
            if (newAssignment !== -1) {
                clusters[newAssignment].push(point);
            }
        });

        let assignmentsChanged = false;
        for (const [id, newCluster] of assignments) {
            if (prevAssignments.get(id) !== newCluster) {
                assignmentsChanged = true;
                break;
            }
        }

        for (let i = 0; i < actualK; i++) {
            if (clusters[i].length > 0) {
                const sumX = clusters[i].reduce((sum, p) => sum + p[0], 0);
                const sumY = clusters[i].reduce((sum, p) => sum + p[1], 0);
                centroids[i] = [sumX / clusters[i].length, sumY / clusters[i].length];
            } else {
                centroids[i] = [...dataPoints[Math.floor(Math.random() * dataPoints.length)].point];
            }
        }

        if (!assignmentsChanged) {
            break;
        }
    }

    const result = [];
    gamesSubset.forEach(game => {
        result.push({
            id: game.id,
            cluster_id: assignments.get(game.id) !== undefined ? assignments.get(game.id) : -1
        });
    });
    return result;
};


const calculatePageRank = () => {
    if (allGamesData.length === 0) return;

    const dampingFactor = 0.85;
    const iterations = 50;
    const epsilon = 1e-7;

    const gameIdToIndex = new Map(allGamesData.map((game, index) => [game.id, index]));
    const numGames = allGamesData.length;

    const outLinks = new Array(numGames).fill(0).map(() => []);

    allGamesData.forEach((game, i) => {
        if (game.recommendations && game.recommendations.fans_liked) {
            game.recommendations.fans_liked.forEach(recommendedId => {
                const j = gameIdToIndex.get(recommendedId);
                if (j !== undefined) {
                    outLinks[i].push(j);
                }
            });
        }
    });

    let ranks = new Array(numGames).fill(1 / numGames);
    let prevRanks = new Array(numGames).fill(0);

    for (let iter = 0; iter < iterations; iter++) {
        prevRanks = [...ranks];
        let danglingSum = 0;

        for (let i = 0; i < numGames; i++) {
            if (outLinks[i].length === 0) {
                danglingSum += prevRanks[i];
            }
        }

        for (let i = 0; i < numGames; i++) {
            let sumInboundRanks = 0;
            for (let j = 0; j < numGames; j++) {
                if (outLinks[j].includes(i)) {
                    if (outLinks[j].length > 0) {
                        sumInboundRanks += prevRanks[j] / outLinks[j].length;
                    }
                }
            }

            ranks[i] = (1 - dampingFactor) / numGames +
                       dampingFactor * (sumInboundRanks + danglingSum / numGames);
        }

        const diff = ranks.reduce((sum, rank, i) => sum + Math.abs(rank - prevRanks[i]), 0);
        if (diff < epsilon) {
            break;
        }
    }

    const rankedGames = allGamesData.map((game, index) => ({
        id: game.id,
        score: ranks[index]
    })).sort((a, b) => b.score - a.score);

    const top10Ids = new Set(rankedGames.slice(0, 10).map(game => game.id));

    allGamesData.forEach((game, index) => {
        game.pagerank_score = ranks[index] || 0;
        game.is_top_10_pagerank = top10Ids.has(game.id);
    });
};

export const getAllGames = () => {
    return allGamesData;
};

loadGamesData();
