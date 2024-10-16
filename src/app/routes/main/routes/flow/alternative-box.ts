import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css'; // optional for styling

import { ElkNode } from 'elkjs';
import { FlowData } from '~/models';
import { zoom, zoomIdentity } from 'd3-zoom';
import { FlowComponent } from './flow.component';
import { select } from 'd3-selection';
import { roundCommands } from 'svg-round-corners';
import { coalesce } from '~/helpers';
import { ThemeValues } from '~/services';

const sizes: Record<string, { width: number; height: number }> = {
  DEFAULT: { width: 10, height: 10 },
  manufacturer: { width: 18, height: 20 },
  assembler: { width: 10, height: 15 },
  'constructor-id': { width: 8, height: 10 },
  'miner-mk1': { width: 10, height: 10 }, // TODO
  foundry: { width: 10, height: 10 }, // TODO
  smelter: { width: 10, height: 10 }, // TODO
  refinery: { width: 10, height: 10 }, // TODO
  'oil-extractor': { width: 10, height: 10 }, // TODO
};

interface MachineData {
  id: string;
  height: number;
  width: number;
  fraction: number;
  color: string;
  columns: number;
  x: number;
  y: number;
}

export default function rebuildAlternativeBoxLine(
  flow: FlowData,
  themeValues: ThemeValues,
  flowComponent: FlowComponent,
): void {
  const graph: ElkNode = {
    id: 'root',
    children: flow.nodes.map((n) => {
      const producer = n.recipe?.producers?.[0];

      const padding = 40;
      const paddingTop = 80;
      const marginX = 40;

      const producerData = sizes[producer ?? 'DEFAULT'] ?? sizes['DEFAULT'];

      if (n.machineCount === undefined) {
        return {
          id: n.id,
          height: 200,
          width: 200 + marginX * 2,
          color: n.color,
          marginX: marginX,
          machinesArray: [],
        };
      }
      const floatMachineCount = coalesce(n.machineCount, 1);
      const count = Math.ceil(floatMachineCount);

      let columns = Math.min(count, Math.ceil(Math.sqrt(count) * 1.5));

      const rows = Math.ceil(count / columns);
      if (rows > 1 && rows % 2 === 1) {
        columns = Math.ceil(count / (rows - 1));
      } else if (rows === 2 && count % columns === 1) {
        columns = count;
      }

      const machinePadding = 15;
      const rowPadding = 30;

      const height =
        (producerData.height * 10 + machinePadding) *
          Math.ceil(count / columns) +
        padding +
        paddingTop +
        Math.ceil(Math.ceil(count / columns) / 2) * rowPadding -
        machinePadding -
        rowPadding;

      const width =
        (producerData.width * 10 + machinePadding) * columns +
        padding * 2 +
        marginX * 2 -
        machinePadding;

      return {
        id: n.id,
        columns,
        marginX,
        height,
        width,
        machinesArray: Array.from({ length: count }).map((_, i) => ({
          id: `${n.id}-${i}`,
          fraction: Math.min(1, floatMachineCount - i),
          height: producerData.height * 10,
          width: producerData.width * 10,
          color: n.color,
          x:
            padding +
            (i % columns) * (producerData.width * 10 + machinePadding),
          y:
            paddingTop +
            Math.floor(i / columns) *
              (producerData.height * 10 + machinePadding) +
            Math.floor(Math.floor(i / columns) / 2) * rowPadding,
        })) as MachineData[],
      };
    }),

    edges: flow.links.map((l) => ({
      id: '',
      sources: [l.source],
      targets: [l.target],
      layoutOptions: {
        // 'org.eclipse.elk.edge.thickness': '0',
        // 'org.eclipse.elk.port.side': 'SOUTH',
      },
    })),

    layoutOptions: {
      'elk.algorithm': 'org.eclipse.elk.layered',
      'org.eclipse.elk.layered.spacing.baseValue': '100',
      'org.eclipse.elk.spacing.edgeNode': '125',
      'org.eclipse.elk.layered.spacing.edgeEdgeBetweenLayers': '50',
    },
  };

  const height = graph.height || 300;
  const width = graph.width || 500;

  const svg = select(flowComponent.svgElement().nativeElement)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`);

  const z = zoom<SVGSVGElement, unknown>().on('zoom', (e): void => {
    svg.selectAll('svg > g').attr('transform', e.transform);
  });

  svg.call(z);

  const elk = flowComponent.getElk();
  elk.layout(graph).then((data) => {
    if (data.children == null) return;

    const children = data.children;
    flow.nodes.forEach((node) => {
      const item = children.find((c) => c.id === node.id);
      if (item) {
        node = Object.assign(node, { id: node.id, x: item.x, y: item.y });
      }
    });

    if (data.edges?.length) {
      const g = svg
        .append('g')
        .selectAll('g')
        .data(
          data.edges.map((d) => {
            const source = d.sources?.[0];
            const sourceData = flow.links.find((l) => l.source === source);

            const cmds =
              d.sections?.flatMap((s) =>
                [s.startPoint, ...(s.bendPoints ?? []), s.endPoint].map(
                  (c, i) => ({
                    marker: i === 0 ? 'M' : 'L',
                    values: {
                      x: c.x,
                      y: c.y,
                    },
                  }),
                ),
              ) ?? [];

            const { path } = roundCommands(cmds, 15);

            const ends = d.sections?.flatMap((s) => {
              const path = [s.startPoint, ...(s.bendPoints ?? []), s.endPoint];
              const end = path[path.length - 1];
              const penultimate = path[path.length - 2];

              const endVector = {
                x: end.x - penultimate.x,
                y: end.y - penultimate.y,
              };

              const length = Math.sqrt(endVector.x ** 2 + endVector.y ** 2);

              endVector.x /= length;
              endVector.y /= length;

              return { end, endVector };
            });

            return { ...sourceData, ...d, path, ends };
          }),
        )
        .join('g');

      g.append('path')
        .attr('d', (d) => d.path)
        .attr('fill', 'none')
        .attr('stroke', 'var(--surface-a)')
        .attr('stroke-width', (d) => Math.log((d.value ?? 1) + 10) * 4 + 10)
        .attr('stroke-linejoin', 'round');

      g.append('path')
        .attr('d', (d) => d.path)
        .attr('fill', 'none')
        .attr('stroke', (d) => d.color ?? 'black')
        .attr('stroke-width', (d) => Math.log((d.value ?? 1) + 10) * 4 + 0)
        .attr('stroke-opacity', 0.6)
        .attr('stroke-linejoin', 'round');

      g.selectAll('path.ends')
        .data((d) => (d.ends ?? []).map((e) => ({ ...d, ...e })))
        .join('path')
        .attr('d', ({ end, endVector, ...d }) => {
          const arrowLength = 40;
          const arrowWidth = Math.log((d.value ?? 1) + 10) * 2 + 5;
          const arrow = [
            {
              x: end.x + arrowLength * endVector.x,
              y: end.y + arrowLength * endVector.y,
            },
            {
              x: end.x + arrowWidth * endVector.y,
              y: end.y - arrowWidth * endVector.x,
            },
            {
              x: end.x - arrowWidth * endVector.y,
              y: end.y + arrowWidth * endVector.x,
            },
          ];

          return `M ${arrow.map(({ x, y }) => `${x},${y}`).join('L')} Z`;
        })
        .attr('fill', (d) => d.color ?? 'black')
        .attr('stroke', 'var(--surface-a)');
    }

    if (graph.children?.length) {
      const g = svg.append('g');

      const rect = g
        .selectAll('g')
        .data(
          graph.children.map((c) => {
            const item = flow.nodes.find((n) => n.id === c.id);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return { ...c, ...item } as any;
          }),
        )
        .join('g')
        .attr('transform', (d) => `translate(${d.x + d.marginX * 2}, ${d.y})`)
        .attr('data-id', (d) => d.id);

      tippy(rect.nodes() as Element[], {
        content: (reference) => {
          const id = reference.getAttribute('data-id');

          const item = flow.nodes.find((n) => n.id === id);
          return `
                <div>
                  <div>${item?.name}</div>
                  <div>${item?.recipe?.producers?.[0]}</div>
                  <div>${item?.machineCount}</div>
                  <svg viewBox="${item?.viewBox}" width="30" height="30">
                    <image href="${item?.href}" />
                  </svg>
                </div>
              `;
        },
        allowHTML: true,
        theme: 'dark',
      });

      rect
        .append('rect')
        .attr('width', (d) => (d.width ?? 100) - d.marginX * 2)
        .attr('height', (d) => d.height ?? 100)
        .attr('rx', 5)
        .attr('ry', 5)
        .attr('fill', (d) => d.color ?? 'black')
        .attr('stroke', (d) => d.color ?? 'black')
        .attr('stroke-width', 2)
        .filter((d) => d.machinesArray.length === 0)
        .attr('transform', 'rotate(45) scale(0.5)')
        .attr('transform-origin', '100 100');

      rect
        .append('text')
        .attr('x', 10)
        .attr('y', 20)
        .style('--text-color', (d) =>
          flowComponent.foreColor(d.color ?? 'black'),
        )
        .text((d) => (d?.name ?? '') + ` (${d?.text ?? 1})`);

      // For each `machineCount`, we draw a rect of the producer type size:
      const machines = rect
        .selectAll('g.machine')
        .data((d) => d.machinesArray as MachineData[])
        .join('g')
        .attr('class', 'machine')
        .attr('transform', (d) => `translate(${d.x}, ${d.y})`);

      machines
        .append('rect')
        .attr('rx', 5)
        .attr('ry', 5)
        .attr('width', (d) => d.width * d.fraction)
        .attr('height', (d) => d.height)
        .attr('fill', (d) => flowComponent.foreColor(d.color ?? 'black'))
        .attr('fill-opacity', 0.1);

      machines
        .filter((d) => d.fraction !== 1)
        .append('rect')
        .attr('rx', 5)
        .attr('ry', 5)
        .attr('width', (d) => d.width)
        .attr('height', (d) => d.height)
        .attr('fill', 'none')
        .attr('stroke', (d) => flowComponent.foreColor(d.color ?? 'black'))
        .attr('stroke-opacity', 0.3)
        .attr('stroke-dasharray', '5,5');

      machines
        .filter((d) => d.fraction !== 1)
        .append('text')
        .attr('x', (d) => d.width / 2)
        .attr('y', (d) => d.height / 2)
        .attr('opacity', 0.6)
        .attr('text-anchor', 'middle')

        .style('--text-color', (d) =>
          flowComponent.foreColor(d.color ?? 'black'),
        )
        .attr('font-size', (d) => d.height / 4)
        .text((d) => Math.round(d.fraction * 10 ** 2) / 10 ** 2);

      const svgGElement: SVGGElement = g.node() as SVGGElement;
      const box = svgGElement.getBBox();

      const scale = Math.min(width / box.width, height / box.height);

      const transform = zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-box.x - box.width / 2, -box.y - box.height / 2);

      if (scale === Infinity) {
        transform.scale(1);
      }

      z.transform(svg, transform);
      flowComponent.loading.set(false);
    }
  });
}
