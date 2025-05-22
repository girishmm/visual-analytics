//import * as csv from "csv-parser"

import { parse } from "csv-parse";
import * as fs from "fs"
import { print_clientConnected, print_clientDisconnected } from "./static/utils.js"
// const preprocessing = require("./preprocessing.js")
// import { is_below_max_weight, parse_numbers, calc_bmi } from "./preprocessing.js"
import { getExampleLDA } from "./druidExample.js";

/**
 * My CODE STARTS
 */

import { get_average_ratings_by_mechanic } from "./preprocessing.js"
import { computeLDAProjection } from "./lda.js";

const file_path = "data/"
const file_name = "boardgames_100.json"

/**
 * My CODE ENDS and TEMPLATE continues
 */


// const file_path = "data/"
// const file_name = "example_data.csv"

/**
 * Does some console.logs when a client connected.
 * Also sets up the listener, if the client disconnects.
 * @param {*} socket
 */
export function setupConnection(socket) {
  print_clientConnected(socket.id)

  /**
   * Listener that is called, if client disconnects.
   */
  socket.on("disconnect", () => {
    print_clientDisconnected(socket.id)
  })

  /**
   * # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
   *
   * !!!!! Here an below, you can/should edit the code  !!!!!
   * - you can modify the getData listener
   * - you can add other listeners for other functionalities
   *
   * # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
   */


  // module.exports = { setupWebSocket };
  //  export { setupWebSocket };

  /**
   * My LISTENER STARTS
   */

  /**
   * Listener to send mechanic rating averages to the client
   */
  socket.on("getAverageRatingsByMechanic", () => {
    console.log("Client requested average ratings by mechanic")

    const filepath = "data/boardgames_100.json"
    const fileContent = fs.readFileSync(filepath)
    const boardgames = JSON.parse(fileContent)

    const result = get_average_ratings_by_mechanic(boardgames)

    console.log("Mechanic ratings data:", result);
    socket.emit("averageRatingsByMechanic", {
      timestamp: new Date().getTime(),
      data: result,
    })
    console.log("Server emitted average ratings by mechanic")
  })

  socket.on("requestLDAProjection", async ({ targetDim }) => {
    console.log("Client requested LDA reduction")

    const filepath = "data/boardgames_100.json"
    const fileContent = fs.readFileSync(filepath)
    const boardgames = JSON.parse(fileContent)

    const projection = computeLDAProjection(boardgames, targetDim);
    socket.emit("ldaProjectionResult", projection);
    console.log("Server emitted LDA reduction")
  });


  // /**
  //  * My LISTENER ENDS and Template continues
  //  */

  // /**
  //  * Listener that is called, if a message was sent with the topic "getData"
  //  *
  //  * In this case, the following is done:
  //  * - Read in the data (.csv in this case) a a stream
  //  *      (Stream -> data is read in line by line)
  //  * - Do data preprocessing while reading in:
  //  *      - Convert values, that can be represented as numbers to numbers
  //  *      - Calculate the BMI for every data row (person)
  //  *      - Filtering: if the row has a value, that contradicts the filtering parameters, data row will be excluded
  //  *          (in this case: weight should not be larger than the max_weight filter-parameter)
  //  */
  // socket.on("getData", (obj) => {
  //   console.log(`Data request with properties ${JSON.stringify(obj)}...`)

  //   getExampleLDA(); //Example how to use druidjs. Just prints to the console for now


  //   let parameters = obj.parameters

  //   let jsonArray = []

  //   // This is reading the .csv file line by line
  //   // So we can filter it line by line
  //   // This saves a lot of RAM and processing time
  //   fs.createReadStream(file_path + file_name)
  //     .pipe(parse({ delimiter: ',', columns: true }))
  //     .on('data', function (row) {
  //       row = parse_numbers(row)
  //       row = calc_bmi(row)
  //       // Filtering the data according the given parameter
  //       // If it fits the parameter, add it to the result-array
  //       let row_meets_criteria = is_below_max_weight(parameters, row)
  //       if (row_meets_criteria) {
  //         jsonArray.push(row)
  //       }
  //     })
  //     .on("end", () => { //when all data is ready and processed, send it to the frontend of the socket
  //       socket.emit("freshData", {
  //         timestamp: new Date().getTime(),
  //         data: jsonArray,
  //         parameters: parameters,
  //       })
  //     })
  //   console.log(`freshData emitted`)
  // })
}
