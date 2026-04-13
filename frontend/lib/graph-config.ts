import { GraphEdge } from '@/lib/store';

/**
 * Graph topologies for different modes
 */
export const GRAPH_TOPOLOGIES = {
  CODE_MODE_EDGES: [
    { id: 'e-router-planner', from: 'router', to: 'code_planner' },
    { id: 'e-planner-coder1', from: 'code_planner', to: 'coder_1' },
    { id: 'e-planner-coder2', from: 'code_planner', to: 'coder_2' },
    { id: 'e-planner-coder3', from: 'code_planner', to: 'coder_3' },
    { id: 'e-coder1-aggregator', from: 'coder_1', to: 'code_aggregator' },
    { id: 'e-coder2-aggregator', from: 'coder_2', to: 'code_aggregator' },
    { id: 'e-coder3-aggregator', from: 'coder_3', to: 'code_aggregator' },
    { id: 'e-aggregator-reviewer', from: 'code_aggregator', to: 'code_reviewer' },
    { id: 'e-reviewer-output', from: 'code_reviewer', to: 'output' },
  ] as GraphEdge[],

  STANDARD_MODE_EDGES: [
    { id: 'e-router-output', from: 'router', to: 'output' },
  ] as GraphEdge[],
};

/**
 * Graph node coordinates
 */
export const GRAPH_COORDINATES = {
  router: { x: 400, y: 60 },
  code_planner: { x: 400, y: 200 },
  coder_1: { x: 100, y: 350 },
  coder_2: { x: 400, y: 350 },
  coder_3: { x: 700, y: 350 },
  code_aggregator: { x: 400, y: 500 },
  code_reviewer: { x: 400, y: 650 },
  output: { x: 400, y: 800 },
};
