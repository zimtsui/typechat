import { Function } from '../function.ts';
import { type InferenceContext } from '../inference-context.ts';
import { Session } from './session.ts';
import { Message } from './message.ts';



export interface Transport<
    in out fdm extends Function.Decl.Map.Proto,
> {
    fetch(
        wfctx: InferenceContext,
        session: Session.From<fdm>,
        signal?: AbortSignal,
    ): Promise<Message.Output.From<fdm>>;
}
