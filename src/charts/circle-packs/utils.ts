import { PackNode, PackLink } from "../../types";

// Comparison Helpers
function ci(n: PackNode, t: PackNode): number {
    return t.value - n.value;
}

function ai(n: PackNode): PackNode[] | undefined {
    return n.children;
}

function li(n: PackNode): number {
    return n.value;
}

function _i(n: PackNode, t: PackNode): number {
    return n.value - t.value;
}

/**
 * Traverses the tree and applies a callback to each node (Post-order)
 */
function oi(n: PackNode | null, t: (node: PackNode) => void): void {
    if (!n) return;
    const e: PackNode[] = [n];
    const r: PackNode[] = [];
    let current: PackNode | undefined;

    while ((current = e.pop())) {
        r.push(current);
        const u = current.children;
        if (u && u.length) {
            for (let o = 0; o < u.length; o++) {
                e.push(u[o]);
            }
        }
    }
    while ((current = r.pop())) {
        t(current);
    }
}

const merge = (n: PackLink[][]): PackLink[] => {
    let o = 0;
    for (let u = 0; u < n.length; u++) o += n[u].length;
    const e = new Array(o);
    let i = n.length;
    while (--i >= 0) {
        const r = n[i];
        let t = r.length;
        while (--t >= 0) {
            e[--o] = r[t];
        }
    }
    return e;
};

function fi(n: PackNode[]): PackLink[] {
    return merge(
        n.map((node) =>
            (node.children || []).map((child) => ({
                source: node,
                target: child,
            }))
        )
    );
}

function M(n: any, t: any, e: Function) {
    return function (this: any, ...args: any[]) {
        const r = e.apply(t, args);
        return r === t ? n : r;
    };
}

function rebind(n: any, t: any, ...names: string[]) {
    for (let i = 0; i < names.length; i++) {
        const name = names[i];
        n[name] = M(n, t, t[name]);
    }
    return n;
}

function ii(n: any, t: any) {
    rebind(n, t, "sort", "children", "value");
    n.nodes = n;
    n.links = fi;
    return n;
}

/**
 * Creates the hierarchy logic
 */
export function oldHierarchy() {
    let t: (a: PackNode, b: PackNode) => number = ci;
    let e: (n: PackNode, d?: number) => PackNode[] | undefined = ai;
    let r: ((n: PackNode, d?: number) => number) | null = li;

    function n(i: PackNode): PackNode[] {
        const o: PackNode[] = [i];
        const a: PackNode[] = [];
        let u: PackNode | undefined;

        i.depth = 0;
        while ((u = o.pop())) {
            a.push(u);
            const children = e.call(n, u, u.depth);
            if (children && children.length) {
                for (let l = children.length - 1; l >= 0; l--) {
                    const f = children[l];
                    o.push(f);
                    f.parent = u;
                    f.depth = (u.depth || 0) + 1;
                }
                if (r) u.value = 0;
                u.children = children;
            } else {
                if (r) u.value = +r.call(n, u, u.depth || 0) || 0;
                delete u.children;
            }
        }

        oi(i, (node) => {
            if (t && node.children) node.children.sort(t);
            if (r && node.parent) node.parent.value += node.value;
        });

        return a;
    }

    n.sort = function (x?: (a: PackNode, b: PackNode) => number) {
        if (!arguments.length) return t;
        t = x!;
        return n;
    };

    n.children = function (x?: (n: PackNode) => PackNode[] | undefined) {
        if (!arguments.length) return e;
        e = x!;
        return n;
    };

    n.value = function (x?: (n: PackNode, d?: number) => number) {
        if (!arguments.length) return r;
        r = x!;
        return n;
    };

    return n;
}

// Packing Math Functions
function Ai(n: PackNode) {
    delete n._pack_next;
    delete n._pack_prev;
}

function Ei(n: PackNode) {
    n._pack_next = n._pack_prev = n;
}

function zi(n: PackNode, t: PackNode, e: PackNode) {
    let r = n.r + e.r;
    let i = t.x - n.x;
    let u = t.y - n.y;
    if (r && (i || u)) {
        let o = t.r + e.r;
        let a = i * i + u * u;
        o *= o;
        r *= r;
        const l = 0.5 + (r - o) / (2 * a);
        const c = Math.sqrt(Math.max(0, 2 * o * (r + a) - (r -= a) * r - o * o)) / (2 * a);
        e.x = n.x + l * i + c * u;
        e.y = n.y + l * u - c * i;
    } else {
        e.x = n.x + r;
        e.y = n.y;
    }
}

