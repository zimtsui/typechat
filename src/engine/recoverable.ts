import { Function } from '../function.ts';
import { type InferenceContext } from '../inference-context.ts';
import { Session } from './session.ts';
import { RoleMessage } from './message.ts';
import { Verbatim } from "../verbatim.js";


export class Recoverable<
    in out fdu extends Function.Decl.Proto,
    in out vdu extends Verbatim.Decl.Proto,
> extends SyntaxError {
    public constructor(
        protected response: RoleMessage.Ai<fdu, vdu>,
        protected rejection: RoleMessage.User<never>,
        ...rest: ConstructorParameters<typeof SyntaxError>
    ) {
        super(...rest);
    }
    public resume(): RoleMessage.Ai<fdu, vdu> {
        return this.response;
    }
    public recover(): RoleMessage.User<never> {
        return this.rejection;
    }

    public static async recover<
        fdu extends Function.Decl.Proto,
        vdu extends Verbatim.Decl.Proto,
    >(
        wfctx: InferenceContext,
        session: Session<fdu, vdu>,
        next: () => Promise<RoleMessage.Ai<fdu, vdu>>,
    ): Promise<RoleMessage.Ai<fdu, vdu>> {
        try {
            return await next();
        } catch (e) {
            if (e instanceof Recoverable) {} else throw e;
            const recoverable = e as Recoverable<fdu, vdu>;
            session.chatMessages.push(recoverable.resume(), recoverable.recover());
            throw e;
        }
    }
}
