import test from 'ava';
import { Type } from 'typebox';
import { MIMEType } from 'whatwg-mimetype';
import { Throttle } from '../build/throttle.js';
import { Engine, Recoverable } from '../build/engine.js';
import * as VerbatimCodec from '../build/verbatim/codec.js';
import { Structuring as CompatibleStructuring } from '../build/compatible-engine/structuring.js';
import {
    StructuringValidator as CompatibleStructuringValidator,
    PartsValidator as CompatiblePartsValidator,
} from '../build/compatible-engine/validation.js';
import { RoleMessage as CompatibleRoleMessage } from '../build/compatible-engine/session.js';
import { Structuring as OpenAIStructuring } from '../build/native-engines.d/openai-responses/structuring.js';
import { StructuringValidator as OpenAIResponsesStructuringValidator } from '../build/native-engines.d/openai-responses/validation.js';
import { RoleMessage as OpenAIResponsesRoleMessage } from '../build/native-engines.d/openai-responses/session.js';
import { PartsValidator as GooglePartsValidator } from '../build/native-engines.d/google/validation.js';
import { RoleMessage as GoogleRoleMessage } from '../build/native-engines.d/google/session.js';


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
        structuringChoice: CompatibleStructuring.Choice.VRequest.REQUIRED,
    });
    const aiMessage = new CompatibleRoleMessage.Ai([
        CompatibleRoleMessage.Part.Text.paragraph('plain text'),
    ]);

    const rejection = validator.validate(aiMessage);

    t.truthy(rejection);
    t.regex(getOnlyText(rejection), /<verbatim:system>Error: No valid verbatim request found\. Check your output format\.<\/verbatim:system>\n\n$/);
});

test('OpenAI Responses validator returns verbatim meta feedback when request is missing', t => {
    const validator = new OpenAIResponsesStructuringValidator({
        structuringChoice: OpenAIStructuring.Choice.VRequest.REQUIRED,
    });
    const aiMessage = new OpenAIResponsesRoleMessage.Ai([
        OpenAIResponsesRoleMessage.Part.Text.paragraph('plain text'),
    ], []);

    const rejection = validator.validate(aiMessage);

    t.truthy(rejection);
    t.regex(getOnlyText(rejection), /<verbatim:system>Error: No valid verbatim request found\. Check your output format\.<\/verbatim:system>\n\n$/);
});

test('Google parts validator ignores executable code and code execution result', t => {
    const validator = new GooglePartsValidator();
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

        appendUserMessage(session, message) {
            return {
                developerMessage: session.developerMessage,
                chatMessages: [...session.chatMessages, message],
            };
        }

        pushUserMessage(session, message) {
            session.chatMessages.push(message);
            return session;
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
    const rejection = new CompatibleRoleMessage.User([
        CompatibleRoleMessage.Part.Text.paragraph(
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

        appendUserMessage(session, message) {
            return {
                developerMessage: session.developerMessage,
                chatMessages: [...session.chatMessages, message],
            };
        }

        pushUserMessage(session, message) {
            session.chatMessages.push(message);
            return session;
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
    const rejection = new CompatibleRoleMessage.User([
        CompatibleRoleMessage.Part.Text.paragraph(
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
