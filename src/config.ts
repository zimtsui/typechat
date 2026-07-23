import { Type, type Static } from 'typebox';


export namespace Endpoint {
    export type Config = Static<typeof Config.schema>;
    export namespace Config {
        export const schema = Type.Object({
            baseUrl: Type.String(),
            model: Type.String(),
            name: Type.String(),
            apiType: Type.Union([
                Type.Literal('openai-chatcompletions'),
                Type.Literal('openai-responses'),
                Type.Literal('google'),
                Type.Literal('anthropic'),
                Type.Literal('openai-compatible'),
            ]),
            inputPrice: Type.Optional(Type.Number()),
            outputPrice: Type.Optional(Type.Number()),
            cachePrice: Type.Optional(Type.Number()),
            parallelToolCall: Type.Optional(Type.Boolean()),
            additionalHeaders: Type.Optional(Type.Record(Type.String(), Type.String())),
            additionalOptions: Type.Optional(Type.Record(Type.String(), Type.Any())),
            rpm: Type.Optional(Type.Number({ minimum: 1 })),
            timeout: Type.Optional(Type.Number({ minimum: 0 })),
        });
    }


    export type Secret = Static<typeof Secret.schema>;
    export namespace Secret {
        export const schema = Type.Object({
            proxy: Type.Optional(Type.String()),
            apiKey: Type.String(),
        });
    }

}


export type Config = Static<typeof Config.schema>;
export namespace Config {
    export const schema = Type.Object({
        endpoints: Type.Record(Type.String(), Endpoint.Config.schema),
    });
}

export type Secret = Static<typeof Secret.schema>;
export namespace Secret {
    export const schema = Type.Object({
        endpoints: Type.Record(Type.String(), Endpoint.Secret.schema),
    });
}
