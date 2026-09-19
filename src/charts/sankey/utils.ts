type Link = {
  source: string;
  target: string;
  value: number;
};

interface CycleDetectionResult {
  hasCircularConnection: boolean;
  cyclePath?: string[];
}

export function detectCircularConnection(links: Link[]): CycleDetectionResult {
  // 1. Build an Adjacency List from the links
  const graph = new Map<string, string[]>();
  for (const { source, target } of links) {
    if (!graph.has(source)) graph.set(source, []);
    if (!graph.has(target)) graph.set(target, []);
    graph.get(source)!.push(target);
  }

  // 2. Track visited nodes and nodes in the current recursion stack
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];

  // 3. DFS Helper Function
  function dfs(node: string): boolean {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        // Cycle detected: record loop path
        path.push(neighbor);
        return true;
      }
    }

    // Backtrack
    recStack.delete(node);
    path.pop();
    return false;
  }

  // 4. Run DFS starting from every unvisited node
  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      if (dfs(node)) {
        // Trim the path array to start where the cycle actually begins
        const cycleStart = path[path.length - 1];
        const cycleStartIndex = path.indexOf(cycleStart);
        const cyclePath = path.slice(cycleStartIndex);

        return {
          hasCircularConnection: true,
          cyclePath,
        };
      }
    }
  }

  return { hasCircularConnection: false };
}