function Ci(n: PackNode, t: number, e: number, r: number) {
    const i = n.children;
    n.x = t + r * n.x;
    n.y = e + r * n.y;
    n.r *= r;
    if (i) {
        for (let u = 0; u < i.length; u++) {
            Ci(i[u], n.x, n.y, r);
        }
    }
}

function wi(n: PackNode, t: PackNode) {
    const e = n._pack_next!;
    n._pack_next = t;
    t._pack_prev = n;
    t._pack_next = e;
    e._pack_prev = t;
}

function ki(n: PackNode, t: PackNode) {
    const e = t.x - n.x;
    const r = t.y - n.y;
    const i = n.r + t.r;
    return 0.999 * i * i > e * e + r * r;
}

function Si(n: PackNode, t: PackNode) {
    n._pack_next = t;
    t._pack_prev = n;
}

function Ni(n: PackNode) {
    const e = n.children;
    if (e && e.length) {
        let f = Infinity, s = -Infinity, h = Infinity, p = -Infinity;
        
        const t = (node: PackNode) => {
            f = Math.min(node.x - node.r, f);
            s = Math.max(node.x + node.r, s);
            h = Math.min(node.y - node.r, h);
            p = Math.max(node.y + node.r, p);
        };

        e.forEach(Ei);
        let r = e[0];
        r.x = -r.r;
        r.y = 0;
        t(r);

        if (e.length > 1) {
            let i = e[1];
            i.x = i.r;
            i.y = 0;
            t(i);

            if (e.length > 2) {
                let u = e[2];
                zi(r, i, u);
                t(u);
                wi(r, u);
                r._pack_prev = u;
                wi(u, i);
                i = r._pack_next!;
                
                for (let o = 3; o < e.length; o++) {
                    zi(r, i, u = e[o]);
                    let g = 0, v = 1, d = 1;
                    for (let a = i._pack_next!; a !== i; a = a._pack_next!, v++) {
                        if (ki(a, u)) { g = 1; break; }
                    }
                    if (g === 1) {
                        for (let l = r._pack_prev!; l !== (e[o-1])._pack_prev && !ki(l, u); l = l._pack_prev!, d++);
                    }
                    if (g) {
                        if (d > v || (v === d && i.r < r.r)) Si(r, i = i._pack_next!);
                        else Si(r = r._pack_prev!, i);
                        o--;
                    } else {
                        wi(r, u);
                        i = u;
                        t(u);
                    }
                }
            }
        }
        const y = (f + s) / 2;
        const m = (h + p) / 2;
        let M_val = 0;
        for (let o = 0; o < e.length; o++) {
            const u_node = e[o];
            u_node.x -= y;
            u_node.y -= m;
            M_val = Math.max(M_val, u_node.r + Math.sqrt(u_node.x * u_node.x + u_node.y * u_node.y));
        }
        n.r = M_val;
        e.forEach(Ai);
    }
}

/**
 * Main Pack Export
 */
export function oldPack() {
    let t: any;
    let e = oldHierarchy().sort(_i);
    let r = 0;
    let i = [1, 1];

    function n(this: any, data: PackNode, u?: any) {
        const o = e(data, u) as PackNode[];
        const a = o[0];
        const l = i[0];
        const c = i[1];
        const f = t == null ? Math.sqrt : typeof t === "function" ? t : () => t;

        a.x = a.y = 0;
        oi(a, (node) => { node.r = +f(node.value); });
        oi(a, Ni);

        if (r) {
            const s = (r * (t ? 1 : Math.max((2 * a.r) / l, (2 * a.r) / c))) / 2;
            oi(a, (node) => { node.r += s; });
            oi(a, Ni);
            oi(a, (node) => { node.r -= s; });
        }

        Ci(a, l / 2, c / 2, t ? 1 : 1 / Math.max((2 * a.r) / l, (2 * a.r) / c));
        return o;
    }

    n.size = function (x?: [number, number]) {
        if (!arguments.length) return i;
        i = x!;
        return n;
    };

    n.radius = function (x?: any) {
        if (!arguments.length) return t;
        t = x == null || typeof x === "function" ? x : +x;
        return n;
    };

    n.padding = function (x?: number) {
        if (!arguments.length) return r;
        r = +x!;
        return n;
    };

    return ii(n, e);
}