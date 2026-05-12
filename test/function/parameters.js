import test from 'ava';
import { AssertionError } from 'node:assert';
import { Type } from 'typebox';
import { addAdditionalProperties, removeAdditionalProperties } from '../../build/function/parameters.js';


test('Function parameters add additionalProperties to nested objects', t => {
    const schema = Type.Object({
        regular: Type.Array(Type.Object({
            x: Type.String(),
        })),
        tuple: Type.Tuple([
            Type.Object({
                y: Type.String(),
            }),
        ]),
        union: Type.Union([
            Type.Object({
                z: Type.String(),
            }),
            Type.String(),
        ]),
    });

    const encoded = addAdditionalProperties(schema);

    t.is(encoded.additionalProperties, false);
    t.is(encoded.properties.regular.items.additionalProperties, false);
    t.is(encoded.properties.tuple.items[0].additionalProperties, false);
    t.is(encoded.properties.union.anyOf[0].additionalProperties, false);
});

test('Function parameters remove additionalProperties from nested objects', t => {
    const schema = Type.Object({
        regular: Type.Array(Type.Object({
            x: Type.String(),
        })),
        tuple: Type.Tuple([
            Type.Object({
                y: Type.String(),
            }),
        ]),
        union: Type.Union([
            Type.Object({
                z: Type.String(),
            }),
            Type.String(),
        ]),
    });

    const encoded = removeAdditionalProperties(schema);

    t.is(encoded.additionalProperties, undefined);
    t.is(encoded.properties.regular.items.additionalProperties, undefined);
    t.is(encoded.properties.tuple.items[0].additionalProperties, undefined);
    t.is(encoded.properties.union.anyOf[0].additionalProperties, undefined);
});

test('Function parameters reject record schemas', t => {
    const schema = Type.Object({
        record: Type.Record(Type.String(), Type.String()),
    });

    t.throws(() => addAdditionalProperties(schema), { instanceOf: AssertionError });
    t.throws(() => removeAdditionalProperties(schema), { instanceOf: AssertionError });
});
