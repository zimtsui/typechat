import type { InferenceContext } from './inference-context.ts';
import { Mutex } from '@zimtsui/typelocks';


export class Throttle {
    protected valve = new Mutex.Void();
    protected timer: NodeJS.Timeout | null = null;
    protected interval: number;
    public constructor(protected rpm: number) {
        this.interval = Math.ceil(60*1000 / this.rpm);
    }

    public async requests(wfctx: InferenceContext): Promise<void> {
        if (this.interval === 0) return;

        await using lock = await wfctx.busy?.acquireReadRaii();

        wfctx.signal?.throwIfAborted();

        const waiting = this.valve.acquire()
            .then(() => {
                this.timer = setTimeout(
                    () => {
                        this.timer = null;
                        void this.valve.release();
                    },
                    this.interval,
                );
            });

        await new Promise<void>((resolve, reject) => {
            waiting.then(resolve, reject);
            wfctx.signal?.addEventListener('abort', reject, { signal: wfctx.signal });
        });

    }

    public abort(e: unknown) {
        if (this.timer) clearTimeout(this.timer);
        this.valve.abort(e);
    }
}
