import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PCA } from 'ml-pca';
import * as d3 from 'd3';
import pagerank from 'pagerank.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let allGamesData = [];
let uniqueMechanics;
let gameMechanicMatrix = [];

export const loadGamesData = async () => {
    try {
        const dataPath = path.resolve(__dirname, '../../data/boardgames.json');
        const data = fs.readFileSync(dataPath, 'utf8');
        allGamesData = JSON.parse(data);
        console.log(`Successfully loaded ${allGamesData.length} games from ${dataPath}`);

        extractUniqueMechanicsAndBuildMatrix();
        projectMechanicsTo2D();
        await calculatePageRank();

        console.log('Finished initial server-side data preprocessing (PCA, PageRank).');

    } catch (error) {
        console.error("Error loading or preprocessing board games data:", error);
        allGamesData = [];
    }
};

const extractUniqueMechanicsAndBuildMatrix = () => {
    uniqueMechanics = new Set();
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

        const principalComponents = pca.predict(gameMechanicMatrix, { nComponents: 2 }).to2DArray();

        allGamesData.forEach((game, index) => {
            game.lda_projection = principalComponents[index] || [0, 0];
        });

        const xExtent = d3.extent(allGamesData, d => d.lda_projection[0]);
        const yExtent = d3.extent(allGamesData, d => d.lda_projection[1]);

        if (xExtent[0] !== undefined && xExtent[1] !== undefined && yExtent[0] !== undefined && yExtent[1] !== undefined && (xExtent[1] !== xExtent[0] || yExtent[1] !== yExtent[0])) {
            const scaleX = d3.scaleLinear().domain(xExtent).range([-1, 1]);
            const scaleY = d3.scaleLinear().domain(yExtent).range([-1, 1]);
            allGamesData.forEach(game => {
                game.lda_projection[0] = scaleX(game.lda_projection[0]);
                game.lda_projection[1] = scaleY(game.lda_projection[1]);
            });
        } else {
            console.warn("PCA output has no variance or invalid extent, skipping normalization and defaulting to [0,0].");
            allGamesData.forEach(game => game.lda_projection = [0, 0]);
        }


    } catch (e) {
        console.error("Error during PCA calculation. Ensure 'ml-pca' is installed and data is valid. Defaulting projections to [0,0].", e);
        allGamesData.forEach(game => game.lda_projection = [0, 0]);
    }
};

const calculatePageRank = async () => {
    if (allGamesData.length === 0) {
        console.warn("No game data available for PageRank calculation.");
        return;
    }

    pagerank.reset();

    const allNodeIdsInGraph = new Set();

    allGamesData.forEach(game => {
        allNodeIdsInGraph.add(game.id);

        if (game.recommendations && game.recommendations.fans_liked) {
            game.recommendations.fans_liked.forEach(recommendedId => {
                if (allGamesData.some(g => g.id === recommendedId)) {
                    pagerank.link(game.id, recommendedId, 1.0);
                    allNodeIdsInGraph.add(recommendedId);
                }
            });
        }
    });

    const totalNodesExpected = allNodeIdsInGraph.size;

    if (totalNodesExpected === 0) {
        console.warn("No valid nodes found for PageRank calculation. All scores will be 0.");
        allGamesData.forEach(game => game.pagerank_score = 0);
        return;
    }

    const dampingFactor = 0.85;
    const epsilon = 1e-7;

    const pagerankResults = await new Promise((resolve) => {
        let pagerankResultsAcc = {};
        let nodesProcessedInCallback = 0;

        if (totalNodesExpected === 0) {
            resolve({});
            return;
        }

        pagerank.rank(dampingFactor, epsilon, (node, rank) => {
            pagerankResultsAcc[node] = rank;
            nodesProcessedInCallback++;

            if (nodesProcessedInCallback === totalNodesExpected) {
                resolve(pagerankResultsAcc);
            }
        });

        setTimeout(() => {
            if (nodesProcessedInCallback < totalNodesExpected) {
                console.warn(`Pagerank.js did not process all ${totalNodesExpected} nodes within timeout (${nodesProcessedInCallback} processed). Resolving with partial results.`);
                allNodeIdsInGraph.forEach(id => {
                    if (pagerankResultsAcc[id] === undefined) {
                        pagerankResultsAcc[id] = 0;
                    }
                });
                resolve(pagerankResultsAcc);
            }
        }, 3000);
    });

    const pagerankMap = new Map(Object.entries(pagerankResults).map(([id, score]) => [parseInt(id), score]));

    allGamesData.forEach(game => {
        game.pagerank_score = pagerankMap.get(game.id) || 0;
    });
};

