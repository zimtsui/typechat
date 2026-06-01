import { Function } from '../function.ts';
import { type InferenceContext } from '../inference-context.ts';
import { Session } from './session.ts';
import { Message } from './message.ts';


export interface Middleware<
    in out fdu extends Function.Decl.Proto,
> {
    <aim extends Message.Output<fdu>>(
        wfctx: InferenceContext,
        session: Session<fdu>,
        next: () => Promise<aim>,
    ): Promise<aim>;
}
export namespace Middleware {
    export type From<
        fdm extends Function.Decl.Map.Proto,
    > = Middleware<
        Function.Decl.From<fdm>
    >;
}
