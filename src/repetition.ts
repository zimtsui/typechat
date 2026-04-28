
export function isRepeating(text: string, threshold = .9): boolean {
    text = text.split(/\s+/).join('');
    return text.length >= 1024 && diversity(text) < threshold;
}

export function diversity(text: string): number {
    const sa = makeSuffixArray(text);
    const rk = new Array<number>(sa.length);
    for (let i = 0; i < sa.length; i++) rk[sa[i]!] = i;
    const total = text.length * (text.length + 1) / 2;
    let distinct = total;
    for (const x of makeHeight(text, sa, rk)) distinct -= x;
    return distinct / total;
}

function makeSuffixArray(text: string): number[] {
    const sa = [...new Array(text.length+1).keys()];
    let rank = new Array<number>(sa.length);
    for (let i = 0; i < text.length; i++) rank[i] = text.charCodeAt(i) + 1;
    rank[text.length] = 0;

    for (let step = 1; step <= text.length; step <<= 1) {
        sa.sort((lhs, rhs) => {
            if (rank[lhs]! !== rank[rhs]!) return rank[lhs]! - rank[rhs]!;

            const lnext = lhs + step <= text.length ? rank[lhs + step]! : -1;
            const rnext = rhs + step <= text.length ? rank[rhs + step]! : -1;
            return lnext - rnext;
        });

        const next = new Array<number>(sa.length);
        next[sa[0]!] = 0;
        for (let i = 1; i < sa.length; i++) {
            const lhs = sa[i-1]!, rhs = sa[i]!;
            const lv = lhs + step <= text.length ? rank[lhs + step]! : -1;
            const rv = rhs + step <= text.length ? rank[rhs + step]! : -1;
            next[rhs] = next[lhs]! + +(rank[lhs]! !== rank[rhs]! || lv !== rv);
        }

        rank = next;
        if (rank[sa[sa.length-1]!] === text.length) break;
    }

    return sa;
}

function makeHeight(text: string, sa: number[], rk: number[]): number[] {
    const h = new Array<number>(sa.length - 1).fill(0);
    for (let i = 0, k = 0; i <= text.length; i++) {
        const r = rk[i]!;
        if (r === 0) continue;
        if (k) k--;
        for (const j = sa[r-1]!; i+k < text.length && j+k < text.length && text[i+k] === text[j+k]; ) k++;
        h[r-1] = k;
    }
    return h;
}
