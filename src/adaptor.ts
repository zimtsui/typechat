import { Config } from './config.ts';
import { Function } from './function.ts';
import { type CompatibleEngine } from './compatible-engine.ts';
import { Throttle } from './throttle.ts';
import { GoogleCompatibleEngine } from './compatible-engine.d/google.ts';
import { OpenAIResponsesCompatibleEngine } from './compatible-engine.d/openai-responses.ts';
import { AnthropicCompatibleEngine } from './compatible-engine.d/anthropic.ts';
import { OpenAIResponsesNativeEngine } from './native-engines.d/openai-responses.ts';
import { GoogleNativeEngine } from './native-engines.d/google.ts';
import type { Verbatim } from './verbatim.ts';
import { OpenAIChatCompletionsCompatibleEngine } from './compatible-engine.d/openai-chatcompletions.ts';


export class Adaptor {
    public static create(config: Config): Adaptor {
        return new Adaptor(config);
    }

    protected throttles = new Map<string, Throttle>();
    protected constructor(public config: Config) {
        for (const endpointId in this.config.typechat.endpoints) {
            const rpm = this.config.typechat.endpoints[endpointId]!.rpm ?? Number.POSITIVE_INFINITY;
            this.throttles.set(endpointId, new Throttle(rpm));
        }
    }

    public makeCompatibleEngine<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    >(adaptorOptions: Adaptor.CompatibleEngineOptions<fdm, vdm>): CompatibleEngine<fdm, vdm> {
        const endpointSpec = this.config.typechat.endpoints[adaptorOptions.endpoint];
        if (endpointSpec) {} else throw new Error();
        const throttle = this.throttles.get(adaptorOptions.endpoint);
        if (throttle) {} else throw new Error();
        const options: CompatibleEngine.Options<fdm, vdm> = {
            ...adaptorOptions,
            endpointSpec,
            throttle,
        };
        if (endpointSpec.apiType === 'openai-responses')
            return new OpenAIResponsesCompatibleEngine.Instance<fdm, vdm>(options);
        else if (endpointSpec.apiType === 'google')
            return new GoogleCompatibleEngine.Instance<fdm, vdm>(options);
        else if (endpointSpec.apiType === 'anthropic')
            return new AnthropicCompatibleEngine.Instance<fdm, vdm>(options);
        else if (endpointSpec.apiType === 'openai-chatcompletions')
            return new OpenAIChatCompletionsCompatibleEngine.Instance<fdm, vdm>(options);
        else throw new Error();
    }

    public makeOpenAIResponsesNativeEngine<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    >(adaptorOptions: Adaptor.OpenAIResponsesNativeEngineOptions<fdm, vdm>): OpenAIResponsesNativeEngine<fdm, vdm> {
        const endpointSpec = this.config.typechat.endpoints[adaptorOptions.endpoint];
        if (endpointSpec?.apiType === 'openai-responses') {} else throw new Error();
        const throttle = this.throttles.get(adaptorOptions.endpoint);
        if (throttle) {} else throw new Error();
        const options: OpenAIResponsesNativeEngine.Options<fdm, vdm> = {
            ...adaptorOptions,
            endpointSpec,
            throttle,
        };
        return new OpenAIResponsesNativeEngine.Instance(options);
    }

    public makeGoogleNativeEngine<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    >(adaptorOptions: Adaptor.GoogleNativeEngineOptions<fdm, vdm>): GoogleNativeEngine<fdm, vdm> {
        const endpointSpec = this.config.typechat.endpoints[adaptorOptions.endpoint];
        if (endpointSpec?.apiType === 'google') {} else throw new Error();
        const throttle = this.throttles.get(adaptorOptions.endpoint);
        if (throttle) {} else throw new Error();
        const options: GoogleNativeEngine.Options<fdm, vdm> = {
            ...adaptorOptions,
            endpointSpec,
            throttle,
        };
        return new GoogleNativeEngine.Instance(options);
    }
}

export namespace Adaptor {
    export interface CompatibleEngineOptions<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Omit<CompatibleEngine.Options<fdm, vdm>, 'endpointSpec' | 'throttle'> {
        endpoint: string;
    }

    export interface OpenAIResponsesNativeEngineOptions<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
     > extends Omit<OpenAIResponsesNativeEngine.Options<fdm, vdm>, 'endpointSpec' | 'throttle'> {
        endpoint: string;
    }

    export interface GoogleNativeEngineOptions<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Omit<GoogleNativeEngine.Options<fdm, vdm>, 'endpointSpec' | 'throttle'> {
        endpoint: string;
    }
}
