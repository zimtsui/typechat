import { Function } from '../function.ts';
import { type InferenceContext } from '../inference-context.ts';
import { Session } from './session.ts';
import { RoleMessage } from './message.ts';


export interface Middleware<
    in out fdu extends Function.Decl.Proto,
> {
    (
        wfctx: InferenceContext,
        session: Session<fdu>,
        next: () => Promise<RoleMessage.Ai<fdu>>,
    ): Promise<RoleMessage.Ai<fdu>>;
}
export namespace Middleware {
    export type From<
        fdm extends Function.Decl.Map.Proto,
    > = Middleware<
        Function.Decl.From<fdm>
    >;
}
