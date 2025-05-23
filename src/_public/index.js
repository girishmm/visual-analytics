import "./app.css"
import * as d3 from "d3"
import io from "socket.io-client"
import {configs} from "../_server/static/configs.js"

import { draw_mechanic_barchart } from "./mechanic_barchart.js"
import { draw_scatterplot_lda } from "./lda_scatterplot.js";

let hostname = window.location.hostname
let protocol = window.location.protocol
const socketUrl = protocol + "//" + hostname + ":" + configs.port

export const socket = io(socketUrl)
socket.on("connect", () => {
  console.log("Connected to " + socketUrl + ".")
})
socket.on("disconnect", () => {
  console.log("Disconnected from " + socketUrl + ".")
})

/**
 * Callback that get the average rating data
 */
socket.on("averageRatingsByMechanic", (payload) => {
  console.log("Average mechanic ratings received from server:")
  if (!payload.data) {
    console.warn("Payload has no data property!")
  } else if (!payload.data.length) {
    console.warn("Payload data array is empty!")
  } else {
    console.log(payload.data)
  }

  draw_mechanic_barchart(payload.data)
})

/**
 * Button to trigger the callback request
 */
document.getElementById("load_mechanic_button").onclick = () => {
  socket.emit("getAverageRatingsByMechanic")
}

/**
 * Callback that get LDA projection
 */
socket.on("ldaProjectionResult", (data) => {
  draw_scatterplot_lda(data);
});

/**
 * Button to choose parameters and trigger the LDA request
 */
document.getElementById("run-lda-btn").addEventListener("click", () => {
  const targetDim = parseInt(document.getElementById("lda-d").value, 10);
  socket.emit("requestLDAProjection", { targetDim });
});
