import * as d3 from "d3"

export function draw_mechanic_barchart(data) {
  console.log("Drawing mechanic bar chart with data:", data)

  const margin = {
    top: 50,
    bottom: 50,
    left: 200,
    right: 50,
  }

  const svg = d3.select("#mechanic_barchart_svg")
  const g_barchart = d3.select("#g_mechanic_barchart")
  const g_x_axis = d3.select("#g_x_axis_mechanic_barchart")
  const g_y_axis = d3.select("#g_y_axis_mechanic_barchart")

  const width = parseInt(svg.style("width")) || 800
  const height = parseInt(svg.style("height")) || 600

  svg.attr("viewBox", `0 0 ${width} ${height}`)

  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom

  // Sort by rating descending
  data.sort((a, b) => b.avg_rating - a.avg_rating)

  const xScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.avg_rating)])
    .range([0, plotWidth])

  const yScale = d3
    .scaleBand()
    .domain(data.map((d) => d.mechanic))
    .range([0, plotHeight])
    .padding(0.1)

  // Join + Update bars
  const bars = g_barchart.selectAll(".mechanic_rect").data(data)

  bars
    .enter()
    .append("rect")
    .attr("class", "mechanic_rect")
    .merge(bars)
    .attr("x", margin.left)
    .attr("y", (d) => margin.top + yScale(d.mechanic))
    .attr("width", (d) => xScale(d.avg_rating))
    .attr("height", yScale.bandwidth())
    .attr("fill", "#4CAF50")

  bars.exit().remove()

  // X Axis
  const xAxis = d3.axisBottom(xScale).ticks(5)
  g_x_axis
    .attr("transform", `translate(${margin.left}, ${margin.top + plotHeight})`)
    .call(xAxis)

  // Y Axis
  const yAxis = d3.axisLeft(yScale)
  g_y_axis
    .attr("transform", `translate(${margin.left}, ${margin.top})`)
    .call(yAxis)

  // Labels
  const xLabel = g_barchart.selectAll(".x_label").data(["Average Rating"])
  xLabel
    .enter()
    .append("text")
    .attr("class", "x_label")
    .merge(xLabel)
    .attr("x", margin.left + plotWidth / 2)
    .attr("y", height - margin.bottom / 4)
    .attr("text-anchor", "middle")
    .text((d) => d)

  xLabel.exit().remove()

  const yLabel = g_barchart.selectAll(".y_label").data(["Mechanic"])
  yLabel
    .enter()
    .append("text")
    .attr("class", "y_label")
    .merge(yLabel)
    .attr("x", -height / 2)
    .attr("y", margin.left / 4)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text((d) => d)

  yLabel.exit().remove()
}
