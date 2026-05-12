import assert from 'node:assert';


export function removeAdditionalProperties(schema: any): any {
    if (schema.type === 'object') {
        assert(schema.properties);
        assert(!schema.additionalProperties);
        assert(!schema.patternProperties);
        return {
            ...schema,
            additionalProperties: undefined,
            properties: Object.fromEntries(
                Object.entries(schema.properties).map(
                    ([key, subschema]) => [key, removeAdditionalProperties(subschema)],
                )
            ),
        };
    } else if (schema.type === 'array')
        return {
            ...schema,
            items: schema.items instanceof Array ? schema.items.map(removeAdditionalProperties) : removeAdditionalProperties(schema.items),
        };
    else if (schema.anyOf)
        return {
            ...schema,
            anyOf: schema.anyOf.map(removeAdditionalProperties),
        };
    else if (schema.oneOf)
        return {
            ...schema,
            oneOf: schema.oneOf.map(removeAdditionalProperties),
        };
    else if (schema.allOf)
        return {
            ...schema,
            allOf: schema.allOf.map(removeAdditionalProperties),
        };
    else
        return schema;
}


export function addAdditionalProperties(schema: any): any {
    if (schema.type === 'object') {
        assert(schema.properties);
        assert(!schema.additionalProperties);
        assert(!schema.patternProperties);
        return {
            ...schema,
            additionalProperties: false,
            properties: Object.fromEntries(
                Object.entries(schema.properties).map(
                    ([key, subschema]) => [key, addAdditionalProperties(subschema)],
                )
            ),
        };
    } else if (schema.type === 'array')
        return {
            ...schema,
            items: schema.items instanceof Array ? schema.items.map(addAdditionalProperties) : addAdditionalProperties(schema.items),
        };
    else if (schema.anyOf)
        return {
            ...schema,
            anyOf: schema.anyOf.map(addAdditionalProperties),
        };
    else if (schema.oneOf)
        return {
            ...schema,
            oneOf: schema.oneOf.map(addAdditionalProperties),
        };
    else if (schema.allOf)
        return {
            ...schema,
            allOf: schema.allOf.map(addAdditionalProperties),
        };
    else
        return schema;
}
