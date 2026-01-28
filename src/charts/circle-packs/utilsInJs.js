function d3v3hierarchy() {
        function n(i) {
            var u, o = [i], a = [];
            for (i.depth = 0; null != (u = o.pop()); )
                if (a.push(u),
                (c = e.call(n, u, u.depth)) && (l = c.length)) {
                    for (var l, c, f; --l >= 0; )
                        o.push(f = c[l]),
                        f.parent = u,
                        f.depth = u.depth + 1;
                    r && (u.value = 0),
                    u.children = c
                } else
                    r && (u.value = +r.call(n, u, u.depth) || 0),
                    delete u.children;
            return oi(i, function(n) {
                var e, i;
                t && (e = n.children) && e.sort(t),
                r && (i = n.parent) && (i.value += n.value)
            }),
            a
        }
        var t = ci
          , e = ai
          , r = li;
        return n.sort = function(e) {
            return arguments.length ? (t = e,
            n) : t
        }
        ,
        n.children = function(t) {
            return arguments.length ? (e = t,
            n) : e
        }
        ,
        n.value = function(t) {
            return arguments.length ? (r = t,
            n) : r
        }
        ,
        n.revalue = function(t) {
            return r && (ui(t, function(n) {
                n.children && (n.value = 0)
            }),
            oi(t, function(t) {
                var e;
                t.children || (t.value = +r.call(n, t, t.depth) || 0),
                (e = t.parent) && (e.value += t.value)
            })),
            t
        }
        ,
        n
}

export function d3v3pack() {
    function n(n, u) {
        var o = e.call(this, n, u)
            , a = o[0]
            , l = i[0]
            , c = i[1]
            , f = null == t ? Math.sqrt : "function" == typeof t ? t : function() {
            return t
        }
        ;
        if (a.x = a.y = 0,
        oi(a, function(n) {
            n.r = +f(n.value)
        }),
        oi(a, Ni),
        r) {
            var s = r * (t ? 1 : Math.max(2 * a.r / l, 2 * a.r / c)) / 2;
            oi(a, function(n) {
                n.r += s
            }),
            oi(a, Ni),
            oi(a, function(n) {
                n.r -= s
            })
        }
        return Ci(a, l / 2, c / 2, t ? 1 : 1 / Math.max(2 * a.r / l, 2 * a.r / c)),
        o
    }
    var t, e = d3v3hierarchy().sort(_i), r = 0, i = [1, 1];
    return n.size = function(t) {
        return arguments.length ? (i = t,
        n) : i
    }
    ,
    n.radius = function(e) {
        return arguments.length ? (t = null == e || "function" == typeof e ? e : +e,
        n) : t
    }
    ,
    n.padding = function(t) {
        return arguments.length ? (r = +t,
        n) : r
    }
    ,
    ii(n, e)
}