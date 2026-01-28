/*Hierarchy*/
export interface HierarchyNode<T> {
    data: T;
    parent?: HierarchyNode<T>;
    children?: HierarchyNode<T>[];
    depth: number;
    value?: number;
}

type ChildrenAccessor<T> = (node: T, depth: number) => T[] | undefined | null;
type ValueAccessor<T> = (node: T, depth: number) => number;
type SortComparator<T> = (
    a: HierarchyNode<T>,
    b: HierarchyNode<T>
) => number;

export function d3v3hierarchy<T>() {
    let sortFn: SortComparator<T> | null = null;
    let childrenFn: ChildrenAccessor<T> | null = null;
    let valueFn: ValueAccessor<T> | null = null;

    function build(rootData: T): HierarchyNode<T>[] {
        const stack: HierarchyNode<T>[] = [
            { data: rootData, depth: 0 }
        ];
        const nodes: HierarchyNode<T>[] = [];

        let node: HierarchyNode<T> | undefined;

        // --- DFS traversal ---
        while ((node = stack.pop())) {
            nodes.push(node);

            const childrenData = childrenFn?.(node.data, node.depth);

            if (childrenData && childrenData.length) {
                node.children = [];

                for (let i = childrenData.length - 1; i >= 0; i--) {
                    const child: HierarchyNode<T> = {
                        data: childrenData[i],
                        parent: node,
                        depth: node.depth + 1
                    };
                    node.children.push(child);
                    stack.push(child);
                }

                if (valueFn) node.value = 0;
            } else {
                if (valueFn) {
                    node.value = +valueFn(node.data, node.depth) || 0;
                }
                delete node.children;
            }
        }

        // --- Post-order accumulation ---
        for (let i = nodes.length - 1; i >= 0; i--) {
            const n = nodes[i];

            if (sortFn && n.children) {
                n.children.sort(sortFn);
            }

            if (valueFn && n.parent) {
                n.parent.value = (n.parent.value ?? 0) + (n.value ?? 0);
            }
        }

        return nodes;
    }

    // ---------- API ----------

    build.sort = function (fn?: SortComparator<T>) {
        if (!arguments.length) return sortFn;
        sortFn = fn ?? null;
        return build;
    };

    build.children = function (fn?: ChildrenAccessor<T>) {
        if (!arguments.length) return childrenFn;
        childrenFn = fn ?? null;
        return build;
    };

    build.value = function (fn?: ValueAccessor<T>) {
        if (!arguments.length) return valueFn;
        valueFn = fn ?? null;
        return build;
    };

    build.revalue = function (root: HierarchyNode<T>) {
        if (!valueFn) return root;

        // reset internal nodes
        traversePre(root, n => {
            if (n.children) n.value = 0;
        });

        // recompute leaf + accumulate
        traversePost(root, n => {
            if (!n.children && valueFn) {
                n.value = +valueFn(n.data, n.depth) || 0;
            }
            if (n.parent) {
                n.parent.value = (n.parent.value ?? 0) + (n.value ?? 0);
            }
        });

        return root;
    };

    return build;
}

function traversePre<T>(
    node: HierarchyNode<T>,
    visit: (n: HierarchyNode<T>) => void
) {
    visit(node);
    node.children?.forEach(child => traversePre(child, visit));
}

function traversePost<T>(
    node: HierarchyNode<T>,
    visit: (n: HierarchyNode<T>) => void
) {
    node.children?.forEach(child => traversePost(child, visit));
    visit(node);
}

/*Pack*/
type RadiusAccessor<T> = number | ((value: number) => number) | null;

type PackSize = [number, number];

declare function oi<T>(
    node: HierarchyNode<T>,
    visit: (n: HierarchyNode<T>) => void
): void;

declare function Ni<T>(node: HierarchyNode<T>): void;

declare function Ci<T>(
    node: HierarchyNode<T>,
    x: number,
    y: number,
    k: number
): void;

declare function ii(target: any, source: any): any;
declare function _i<T>(a: HierarchyNode<T>, b: HierarchyNode<T>): number;

/*
export function pack<T>() {
  let radius: RadiusAccessor<T>;
  let padding = 0;
  let size: PackSize = [1, 1];

  const hierarchy = d3v3hierarchy<T>().sort(_i)!;

  function layout(
    data: T,
    depth?: number
  ): HierarchyNode<T>[] {
    const nodes = hierarchy(data, depth);
    const root = nodes[0];

    const [width, height] = size;

    const radiusFn =
      radius == null
        ? Math.sqrt
        : typeof radius === "function"
        ? radius
        : () => radius;

    // initialize root
    root.x = 0;
    root.y = 0;

    // assign radius from value
    oi(root, node => {
      node.r = +radiusFn(node.value ?? 0);
    });

    // initial packing
    oi(root, Ni);

    // apply padding
    if (padding) {
      const scale =
        (padding *
          (radius
            ? 1
            : Math.max(
                (2 * root.r!) / width,
                (2 * root.r!) / height
              ))) /
        2;

      oi(root, n => {
        n.r! += scale;
      });

      oi(root, Ni);

      oi(root, n => {
        n.r! -= scale;
      });
    }

    // center + scale
    Ci(
      root,
      width / 2,
      height / 2,
      radius
        ? 1
        : 1 /
            Math.max(
              (2 * root.r!) / width,
              (2 * root.r!) / height
            )
    );

    return nodes;
  }

  // ---------- API ----------

  layout.size = function (value?: PackSize) {
    if (!arguments.length) return size;
    size = value!;
    return layout;
  };

  layout.radius = function (value?: RadiusAccessor<T>) {
    if (!arguments.length) return radius;
    radius =
      value == null || typeof value === "function"
        ? value
        : +value;
    return layout;
  };

  layout.padding = function (value?: number) {
    if (!arguments.length) return padding;
    padding = +value!;
    return layout;
  };

  return ii(layout, hierarchy);
}
*/


