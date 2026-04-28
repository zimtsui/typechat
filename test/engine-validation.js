import test from 'ava';
import { Type } from 'typebox';
import { MIMEType } from 'whatwg-mimetype';
import { Throttle } from '../build/throttle.js';
import { Engine } from '../build/engine.js';
import { Recoverable } from '../build/engine/recoverable.js';
import * as VerbatimCodec from '../build/verbatim/codec.js';
import { StructuringChoice } from '../build/engines/compatible/structuring-choice.js';
import { StructuringValidator as CompatibleStructuringValidator } from '../build/engines/compatible/structuring-validator.js';
import { PartsValidator } from '../build/engine/parts-validator.js';
import { RoleMessage } from '../build/message.js';
import { OpenAIResponsesStructuringChoice } from '../build/engines/openai-responses/structuring-choice.js';
import { StructuringValidator as OpenAIResponsesStructuringValidator } from '../build/engines/openai-responses/structuring-validator.js';
import { NativeRoleMessage as OpenAIResponsesRoleMessage } from '../build/engines/openai-responses/message.js';
import { NativeRoleMessage as GoogleRoleMessage } from '../build/engines/google/message.js';


const functionDeclarationMap = {
    noop: {
        description: 'No-op tool.',
        parameters: Type.Object({}),
    },
};

const verbatimDeclarationMap = {
    note: {
        description: 'A note.',
        parameters: {
            body: {
                description: 'Body text.',
                mimeType: new MIMEType('text/plain'),
                required: false,
            },
        },
    },
};

function getOnlyText(message) {
    const parts = message.getParts();
    return parts[0].text;
}

test('Verbatim system codec wraps escaped XML body text', t => {
    const xml = VerbatimCodec.System.encode('a & b < c > d');

    t.is(xml.trim(), '<verbatim:system>a &amp; b &lt; c &gt; d</verbatim:system>');
});

test('Compatible validator returns verbatim meta feedback when request is missing', t => {
    const validator = new CompatibleStructuringValidator({
        structuringChoice: StructuringChoice.VRequest.REQUIRED,
    });
    const aiMessage = new RoleMessage.Ai([
        RoleMessage.Ai.Part.Text.paragraph('plain text'),
    ]);

    const rejection = validator.validate(aiMessage);

    t.truthy(rejection);
    t.regex(getOnlyText(rejection), /<verbatim:system>Error: No valid verbatim request found\. Check your output format\.<\/verbatim:system>\n\n$/);
});

test('OpenAI Responses validator returns verbatim meta feedback when request is missing', t => {
    const validator = new OpenAIResponsesStructuringValidator({
        structuringChoice: OpenAIResponsesStructuringChoice.VRequest.REQUIRED,
    });
    const aiMessage = new OpenAIResponsesRoleMessage.Ai([
        OpenAIResponsesRoleMessage.Ai.Part.Text.paragraph('plain text'),
    ], []);

    const rejection = validator.validate(aiMessage);

    t.truthy(rejection);
    t.regex(getOnlyText(rejection), /<verbatim:system>Error: No valid verbatim request found\. Check your output format\.<\/verbatim:system>\n\n$/);
});

test('Parts validator ignores Google executable code and code execution result text', t => {
    const validator = new PartsValidator();
    const aiMessage = new GoogleRoleMessage.Ai([
        new GoogleRoleMessage.Ai.Part.ExecutableCode('ab'.repeat(50), 'python'),
        new GoogleRoleMessage.Ai.Part.CodeExecutionResult('ok', 'ab'.repeat(50)),
    ], { parts: [] });

    t.notThrows(() => validator.validate(aiMessage));
});

test('Engine stateful retries validator rejection without mutating session by default', async t => {
    class FakeEngine extends Engine.Instance {
        constructor(responses, structuringValidator, partsValidator) {
            super({
                throttle: new Throttle(Number.POSITIVE_INFINITY),
                endpointSpec: {
                    name: 'Fake Engine',
                    baseUrl: 'https://example.invalid/fake',
                    apiKey: 'test-key',
                    model: 'test-model',
                    apiType: 'openai-responses',
                    parallelToolCall: false,
                },
                functionDeclarationMap,
                verbatimDeclarationMap,
                inferenceRetry: 1,
            });
            this.structuringValidator = structuringValidator;
            this.partsValidator = partsValidator;
            this.transport = {
                fetch: async () => responses.shift(),
            };
        }

        clone() {
            const engine = new FakeEngine(responses, this.structuringValidator, this.partsValidator);
            engine.middlewares = [...this.middlewares];
            engine.statefulMiddlewares = [...this.statefulMiddlewares];
            return engine;
        }
    }

    const responses = [
        { kind: 'invalid' },
        { kind: 'valid' },
    ];
    const rejection = new RoleMessage.User([
        RoleMessage.User.Part.Text.paragraph(
            VerbatimCodec.System.encode('Error: No valid verbatim request found. Check your output format.'),
        ),
    ]);
    const engine = new FakeEngine(responses, {
        validate(message) {
            if (message.kind === 'invalid') return rejection;
        },
    }, {
        validate() {},
    });
    const session = { chatMessages: [] };

    const response = await engine.stateful({}, session);

    t.is(response.kind, 'valid');
    t.deepEqual(session.chatMessages, [
        { kind: 'valid' },
    ]);
});

test('Engine Recoverable middleware appends validator rejection into session history', async t => {
    class FakeEngine extends Engine.Instance {
        constructor(responses, structuringValidator, partsValidator) {
            super({
                throttle: new Throttle(Number.POSITIVE_INFINITY),
                endpointSpec: {
                    name: 'Fake Engine',
                    baseUrl: 'https://example.invalid/fake',
                    apiKey: 'test-key',
                    model: 'test-model',
                    apiType: 'openai-responses',
                    parallelToolCall: false,
                },
                functionDeclarationMap,
                verbatimDeclarationMap,
                inferenceRetry: 1,
            });
            this.structuringValidator = structuringValidator;
            this.partsValidator = partsValidator;
            this.transport = {
                fetch: async () => responses.shift(),
            };
        }

        clone() {
            const engine = new FakeEngine(responses, this.structuringValidator, this.partsValidator);
            engine.middlewares = [...this.middlewares];
            engine.statefulMiddlewares = [...this.statefulMiddlewares];
            return engine;
        }
    }

    const responses = [
        { kind: 'invalid' },
        { kind: 'valid' },
    ];
    const rejection = new RoleMessage.User([
        RoleMessage.User.Part.Text.paragraph(
            VerbatimCodec.System.encode('Error: No valid verbatim request found. Check your output format.'),
        ),
    ]);
    const engine = new FakeEngine(responses, {
        validate(message) {
            if (message.kind === 'invalid') return rejection;
        },
    }, {
        validate() {},
    });
    const recoveringEngine = engine.use(Recoverable.recover);
    const session = { chatMessages: [] };

    const response = await recoveringEngine.stateful({}, session);

    t.is(response.kind, 'valid');
    t.deepEqual(session.chatMessages, [
        { kind: 'invalid' },
        rejection,
        { kind: 'valid' },
    ]);
});

