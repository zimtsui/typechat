import { Function } from '../function.ts';
import { CompatibleEngine } from '../compatible-engine.ts';
import * as MessageCodecModule from './openai-chatcompletions/message-codec.ts';
import * as TransportModule from './openai-chatcompletions/transport.ts';
import type { Verbatim } from '../verbatim.ts';
import * as ChoiceCodecModule from './openai-chatcompletions/choice-codec.ts';
import { ToolCodec } from '../api-types/openai-chatcompletions/tool-codec.ts';
import { Billing } from '../api-types/openai-chatcompletions/billing.ts';





export type OpenAIChatCompletionsCompatibleEngine<
    fdm extends Function.Decl.Map.Proto,
    vdm extends Verbatim.Decl.Map.Proto,
> = OpenAIChatCompletionsCompatibleEngine.Instance<fdm, vdm>;
export namespace OpenAIChatCompletionsCompatibleEngine {
    export abstract class Instance<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends CompatibleEngine.Instance<fdm, vdm> {
        protected toolCodec: ToolCodec<fdm>;
        protected messageCodec: MessageCodec<fdm, vdm>;
        protected billing: Billing;
        protected override transport: Transport<fdm, vdm>;

        public constructor(options: OpenAIChatCompletionsCompatibleEngine.Options<fdm, vdm>) {
            super(options);
            this.toolCodec = new ToolCodec({
                fdm: this.fdm,
            });
            this.messageCodec = new MessageCodec({
                toolCodec: this.toolCodec,
                vdm: this.vdm,
            });
            this.billing = new Billing({ pricing: this.pricing });
            this.transport = new OpenAIChatCompletionsCompatibleEngine.Transport({
                inferenceParams: this.inferenceParams,
                providerSpec: this.providerSpec,
                fdm: this.fdm,
                throttle: this.throttle,
                choice: this.choice,
                messageCodec: this.messageCodec,
                toolCodec: this.toolCodec,
                billing: this.billing,
            });
        }
    }

    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends CompatibleEngine.Options<fdm, vdm> {}

    export import Transport = TransportModule.Transport;
    export import MessageCodec = MessageCodecModule.MessageCodec;
    export import ChoiceCodec = ChoiceCodecModule;
}
