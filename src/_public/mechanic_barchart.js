import * as d3 from "d3";

export function draw_mechanic_barchart(data) {
  console.log("Drawing mechanic bar chart with data:", data);

  const margin = {
    top: 50,
    bottom: 75,
    left: 50,
    right: 50,
  };

  const svg = d3.select("#mechanic_barchart_svg");
  const g_barchart = d3.select("#g_mechanic_barchart");
  const g_x_axis = d3.select("#g_x_axis_mechanic_barchart");
  const g_y_axis = d3.select("#g_y_axis_mechanic_barchart");

  const svgWrapperWidth = parseInt(d3.select(".mechanic_barchart").style("width"));
  const svgWrapperHeight = parseInt(d3.select(".mechanic_barchart").style("height"));
  const width = svgWrapperWidth;
  const height = svgWrapperHeight;

  data.sort((a, b) => b.avg_rating - a.avg_rating);

  const barHeight = 10;
  const plotHeight = (barHeight * data.length);

  const svgHeight = plotHeight + margin.top + margin.bottom;
  svg.attr("height", 1550);
  svg.attr("width", 550);
  svg.attr("viewBox", `0 0 ${width} ${svgHeight}`);

  g_barchart.selectAll("*").remove();
  g_x_axis.selectAll("*").remove();
  g_y_axis.selectAll("*").remove();

  const xScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.avg_rating)])
    .range([0, width - margin.left - margin.right]);

  const yScale = d3
    .scaleBand()
    .domain(data.map((d) => d.mechanic))
    .range([0, plotHeight])
    .padding(0.1);

  const bars = g_barchart.selectAll(".mechanic_rect")
    .data(data, d => d.mechanic);

  bars
    .join(
      enter => enter.append("rect")
        .attr("class", "mechanic_rect")
        .attr("x", margin.left)
        .attr("y", (d) => margin.top + yScale(d.mechanic))
        .attr("width", (d) => xScale(d.avg_rating))
        .attr("height", yScale.bandwidth())
        .attr("fill", "#6a5acd")
        .attr("opacity", 0.9)
        .on("mouseover", function() {
          d3.select(this).attr("opacity", 1);
        })
        .on("mouseout", function() {
          d3.select(this).attr("opacity", 0.9);
        }),
      update => update
        .call(update => update.transition().duration(500)
          .attr("y", (d) => margin.top + yScale(d.mechanic))
          .attr("width", (d) => xScale(d.avg_rating)))
    );

  const xAxis = d3.axisBottom(xScale).ticks(5);
  g_x_axis
    .attr("transform", `translate(${margin.left}, ${margin.top + plotHeight})`)
    .call(xAxis)
    .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#555")
      .attr("dy", "1em");
  g_x_axis.selectAll("path, line")
      .style("stroke", "#ccc");

  const yAxis = d3.axisLeft(yScale);
  g_y_axis
    .attr("transform", `translate(${margin.left}, ${margin.top})`)
    .call(yAxis)
    .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#555")
      .attr("text-anchor", "end")
      .attr("dx", "-0.5em");
  g_y_axis.selectAll("path, line")
    .style("stroke", "#ccc");

  const xLabel = svg.selectAll(".x_label").data(["Average Rating"])
    .join(
      enter => enter.append("text")
        .attr("class", "x_label")
        .attr("x", margin.left + (width - margin.left - margin.right) / 2)
        .attr("y", svgHeight - margin.bottom / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#333")
        .text(d => d),
      update => update
        .attr("x", margin.left + (width - margin.left - margin.right) / 2)
        .attr("y", svgHeight - margin.bottom / 2)
    );

  const yLabel = svg.selectAll(".y_label").data(["Mechanic"])
    .join(
      enter => enter.append("text")
        .attr("class", "y_label")
        .attr("x", - (margin.top + plotHeight / 2))
        .attr("y", margin.left / 2)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#333")
        .text(d => d),
      update => update
        .attr("x", - (margin.top + plotHeight / 2))
        .attr("y", margin.left / 2)
    );
}
