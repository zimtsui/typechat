import { Function } from '../function.ts';
import { type InferenceContext } from '../inference-context.ts';
import { Session } from './session.ts';
import { RoleMessage } from './message.ts';
import { Verbatim } from '../verbatim.ts';


export interface Middleware<
    in out fdu extends Function.Decl.Proto,
    in out vdu extends Verbatim.Decl.Proto,
> {
    (
        wfctx: InferenceContext,
        session: Session<fdu, vdu>,
        next: () => Promise<RoleMessage.Ai<fdu, vdu>>,
    ): Promise<RoleMessage.Ai<fdu, vdu>>;
}
export namespace Middleware {
    export type From<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    > = Middleware<
        Function.Decl.From<fdm>,
        Verbatim.Decl.From<vdm>
    >;
}
