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

  // Clear previous elements from the scatterplot group and axes to prevent duplicates on redraws
  g_scatterplot.selectAll("*").remove();
  g_x_axis.selectAll("*").remove();
  g_y_axis.selectAll("*").remove();
  // No need to clear #g_legend here as it's no longer within the SVG and we'll clear its container

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
    .range(["#28a745", "#ffc107", "#dc3545"]); // Modernized colors: Green, Yellow, Red

  let tooltip = d3.select("body").select("#scatterplot_tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body").append("div")
      .attr("id", "scatterplot_tooltip")
      .style("position", "absolute")
      .style("background-color", "rgba(40, 40, 40, 0.95)") // From CSS
      .style("color", "white") // From CSS
      .style("border", "none") // From CSS
      .style("padding", "10px 12px") // From CSS
      .style("border-radius", "6px") // From CSS
      .style("pointer-events", "none")
      .style("font-size", "13px") // From CSS
      .style("line-height", "1.5") // From CSS
      .style("box-shadow", "0 4px 15px rgba(0,0,0,0.3)") // From CSS
      .style("max-width", "200px") // From CSS
      .style("text-align", "left") // From CSS
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
        .attr("stroke", "rgba(255,255,255,0.7)") // Lighter white stroke for sleekness
        .attr("stroke-width", 1) // Slightly thicker initial stroke
        .on("mouseover", function(event, d) {
          d3.select(this)
            .transition()
            .duration(100)
            .attr("r", 8)
            .attr("opacity", 1)
            .attr("stroke", "#4a90e2") // Highlight with primary blue
            .attr("stroke-width", 2.5); // Thicker highlight stroke

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
            .attr("stroke", "rgba(255,255,255,0.7)") // Revert to light white
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
    .selectAll("text") // Style axis labels
      .style("font-size", "12px")
      .style("fill", "#555");
  g_x_axis.selectAll("path, line") // Style axis lines
      .style("stroke", "#ccc");

  g_y_axis
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(yAxis)
    .selectAll("text") // Style axis labels
      .style("font-size", "12px")
      .style("fill", "#555");
  g_y_axis.selectAll("path, line") // Style axis lines
      .style("stroke", "#ccc");


  // --- Legend (now in HTML) ---
  const legendContainer = d3.select("#scatterplot_legend_container");

  // Clear previous legend content from the container
  legendContainer.selectAll("*").remove();

  // Bind data to legend items (using the domain of the color scale)
  const legendItems = legendContainer.selectAll(".legend-item-html")
    .data(colorScale.domain()) // "High", "Medium", "Low"
    .join(
      enter => {
        // Create a div for each legend item
        const item = enter.append("div")
          .attr("class", "legend-item-html"); // Class for styling in CSS

        // Append a colored box (div)
        item.append("div")
          .attr("class", "legend-color-box") // Class for styling in CSS
          .style("background-color", d => colorScale(d)); // Set background color based on scale

        // Append the text label (span)
        item.append("span")
          .text(d => d); // Set text content
        return item;
      }
      // No update or exit selection needed for simple HTML divs here,
      // as we clear and re-create on each draw.
    );
}
