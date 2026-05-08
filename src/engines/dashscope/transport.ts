import { type Session } from '../../engine/session.ts';
import { Function } from '../../function.ts';
import OpenAI from 'openai';
import { Transport as OpenAIResponsesTransport } from '../openai-responses/transport.ts';


export class Transport<
    in out fdm extends Function.Decl.Map.Proto,
> extends OpenAIResponsesTransport<fdm> {

    protected override makeParams(
        session: Session.From<fdm>,
    ): OpenAI.Responses.ResponseCreateParamsStreaming {
        const params = super.makeParams(session);
        if (params.tool_choice === 'required') params.tool_choice = 'auto';
        return params;
    }
}

export namespace Transport {
    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
    > extends OpenAIResponsesTransport.Options<fdm> {}
}
