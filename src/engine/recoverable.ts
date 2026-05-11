import { Function } from '../function.ts';
import { type InferenceContext } from '../inference-context.ts';
import { Session } from './session.ts';
import { RoleMessage } from './message.ts';


export class Recoverable<
    in out fdu extends Function.Decl.Proto,
> extends SyntaxError {
    public constructor(
        protected response: RoleMessage.Ai<fdu>,
        protected rejection: RoleMessage.User<fdu>,
        ...rest: ConstructorParameters<typeof SyntaxError>
    ) {
        super(...rest);
    }
    public resume(): RoleMessage.Ai<fdu> {
        return this.response;
    }
    public recover(): RoleMessage.User<fdu> {
        return this.rejection;
    }

    public static async recover<
        fdu extends Function.Decl.Proto,
        aim extends RoleMessage.Ai<fdu>,
    >(
        wfctx: InferenceContext,
        session: Session<fdu>,
        next: () => Promise<aim>,
    ): Promise<aim> {
        try {
            return await next();
        } catch (e) {
            if (e instanceof Recoverable) {} else throw e;
            const recoverable = e as Recoverable<fdu>;
            session.chatMessages.push(recoverable.resume(), recoverable.recover());
            throw e;
        }
    }
}
