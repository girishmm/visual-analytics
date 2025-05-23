import * as fs from "fs"
import { print_clientConnected, print_clientDisconnected } from "./static/utils.js"

import { get_average_ratings_by_mechanic } from "./preprocessing.js"
import { computeLDAProjection } from "./lda.js";

const file_path = "data/"
const file_name = "boardgames_100.json"

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
   * Listener to send mechanic rating averages to the client.
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

  /**
   * Listener to project via LDA and send to the client.
   */

  socket.on("requestLDAProjection", async ({ targetDim }) => {
    console.log("Client requested LDA reduction")

    const filepath = "data/boardgames_100.json"
    const fileContent = fs.readFileSync(filepath)
    const boardgames = JSON.parse(fileContent)

    const projection = computeLDAProjection(boardgames, targetDim);
    socket.emit("ldaProjectionResult", projection);
    console.log("Server emitted LDA reduction")
  });
}
