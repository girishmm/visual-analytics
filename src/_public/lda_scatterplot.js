import * as d3 from "d3";

export function draw_scatterplot_lda(data) {

  console.log("draw scatterplot");

  const margin = { top: 50, bottom: 50, left: 50, right: 50 };
  const svg = d3.select("#scatterplot_svg");
  const width = parseInt(svg.style("width"));
  const height = parseInt(svg.style("height"));
  svg.attr("viewBox", `0 0 ${width} ${height}`);

  const g_scatterplot = d3.select("#g_scatterplot");
  const g_x_axis = d3.select("#g_x_axis_scatterplot");
  const g_y_axis = d3.select("#g_y_axis_scatterplot");

  g_scatterplot.selectAll("*").remove();
  g_x_axis.selectAll("*").remove();
  g_y_axis.selectAll("*").remove();

  const xExtent = d3.extent(data, d => d.x);
  const yExtent = d3.extent(data, d => d.y);

  const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
  const yPadding = (yExtent[1] - yExtent[0]) * 0.1;

  const xScale = d3.scaleLinear()
    .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
    .range([margin.left, width - margin.right]);

  const yScale = d3.scaleLinear()
    .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
    .range([height - margin.bottom, margin.top]);

  const colorScale = d3.scaleOrdinal()
    .domain(["High", "Medium", "Low"])
    .range(["#28a745", "#ffc107", "#dc3545"]);

  let tooltip = d3.select("body").select("#scatterplot_tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body").append("div")
      .attr("id", "scatterplot_tooltip")
      .style("position", "absolute")
      .style("background-color", "rgba(40, 40, 40, 0.95)")
      .style("color", "white")
      .style("border", "none")
      .style("padding", "10px 12px")
      .style("border-radius", "6px")
      .style("pointer-events", "none")
      .style("font-size", "13px")
      .style("line-height", "1.5")
      .style("box-shadow", "0 4px 15px rgba(0,0,0,0.3)")
      .style("max-width", "200px")
      .style("text-align", "left")
      .style("opacity", 0);
  }

  const circles = g_scatterplot.selectAll("circle")
    .data(data, d => d.title)
    .join(
      enter => enter.append("circle")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", 4)
        .attr("fill", d => colorScale(d.label))
        .attr("opacity", 0.8)
        .attr("stroke", "rgba(255,255,255,0.7)")
        .attr("stroke-width", 1)
        .on("mouseover", function(event, d) {
          d3.select(this)
            .transition()
            .duration(100)
            .attr("r", 8)
            .attr("opacity", 1)
            .attr("stroke", "#4a90e2")
            .attr("stroke-width", 2.5);

            tooltip.html(`<strong>${d.title}</strong><br/>` +
                         `Rating: ${d.rating}<br/>` +
                         (d.mechanics && d.mechanics.length > 0 ? `Mechanics: ${d.mechanics.join(', ')}` : 'Mechanics: N/A'))
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px")
            .transition()
            .duration(200)
            .style("opacity", 0.9);
        })
        .on("mouseout", function(event, d) {
          d3.select(this)
            .transition()
            .duration(100)
            .attr("r", 4)
            .attr("opacity", 0.8)
            .attr("stroke", "rgba(255,255,255,0.7)")
            .attr("stroke-width", 1);

          tooltip.transition()
            .duration(500)
            .style("opacity", 0);
        }),
      update => update
        .transition()
        .duration(500)
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("fill", d => colorScale(d.label)),
      exit => exit.remove()
    );

  const xAxis = d3.axisBottom(xScale).ticks(5);
  const yAxis = d3.axisLeft(yScale).ticks(5);

  g_x_axis
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(xAxis)
    .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#555");
  g_x_axis.selectAll("path, line")
      .style("stroke", "#ccc");

  g_y_axis
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(yAxis)
    .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#555");
  g_y_axis.selectAll("path, line")
      .style("stroke", "#ccc");

  const legendContainer = d3.select("#scatterplot_legend_container");

  legendContainer.selectAll("*").remove();
  const legendItems = legendContainer.selectAll(".legend-item-html")
    .data(colorScale.domain())
    .join(
      enter => {
        const item = enter.append("div")
          .attr("class", "legend-item-html");

        item.append("div")
          .attr("class", "legend-color-box")
          .style("background-color", d => colorScale(d));

        item.append("span")
          .text(d => d);
        return item;
      }
    );
}
