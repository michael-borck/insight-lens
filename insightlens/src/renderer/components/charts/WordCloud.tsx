import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

interface WordCloudProps {
  words: { text: string; size: number }[];
  width?: number;
  height?: number;
}

export function WordCloud({ words, width = 600, height = 400 }: WordCloudProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || words.length === 0) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Create the word cloud layout
    const layout = cloud()
      .size([width, height])
      .words(words.map(d => ({ ...d, text: d.text, size: d.size })))
      .padding(5)
      .rotate(() => ~~(Math.random() * 2) * 90)
      .font('sans-serif')
      .fontSize(d => d.size)
      .on('end', draw);

    layout.start();

    function draw(words: any[]) {
      g.selectAll('text')
        .data(words)
        .enter().append('text')
        .style('font-size', d => `${d.size}px`)
        .style('font-family', 'sans-serif')
        .style('fill', (d, i) => color(i.toString()))
        .attr('text-anchor', 'middle')
        .attr('transform', d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
        .text(d => d.text)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .style('font-size', `${d.size * 1.2}px`)
            .style('opacity', 1);
          
          // Fade other words
          g.selectAll('text')
            .filter((other: any) => other !== d)
            .transition()
            .duration(200)
            .style('opacity', 0.3);
        })
        .on('mouseout', function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .style('font-size', `${d.size}px`);
          
          // Restore opacity
          g.selectAll('text')
            .transition()
            .duration(200)
            .style('opacity', 1);
        });
    }
  }, [words, width, height]);

  return (
    <div className="flex justify-center">
      <svg ref={svgRef}></svg>
    </div>
  );
}