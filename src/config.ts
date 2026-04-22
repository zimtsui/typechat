import { Type, type Static } from 'typebox';
import { EndpointSpec } from './endpoint-spec.ts';


export type Config = Static<typeof Config.schema>;
export namespace Config {
    export const schema = Type.Object({
        endpoints: Type.Record(Type.String(), EndpointSpec.schema),
    });
}