export const getAllGames = () => {
    return allGamesData;
};

const euclideanDistance = (point1, point2) => {
    return Math.sqrt(Math.pow(point1[0] - point2[0], 2) + Math.pow(point1[1] - point2[1], 2));
};

export const performKMeans = (gamesSubset, kValue) => {
    if (!gamesSubset || gamesSubset.length === 0) {
        return { clusters: [], centroids: [] };
    }

    const dataForKMeans = gamesSubset.map(game => game.lda_projection);
    const maxIterations = 300;
    const tolerance = 1e-4;

    const effectiveK = Math.max(1, Math.min(kValue, dataForKMeans.length));

    if (effectiveK <= 1) {
        const centroid = dataForKMeans.reduce((acc, val) => [acc[0] + val[0], acc[1] + val[1]], [0,0]);
        centroid[0] /= dataForKMeans.length;
        centroid[1] /= dataForKMeans.length;
        const clusters = gamesSubset.map(game => ({ id: game.id, cluster: 0 }));
        return { clusters, centroids: [centroid] };
    }

    let centroids = [];
    const dataIndices = Array.from({ length: dataForKMeans.length }, (_, i) => i);
    for (let i = dataIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dataIndices[i], dataIndices[j]] = [dataIndices[j], dataIndices[i]];
    }
    for (let i = 0; i < effectiveK; i++) {
        centroids.push([...dataForKMeans[dataIndices[i]]]);
    }

    let assignments = new Array(dataForKMeans.length).fill(-1);
    let iteration = 0;
    let centroidsChanged = true;

    while (iteration < maxIterations && centroidsChanged) {
        centroidsChanged = false;

        const newAssignments = new Array(dataForKMeans.length);
        for (let i = 0; i < dataForKMeans.length; i++) {
            const point = dataForKMeans[i];
            let minDistance = Infinity;
            let closestCentroidIndex = -1;

            for (let j = 0; j < effectiveK; j++) {
                const distance = euclideanDistance(point, centroids[j]);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCentroidIndex = j;
                }
            }
            newAssignments[i] = closestCentroidIndex;

            if (newAssignments[i] !== assignments[i]) {
                centroidsChanged = true;
            }
        }
        assignments = newAssignments;

        const newCentroids = Array(effectiveK).fill(null).map(() => [0, 0]);
        const clusterCounts = Array(effectiveK).fill(0);

        for (let i = 0; i < dataForKMeans.length; i++) {
            const clusterIndex = assignments[i];
            newCentroids[clusterIndex][0] += dataForKMeans[i][0];
            newCentroids[clusterIndex][1] += dataForKMeans[i][1];
            clusterCounts[clusterIndex]++;
        }

        let totalCentroidShift = 0;
        for (let j = 0; j < effectiveK; j++) {
            if (clusterCounts[j] > 0) {
                newCentroids[j][0] /= clusterCounts[j];
                newCentroids[j][1] /= clusterCounts[j];
            } else {
                newCentroids[j] = [...centroids[j]];
            }
            totalCentroidShift += euclideanDistance(centroids[j], newCentroids[j]);
        }

        if (totalCentroidShift < tolerance) {
            centroidsChanged = false;
        }

        centroids = newCentroids;
        iteration++;
    }

    const clusterAssignments = gamesSubset.map((game, index) => ({
        id: game.id,
        cluster: assignments[index]
    }));

    return { clusters: clusterAssignments, centroids: centroids };
};

loadGamesData();
