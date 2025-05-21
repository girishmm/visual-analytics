import io from "socket.io-client"
import "./app.css"
import {configs} from "../_server/static/configs.js"
import {draw_barchart} from "./barchart.js"
import {draw_scatterplot} from "./scatterplot.js"
import * as d3 from "d3"

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
 * Callback, when the button is pressed to request the data from the server.
 * @param {*} parameters
 */
let requestData = (parameters) => {
  console.log(`requesting data from webserver (every 2sec)`)

  socket.emit("getData", {
    parameters,
  })
}

/**
 * Assigning the callback to request the data on click.
 */
document.getElementById("load_data_button").onclick = () => {
  let max_weight = document.getElementById("max_weight").value
  if (!isNaN(max_weight)) {
    max_weight = parseFloat(max_weight)
  } else {
    max_weight = Infinity
  }
  requestData({ max_weight })
}

/**
 * Object, that will store the loaded data.
 */
let data = {
  barchart: undefined,
  scatterplot: undefined,
}

/**
 * Callback that is called, when the requested data was sent from the server and is received in the frontend (here).
 * @param {*} payload
 */
let handleData = (payload) => {
  console.log(`Fresh data from Webserver:`)
  console.log(payload)
  // Parse the data into the needed format for the d3 visualizations (if necessary)
  // Here, the barchart shows two bars
  // So the data is preprocessed accordingly

  let count_too_much_weight = 0
  let count_good_weight = 0

  for (let person of payload.data) {
    if (person.bmi >= 25) {
      count_too_much_weight++
    } else {
      count_good_weight++
    }
  }

  data.barchart = [count_too_much_weight, count_good_weight]
  data.scatterplot = payload.data
  draw_barchart(data.barchart)
  draw_scatterplot(data.scatterplot)
}

socket.on("freshData", handleData)

let width = 0
let height = 0

/**
 * This is an example for visualizations, that are not automatically scalled with the viewBox attribute.
 *
 * IMPORTANT:
 * The called function to draw the data must not do any data preprocessing!
 * To much computational load will result in stuttering and reduced responsiveness!
 */
let checkSize = setInterval(() => {
  let container = d3.select(".visualizations")
  let newWidth = parseInt(container.style("width"))
  let newHeight = parseInt(container.style("height"))
  if (newWidth !== width || newHeight !== height) {
    width = newWidth
    height = newHeight
    if (data.scatterplot) draw_scatterplot(data.scatterplot)
  }
}, 100)
