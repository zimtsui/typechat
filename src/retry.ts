import { type Function } from './function.ts';
import { type InferenceContext } from './inference-context.ts';
import { type Message } from './engine/message.ts';
import { type Session } from './engine/session.ts';
import { APIError, InferenceError, InferenceTimeout } from './engine/exceptions.ts';
import { loggers } from './telemetry.ts';


export function retry(options: Retry.Options = {}) {
    const providerRetry = options.providerRetry ?? 2;
    const inferenceRetry = options.inferenceRetry ?? 2;

    return async function <
        fdu extends Function.Decl.Proto,
        aim extends Message.Output<fdu>,
    >(
        _wfctx: InferenceContext,
        _session: Session<fdu>,
        next: () => Promise<aim>,
    ): Promise<aim> {
        for (let retriedProvider = 0, retriedInference = 0;;) try {
            return await next();
        } catch (e) {
            if (e instanceof InferenceTimeout || e instanceof InferenceError) {
                if (retriedInference < inferenceRetry) {} else throw e;
                loggers.message.warn(e);
                retriedInference++;
            } else if (e instanceof APIError) {
                if (retriedProvider < providerRetry) {} else throw e;
                loggers.message.warn(e);
                retriedProvider++;
            } else throw e;
        }
    };
}

export namespace Retry {
    export interface Options {
        providerRetry?: number;
        inferenceRetry?: number;
    }
}
