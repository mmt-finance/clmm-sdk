import { Graph } from 'graphlib';
import yen from 'k-shortest-path';

const graph = new Graph({ directed: true });
graph.setNode('A');
graph.setNode('B');
graph.setNode('C');
graph.setNode('D');
graph.setEdge('A', 'B', 1);
graph.setEdge('A', 'C', 5);
// graph.setEdge('A', 'C', 11);
graph.setEdge('B', 'C', 2);
graph.setEdge('B', 'D', 4);
graph.setEdge('C', 'D', 1);

const weightFn = (edge: { v: string; w: string }) => {
  console.log('edge.v:', edge.v);
  console.log('edge.w:', edge.w);
  console.log(graph.edge(edge.v, edge.w));
  return graph.edge(edge.v, edge.w) || Infinity;
};
const source = 'A';
const target = 'D';
const k = 10;
const paths = yen.ksp(graph, source, target, k, weightFn);
console.log(`The ${k} shortest paths from ${source} to ${target} are:`);
paths.forEach((path, index) => {
  console.log(path);
  console.log(
    `Path ${index + 1}: ${path.edges.join(' -> ')} with total weight ${path.totalWeight}`,
  );
});
