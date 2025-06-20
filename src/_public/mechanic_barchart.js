import * as d3 from "d3";

// Create tooltip div once
const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip");

export function draw_mechanic_barchart(data) {
  const margin = { top: 50, bottom: 75, left: 150, right: 50 };

  // Ensure scroll styles
  d3.select(".mechanic_barchart")
    .style("overflow-y", "auto")
    .style("overflow-x", "hidden")
    .style("position", "relative");

  const svg = d3.select("#mechanic_barchart_svg");
  const g_barchart = d3.select("#g_mechanic_barchart");
  const g_x_axis = d3.select("#g_x_axis_mechanic_barchart");
  const g_y_axis = d3.select("#g_y_axis_mechanic_barchart");

  // Measure wrapper width
  const wrapperWidth = parseInt(
    d3.select(".mechanic_barchart").style("width"),
    10
  );

  data.sort((a, b) => b.avg_rating - a.avg_rating);

  const barHeight = 12;
  const plotHeight = barHeight * data.length;
  const svgHeight = plotHeight + margin.top + margin.bottom;

    // Match SVG width to wrapper — no horizontal scroll needed
    const svgWidth = wrapperWidth;

  svg
    .attr("width", svgWidth)
    .style("width", `${svgWidth}px`)
    .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
    .attr("preserveAspectRatio", "xMinYMin meet")
    .style("display", "block");

  // Clear previous content
  g_barchart.selectAll("*").remove();
  g_x_axis.selectAll("*").remove();
  g_y_axis.selectAll("*").remove();

  // Scales
  const xScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.avg_rating)])
    .range([0, svgWidth - margin.left - margin.right]);

  const yScale = d3
    .scaleBand()
    .domain(data.map((d) => d.mechanic))
    .range([0, plotHeight])
    .padding(0.1);

  // Bars with tooltip
  g_barchart
    .selectAll(".mechanic_rect")
    .data(data, (d) => d.mechanic)
    .join(
      (enter) =>
        enter
          .append("rect")
          .attr("class", "mechanic_rect")
          .attr("x", margin.left)
          .attr("y", (d) => margin.top + yScale(d.mechanic))
          .attr("width", (d) => xScale(d.avg_rating))
          .attr("height", yScale.bandwidth())
          .attr("fill", "#6a5acd")
          .attr("opacity", 0.9)
          .on("mouseover", function (event, d) {
            d3.select(this).attr("opacity", 1);
            tooltip
              .style("display", "block")
              .html(`<strong>${d.mechanic}</strong><br/>${d.avg_rating.toFixed(2)}`);
          })
          .on("mousemove", function (event) {
            tooltip
              .style("left", event.pageX + 10 + "px")
              .style("top", event.pageY + 10 + "px");
          })
          .on("mouseout", function () {
            d3.select(this).attr("opacity", 0.9);
            tooltip.style("display", "none");
          }),
      (update) =>
        update.call((u) =>
          u.transition().duration(500)
            .attr("width", (d) => xScale(d.avg_rating))
            .attr("y", (d) => margin.top + yScale(d.mechanic))
        )
    );

  // X-axis
  g_x_axis
    .attr("transform", `translate(${margin.left}, ${margin.top + plotHeight})`)
    .call(d3.axisBottom(xScale).ticks(5))
    .selectAll("text")
      .style("font-size", "10px")
      .style("fill", "#555")
      .attr("dy", "1em");
  g_x_axis.selectAll("path, line").style("stroke", "#ccc");

  // Y-axis with default ticks and padding
  const yAxis = d3.axisLeft(yScale).tickPadding(8);
  g_y_axis
    .attr("transform", `translate(${margin.left}, ${margin.top})`)
    .call(yAxis)
    .selectAll("text")
    .style("font-size", "10px")
    .style("fill", "#555");
  g_y_axis.selectAll("path, line").style("stroke", "#ccc");

  // X-axis label
  svg
    .selectAll(".x_label")
    .data(["Average Rating"])
    .join((enter) =>
      enter
        .append("text")
        .attr("class", "x_label")
        .attr("x", margin.left + (svgWidth - margin.left - margin.right) / 2)
        .attr("y", svgHeight - margin.bottom / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#333")
        .text((d) => d)
    );

  // Y-axis label
  svg
    .selectAll(".y_label")
    .data(["Mechanic"])
    .join((enter) =>
      enter
        .append("text")
        .attr("class", "y_label")
        .attr("x", margin.left - 10)
        .attr("y", margin.top - 10)
        .attr("text-anchor", "end")
        .style("font-size", "12px")
        .style("fill", "#333")
        .text((d) => d)
    );
}

// Setup button click
document
  .getElementById("load_mechanic_button")
  .addEventListener("click", async () => {
    const data = await fetch("/api/mechanics").then((res) => res.json());
    draw_mechanic_barchart(data);
  });
