import { Function } from '../function.ts';
import { type InferenceContext } from '../inference-context.ts';
import { Session } from './session.ts';
import { RoleMessage } from './message.ts';



export interface Transport<
    in out fdm extends Function.Decl.Map.Proto,
> {
    fetch(
        wfctx: InferenceContext,
        session: Session.From<fdm>,
        signal?: AbortSignal,
    ): Promise<RoleMessage.Ai.From<fdm>>;
}
