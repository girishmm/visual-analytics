import * as d3 from "d3";

export function draw_mechanic_barchart(data) {
  console.log("Drawing mechanic bar chart with data:", data);

  const margin = {
    top: 50,
    bottom: 50,
    left: 250, // More space for long mechanic names
    right: 50,
  };

  const svg = d3.select("#mechanic_barchart_svg");
  const g_barchart = d3.select("#g_mechanic_barchart");
  const g_x_axis = d3.select("#g_x_axis_mechanic_barchart");
  const g_y_axis = d3.select("#g_y_axis_mechanic_barchart");

  // Get the current width of the parent HTML div for responsiveness
  // The .mechanic_barchart class is on the div wrapper, not the SVG itself.
  const svgWrapperWidth = parseInt(d3.select(".mechanic_barchart").style("width"));
  const width = svgWrapperWidth; // Use the full width of the SVG's panel


  // Sort by rating descending
  data.sort((a, b) => b.avg_rating - a.avg_rating);

  // --- Dynamic Height Calculation for Bar Chart (for ALL bars) ---
  // This is CRITICAL for scrolling to work without squishing.
  // Each bar maintains a fixed, readable height.
  const barHeight = 25; // Height of each individual bar including padding (adjust as needed)
  const plotHeight = (barHeight * data.length); // Calculate total height needed for ALL bars

  // Set the SVG height dynamically to accommodate all bars.
  // This will make the SVG content potentially much taller than its visible container.
  const svgHeight = plotHeight + margin.top + margin.bottom;
  svg.attr("height", svgHeight); // Set explicit height to SVG
  svg.attr("width", width); // Set explicit width to SVG to match container
  svg.attr("viewBox", `0 0 ${width} ${svgHeight}`); // Update viewBox with new dimensions

  // Clear existing elements to ensure consistent behavior on repeated calls
  g_barchart.selectAll("*").remove();
  g_x_axis.selectAll("*").remove();
  g_y_axis.selectAll("*").remove();


  const xScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.avg_rating)])
    .range([0, width - margin.left - margin.right]); // Use calculated plot width

  const yScale = d3
    .scaleBand()
    .domain(data.map((d) => d.mechanic)) // ALL data included in domain
    .range([0, plotHeight]) // Use dynamically calculated plot height (which is tall enough for all bars)
    .padding(0.1); // Padding between bars

  // Join + Update bars
  const bars = g_barchart.selectAll(".mechanic_rect")
    .data(data, d => d.mechanic); // ALL data bound to bars

  bars
    .join(
      enter => enter.append("rect")
        .attr("class", "mechanic_rect")
        .attr("x", margin.left)
        .attr("y", (d) => margin.top + yScale(d.mechanic))
        .attr("width", (d) => xScale(d.avg_rating))
        .attr("height", yScale.bandwidth()) // This will be fixed (barHeight * 0.9) due to plotHeight calculation
        .attr("fill", "#6a5acd") // Consistent color
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

  // X Axis
  const xAxis = d3.axisBottom(xScale).ticks(5);
  g_x_axis
    .attr("transform", `translate(${margin.left}, ${margin.top + plotHeight})`)
    .call(xAxis)
    .selectAll("text") // Style axis labels
      .style("font-size", "12px")
      .style("fill", "#555")
      .attr("dy", "1em"); // Move labels slightly down from axis line
  g_x_axis.selectAll("path, line") // Style axis lines
      .style("stroke", "#ccc");

  // Y Axis
  const yAxis = d3.axisLeft(yScale);
  g_y_axis
    .attr("transform", `translate(${margin.left}, ${margin.top})`)
    .call(yAxis)
    .selectAll("text") // Style Y-axis labels
      .style("font-size", "12px")
      .style("fill", "#555")
      .attr("text-anchor", "end") // Align text to the end (right) of the label position
      .attr("dx", "-0.5em"); // Pull text slightly away from the axis line
  g_y_axis.selectAll("path, line") // Style Y-axis lines
    .style("stroke", "#ccc");


  // Labels
  // Ensure labels are positioned relative to the SVG's *total* height and width
  const xLabel = svg.selectAll(".x_label").data(["Average Rating"])
    .join(
      enter => enter.append("text")
        .attr("class", "x_label")
        .attr("x", margin.left + (width - margin.left - margin.right) / 2)
        .attr("y", svgHeight - margin.bottom / 2) // Position based on new svgHeight
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#333")
        .text(d => d),
      update => update
        .attr("x", margin.left + (width - margin.left - margin.right) / 2)
        .attr("y", svgHeight - margin.bottom / 2) // Update position
    );

  const yLabel = svg.selectAll(".y_label").data(["Mechanic"])
    .join(
      enter => enter.append("text")
        .attr("class", "y_label")
        .attr("x", - (margin.top + plotHeight / 2)) // Rotated X position
        .attr("y", margin.left / 2) // Rotated Y position, adjusted
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#333")
        .text(d => d),
      update => update
        .attr("x", - (margin.top + plotHeight / 2)) // Update position
        .attr("y", margin.left / 2) // Update position
    );
}
