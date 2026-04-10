
export function isRepeating(str: string, len: number, count: number): boolean {
    if (count) {} else return true;
    if (len <= 0) return true;
    const { queryLcp, queryLcs } = makeQueries(str);

    for (let period = len; period <= str.length; period++)
        for (let i = 0, j = i + period; j <= str.length; i += period, j += period)
            if (queryLcp(i, j) + queryLcs(i, j) >= period * (count - 1))
                return true;

    return false;
}

function makeQueries(str: string) {
    const n = str.length;
    const queryLcp = makeStringQuery(str);
    const reverseQueryLcp = makeStringQuery(str.split('').reverse().join(''));
    const queryLcs = (lhs: number, rhs: number): number => reverseQueryLcp(n - lhs, n - rhs);
    return { queryLcp, queryLcs };
}

function makeStringQuery(str: string): (lhs: number, rhs: number) => number {
    const sa = makeSuffixArray(str);
    const rk = new Array<number>(sa.length);
    for (let i = 0; i < sa.length; i++) rk[sa[i]!] = i;
    return makeQuery(str.length, rk, makeHeight(str, sa, rk));
}

function makeSuffixArray(str: string): number[] {
    const sa = [...new Array(str.length+1).keys()];
    let rank = new Array<number>(sa.length);
    for (let i = 0; i < str.length; i++) rank[i] = str.charCodeAt(i) + 1;
    rank[str.length] = 0;

    for (let step = 1; step <= str.length; step <<= 1) {
        sa.sort((lhs, rhs) => {
            if (rank[lhs]! !== rank[rhs]!) return rank[lhs]! - rank[rhs]!;

            const lnext = lhs + step <= str.length ? rank[lhs + step]! : -1;
            const rnext = rhs + step <= str.length ? rank[rhs + step]! : -1;
            return lnext - rnext;
        });

        const next = new Array<number>(sa.length);
        next[sa[0]!] = 0;
        for (let i = 1; i < sa.length; i++) {
            const lhs = sa[i-1]!, rhs = sa[i]!;
            const lv = lhs + step <= str.length ? rank[lhs + step]! : -1;
            const rv = rhs + step <= str.length ? rank[rhs + step]! : -1;
            next[rhs] = next[lhs]! + +(rank[lhs]! !== rank[rhs]! || lv !== rv);
        }

        rank = next;
        if (rank[sa[sa.length-1]!] === str.length) break;
    }

    return sa;
}

function makeHeight(str: string, sa: number[], rk: number[]): number[] {
    const h = new Array<number>(sa.length - 1).fill(0);
    for (let i = 0, k = 0; i <= str.length; i++) {
        const r = rk[i]!;
        if (r === 0) continue;
        if (k) k--;
        for (const j = sa[r-1]!; i+k < str.length && j+k < str.length && str[i+k] === str[j+k]; ) k++;
        h[r-1] = k;
    }
    return h;
}

function makeQuery(len: number, rk: number[], h: number[]) {
    const LOG = new Array<number>(h.length+1).fill(0);
    for (let i = 2; i < LOG.length; i++) LOG[i] = LOG[i>>1]! + 1;

    const st: number[][] = [h.slice()];
    for (let e = 1; (1<<e) <= h.length; e++) {
        st[e] = new Array<number>(h.length-(1<<e)+1);
        for (let i = 0; i+(1<<e) <= h.length; i++)
            st[e]![i] = Math.min(st[e-1]![i]!, st[e-1]![i+(1<<(e-1))]!);
    }

    return (lhs: number, rhs: number): number => {
        if (lhs === rhs) return len - lhs;
        let lrk = rk[lhs]!, rrk = rk[rhs]!;
        if (lrk > rrk) [lrk, rrk] = [rrk, lrk];
        const d = rrk - lrk, e = LOG[d]!;
        return Math.min(st[e]![lrk]!, st[e]![rrk-(1<<e)]!);
    };
}
