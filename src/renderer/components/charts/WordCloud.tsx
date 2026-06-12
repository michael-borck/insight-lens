import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

interface WordCloudProps {
  /**
   * `size` is the (already-scaled) font size; pass the raw occurrence
   * `count` too if available so per-word tooltips can show real numbers.
   */
  words: { text: string; size: number; count?: number }[];
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
      // The d3-cloud layout doesn't ship types; its callbacks receive the
      // layout-word objects (`{ text, size, x, y, rotate, … }`) which we
      // annotate as `any` here. Same pattern below in draw().
      .fontSize((d: any) => d.size)
      .on('end', draw);

    layout.start();

    // Size alone isn't interpretable, so every word gets a <title>
    // tooltip: the raw occurrence count when the caller supplied one,
    // otherwise the word's frequency rank derived from its size.
    const rankBySize = new Map(
      [...words]
        .sort((a, b) => b.size - a.size)
        .map((w, i) => [w.text, i + 1] as const)
    );
    const tooltipFor = (d: any): string =>
      typeof d.count === 'number'
        ? `${d.text}: ${d.count} occurrence${d.count === 1 ? '' : 's'}`
        : `${d.text}: rank ${rankBySize.get(d.text)} of ${words.length} by frequency`;

    function draw(drawn: any[]) {
      const texts = g.selectAll('text')
        .data(drawn)
        .enter().append('text')
        .style('font-size', (d: any) => `${d.size}px`)
        .style('font-family', 'sans-serif')
        .style('fill', (d: any, i: any) => color(i.toString()))
        .attr('text-anchor', 'middle')
        .attr('transform', (d: any) => `translate(${d.x},${d.y})rotate(${d.rotate})`)
        .text((d: any) => d.text)
        .style('cursor', 'pointer');

      // Native SVG tooltip — appended after .text() (which would otherwise
      // wipe child nodes), and on a separate statement so the event
      // handlers below still bind to the <text> elements, not the <title>s.
      texts.append('title').text(tooltipFor);

      texts
        // d3 invokes the handler with `this` bound to the SVG element and
        // `(event, datum)` as args. We need the `function` keyword (not an
        // arrow) so the `this` binding survives, and explicit annotations
        // so strict TypeScript doesn't flag the params as implicit-any.
        // `d` is one of the layout word objects produced by d3-cloud
        // (`{ text, size, x, y, rotate, ... }`); the surrounding `draw()`
        // takes `words: any[]` so we keep `d` loosely-typed here for
        // symmetry.
        .on('mouseover', function (this: SVGTextElement, _event: MouseEvent, d: any) {
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
        .on('mouseout', function (this: SVGTextElement, _event: MouseEvent, d: any) {
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

  // Accessible summary of the cloud — name the most prominent words since
  // the visual size-encoding is invisible to assistive tech.
  const topWords = [...words]
    .sort((a, b) => b.size - a.size)
    .slice(0, 5)
    .map((w) => w.text)
    .join(', ');
  const ariaLabel =
    words.length === 0
      ? 'Word cloud: no words to display'
      : `Word cloud of the ${words.length} most frequent words. Most prominent: ${topWords}`;

  return (
    <div className="flex justify-center" role="img" aria-label={ariaLabel}>
      <svg ref={svgRef}></svg>
    </div>
  );
}