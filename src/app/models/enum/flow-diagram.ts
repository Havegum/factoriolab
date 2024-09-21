import { SelectItem } from 'primeng/api';

export enum FlowDiagram {
  Sankey = 0,
  BoxLine = 1,
  AlternativeBoxLine = 2,
}

export const flowDiagramOptions: SelectItem<FlowDiagram>[] = [
  { value: FlowDiagram.Sankey, label: 'options.flowDiagram.sankey' },
  { value: FlowDiagram.BoxLine, label: 'options.flowDiagram.boxLine' },
  {
    value: FlowDiagram.AlternativeBoxLine,
    label: 'options.flowDiagram.alternativeBoxLine',
  },
];
