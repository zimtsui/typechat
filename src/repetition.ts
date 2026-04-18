
export function isRepeating(str: string, len = 256, threshold = .9): boolean {
    for (let i = 0; i + len <= str.length; i += len)
        if (diversity(str.slice(i, i + len)) < threshold)
            return true;

    return false;
}

function diversity(str: string): number {
    const sa = makeSuffixArray(str);
    const rk = new Array<number>(sa.length);
    for (let i = 0; i < sa.length; i++) rk[sa[i]!] = i;
    const total = str.length * (str.length + 1) / 2;
    let distinct = total;
    for (const x of makeHeight(str, sa, rk)) distinct -= x;
    return distinct / total;
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
