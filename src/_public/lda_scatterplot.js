import * as d3 from "d3";

export function draw_scatterplot_lda(data) {

  console.log("draw scatterplot")
  console.log(data)

  const margin = { top: 50, bottom: 50, left: 50, right: 50 };
  const svg = d3.select("#scatterplot_svg");
  const width = parseInt(svg.style("width"));
  const height = parseInt(svg.style("height"));
  svg.attr("viewBox", `0 0 ${width} ${height}`);

  const g_scatterplot = d3.select("#g_scatterplot");
  const g_x_axis = d3.select("#g_x_axis_scatterplot");
  const g_y_axis = d3.select("#g_y_axis_scatterplot");

  const xExtent = d3.extent(data, d => d.x);
  const yExtent = d3.extent(data, d => d.y);

  const xScale = d3.scaleLinear()
    .domain(xExtent)
    .range([margin.left, width - margin.right]);

  const yScale = d3.scaleLinear()
    .domain(yExtent)
    .range([height - margin.bottom, margin.top]);

  const colorScale = d3.scaleOrdinal()
    .domain(["High", "Medium", "Low"])
    .range(["green", "orange", "red"]);

  // Bind data
  const circles = g_scatterplot.selectAll("circle").data(data, d => d.title);

  // Enter
  circles.enter()
    .append("circle")
    .attr("cx", d => xScale(d.x))
    .attr("cy", d => yScale(d.y))
    .attr("r", 5)
    .attr("fill", d => colorScale(d.label))
    .append("title")
    .text(d => `${d.title}\nRating: ${d.label}`);

  // Update
  circles
    .attr("cx", d => xScale(d.x))
    .attr("cy", d => yScale(d.y))
    .attr("fill", d => colorScale(d.label));

  // Exit
  circles.exit().remove();

  // Axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale);

  g_x_axis
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(xAxis);

  g_y_axis
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(yAxis);
}
