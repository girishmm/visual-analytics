/**
 * Helper function to preprocess the data
 */

/**
 * # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
 *
 * !!!!! Here an below, you can/should edit the code  !!!!!
 * - you can modify the data preprocessing functions
 * - you can add other data preprocessing functions for other functionalities
 *
 * # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
 */
/**
 * Returns boolean value, whether given row meets parameter conditions
 * @param {*} parameters
 * @param {*} row
 * @returns boolean
 */
export function is_below_max_weight(parameters, row) {
  return row.weight < parameters.max_weight
}
/**
 * Calculates the bmi for a specific person
 * @param {age, height, name, weight} person
 * @returns {age, bmi, height, name, weight}
 */
export function calc_bmi(person) {
  person.bmi = person.weight / ((person.height / 100) * (person.height / 100))
  return person
}
/**
 * Converts all attribute values to float, than can be converted
 * @param {*} obj
 * @returns {*}
 */
export function parse_numbers(obj) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (!isNaN(obj[key])) {
        obj[key] = parseFloat(obj[key])
      }
    }
  }
  return obj
}
/**
 * Test add function to demonstrate testing with jest in file preprocessing.test.js
 *
 * Adds the input numbers
 * @param {number} a 
 * @param {number} b
 * @returns number
 */
export function test_func_add(a, b) {
  return a + b
}