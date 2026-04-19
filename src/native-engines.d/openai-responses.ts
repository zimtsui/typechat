import { Function } from '../function.ts';
import * as SessionModule from './openai-responses/session.ts';
import { Engine } from '../engine.ts';
import { ToolCodec } from '../api-types/openai-responses/tool-codec.ts';
import { Billing } from '../api-types/openai-responses/billing.ts';
import { MessageCodec as CompatibleMessageCodec } from '../compatible-engine.d/openai-responses/message-codec.ts';
import * as ValidationModule from './openai-responses/validation.ts';
import type { Verbatim } from '../verbatim.ts';
import * as StructuringModule from './openai-responses/structuring.ts';
import * as ToolModule from './openai-responses/tool.ts';
import * as ChoiceCodecModule from './openai-responses/choice-codec.ts';
import * as MessageCodecModule from './openai-responses/message-codec.ts';
import * as TransportModule from './openai-responses/transport.ts';



export type OpenAIResponsesNativeEngine<
    fdm extends Function.Decl.Map.Proto,
    vdm extends Verbatim.Decl.Map.Proto,
> = OpenAIResponsesNativeEngine.Instance<fdm, vdm>;
export namespace OpenAIResponsesNativeEngine {
    export class Instance<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Engine.Instance<
        fdm, vdm,
        OpenAIResponsesNativeEngine.RoleMessage.User.From<fdm>,
        OpenAIResponsesNativeEngine.RoleMessage.Ai.From<fdm, vdm>,
        OpenAIResponsesNativeEngine.RoleMessage.Developer,
        OpenAIResponsesNativeEngine.Session.From<fdm, vdm>
    > {
        protected applyPatch: boolean;
        protected choice: OpenAIResponsesNativeEngine.Structuring.Choice.From<fdm, vdm>;

        protected toolCodec: ToolCodec<fdm>;
        protected compatibleMessageCodec: CompatibleMessageCodec<fdm, vdm>;
        protected messageCodec: OpenAIResponsesNativeEngine.MessageCodec<fdm, vdm>;
        protected billing: Billing;
        protected override structuringValidator: OpenAIResponsesNativeEngine.StructuringValidator.From<fdm, vdm>;
        protected override partsValidator: OpenAIResponsesNativeEngine.PartsValidator.From<fdm, vdm>;
        protected transport: OpenAIResponsesNativeEngine.Transport<fdm, vdm>;

        public constructor(protected options: OpenAIResponsesNativeEngine.Options<fdm, vdm>) {
            super(options);
            this.applyPatch = options.applyPatch ?? false;
            this.choice = options.structuringChoice ?? OpenAIResponsesNativeEngine.Structuring.Choice.AUTO;

            this.toolCodec = new ToolCodec({ fdm: this.fdm });
            this.compatibleMessageCodec = new CompatibleMessageCodec({
                toolCodec: this.toolCodec,
                vdm: this.vdm,
            });
            this.messageCodec = new OpenAIResponsesNativeEngine.MessageCodec({
                toolCodec: this.toolCodec,
                compatibleMessageCodec: this.compatibleMessageCodec,
                vdm: this.vdm,
            });
            this.billing = new Billing({ pricing: this.pricing });
            this.structuringValidator = new OpenAIResponsesNativeEngine.StructuringValidator({ structuringChoice: this.choice });
            this.partsValidator = new OpenAIResponsesNativeEngine.PartsValidator();
            this.transport = new OpenAIResponsesNativeEngine.Transport({
                inferenceParams: this.inferenceParams,
                providerSpec: this.providerSpec,
                fdm: this.fdm,
                throttle: this.throttle,
                choice: this.choice,
                applyPatch: this.applyPatch,
                messageCodec: this.messageCodec,
                toolCodec: this.toolCodec,
                billing: this.billing,
            });
        }

        public override appendUserMessage(
            session: OpenAIResponsesNativeEngine.Session.From<fdm, vdm>,
            message: OpenAIResponsesNativeEngine.RoleMessage.User.From<fdm>,
        ): OpenAIResponsesNativeEngine.Session.From<fdm, vdm> {
            return {
                developerMessage: session.developerMessage,
                chatMessages: [...session.chatMessages, message],
            };
        }

        public override pushUserMessage(
            session: OpenAIResponsesNativeEngine.Session.From<fdm, vdm>,
            message: OpenAIResponsesNativeEngine.RoleMessage.User.From<fdm>,
        ): OpenAIResponsesNativeEngine.Session.From<fdm, vdm> {
            session.chatMessages.push(message);
            return session;
        }

        public override clone(): OpenAIResponsesNativeEngine.Instance<fdm, vdm> {
            const engine = new OpenAIResponsesNativeEngine.Instance(this.options);
            engine.middlewares = [...this.middlewares];
            engine.statefulMiddlewares = [...this.statefulMiddlewares];
            return engine;
        }
    }

    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Engine.Options<fdm, vdm> {
        applyPatch?: boolean;
        structuringChoice?: OpenAIResponsesNativeEngine.Structuring.Choice.From<fdm, vdm>;
    }

    export import Session = SessionModule.Session;
    export import RoleMessage = SessionModule.RoleMessage;
    export import Tool = ToolModule.Tool;
    export import ChoiceCodec = ChoiceCodecModule;
    export import MessageCodec = MessageCodecModule.MessageCodec;
    export import Structuring = StructuringModule.Structuring;
    export import Transport = TransportModule.Transport;
    export import StructuringValidator = ValidationModule.StructuringValidator;
    export import PartsValidator = ValidationModule.PartsValidator;
}
