import assert from 'node:assert/strict';
import test from 'node:test';
import { AssertionError } from 'node:assert';
import { Type } from 'typebox';
import { addAdditionalProperties, removeAdditionalProperties } from '../../build/function/parameters.js';


test('Function parameters add additionalProperties to nested objects', () => {
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

    assert.strictEqual(encoded.additionalProperties, false);
    assert.strictEqual(encoded.properties.regular.items.additionalProperties, false);
    assert.strictEqual(encoded.properties.tuple.items[0].additionalProperties, false);
    assert.strictEqual(encoded.properties.union.anyOf[0].additionalProperties, false);
});

test('Function parameters remove additionalProperties from nested objects', () => {
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

    assert.strictEqual(encoded.additionalProperties, undefined);
    assert.strictEqual(encoded.properties.regular.items.additionalProperties, undefined);
    assert.strictEqual(encoded.properties.tuple.items[0].additionalProperties, undefined);
    assert.strictEqual(encoded.properties.union.anyOf[0].additionalProperties, undefined);
});

test('Function parameters reject record schemas', () => {
    const schema = Type.Object({
        record: Type.Record(Type.String(), Type.String()),
    });

    assert.throws(() => addAdditionalProperties(schema), error => error instanceof AssertionError);
    assert.throws(() => removeAdditionalProperties(schema), error => error instanceof AssertionError);
});
