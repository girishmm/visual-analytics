/**
 * Helper function to preprocess the data
 */

/**
 * # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
 *
 * !!!!! Here an below, you can/should edit the code  !!!!!
 * - you can modify the data preprocessing functions
 * - you can add other data preprocessing functions for other functionalities
 *
 * # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
 */

/**
 * My CODE STARTS
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

/**
 * My CODE ENDS and TEMPLATE starts
 */

// /**
//  * Returns boolean value, whether given row meets parameter conditions
//  * @param {*} parameters
//  * @param {*} row
//  * @returns boolean
//  */
// export function is_below_max_weight(parameters, row) {
//   return row.weight < parameters.max_weight
// }

// /**
//  * Calculates the bmi for a specific person
//  * @param {age, height, name, weight} person
//  * @returns {age, bmi, height, name, weight}
//  */
// export function calc_bmi(person) {
//   person.bmi = person.weight / ((person.height / 100) * (person.height / 100))
//   return person
// }

// /**
//  * Converts all attribute values to float, than can be converted
//  * @param {*} obj
//  * @returns {*}
//  */
// export function parse_numbers(obj) {
//   for (const key in obj) {
//     if (obj.hasOwnProperty(key)) {
//       if (!isNaN(obj[key])) {
//         obj[key] = parseFloat(obj[key])
//       }
//     }
//   }
//   return obj
// }

// /**
//  * Test add function to demonstrate testing with jest in file preprocessing.test.js
//  *
//  * Adds the input numbers
//  * @param {number} a
//  * @param {number} b
//  * @returns number
//  */
// export function test_func_add(a, b) {
//   return a + b
// }
