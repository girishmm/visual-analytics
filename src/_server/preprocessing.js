/**
 * Helper function to preprocess the data
 */

/**
 * Computes average user rating per mechanic.
 * Input: array of board game objects with 'mechanics' and 'average_user_rating'
 * Output: array of { mechanic: string, avg_rating: number }
 */
export function get_average_ratings_by_mechanic(games) {
  const mechanicMap = {}

  games.forEach(game => {
    if (!game.types || !Array.isArray(game.types.mechanics)) return

    const mechanics = game.types.mechanics.map(m => m.name)
    const avgRating = game.rating && game.rating.rating ? game.rating.rating : 0

    mechanics.forEach(mechanic => {
      if (!mechanicMap[mechanic]) {
        mechanicMap[mechanic] = { total: 0, count: 0 }
      }
      mechanicMap[mechanic].total += avgRating
      mechanicMap[mechanic].count += 1
    })
  })

  const result = Object.entries(mechanicMap).map(([mechanic, stats]) => ({
    mechanic,
    avg_rating: stats.count > 0 ? stats.total / stats.count : 0,
  }))

  console.log("Computed average ratings by mechanic:", result)
  return result
}

export function encodeMechanicsLDA(data) {
  const minReviews = 500;
  const mechanicsSet = new Set();

  // Collect all unique mechanic names
  data.forEach(game => {
    if (game.rating?.num_of_reviews >= minReviews) {
      game.types?.mechanics?.forEach(m => mechanicsSet.add(m.name));
    }
  });

  const mechanicsList = Array.from(mechanicsSet);

  const encoded = [];

  data.forEach(game => {
    if (game.rating?.num_of_reviews >= minReviews) {
      const vec = new Array(mechanicsList.length).fill(0);
      const gameMechanics = game.types?.mechanics?.map(m => m.name) || [];
      gameMechanics.forEach(m => {
        const idx = mechanicsList.indexOf(m);
        if (idx !== -1) vec[idx] = 1;
      });

      const rating = game.rating.rating;
      const label = rating >= 8.5 ? "High" : rating >= 8 ? "Medium" : "Low";

      encoded.push({
        title: game.title,
        rating,
        label,
        vector: vec,
      });
    }
  });

  return { encoded, mechanicsList };
}
