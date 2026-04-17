import test from 'ava';
import { Type } from '@sinclair/typebox';
import { MIMEType } from 'whatwg-mimetype';
import { Function } from '../build/function.js';
import { Media } from '../build/media.js';
import { RoleMessage as CompatibleRoleMessage } from '../build/compatible-engine/session.js';
import { ToolCodec as AnthropicToolCodec } from '../build/api-types/anthropic/tool-codec.js';
import { ToolCodec as GoogleToolCodec } from '../build/api-types/google/tool-codec.js';
import { ToolCodec as OpenAIChatCompletionsToolCodec } from '../build/api-types/openai-chatcompletions/tool-codec.js';
import { ToolCodec as OpenAIResponsesToolCodec } from '../build/api-types/openai-responses/tool-codec.js';
import { MessageCodec as AnthropicMessageCodec } from '../build/compatible-engine.d/anthropic/message-codec.js';
import * as AnthropicChoiceCodec from '../build/compatible-engine.d/anthropic/choice-codec.js';
import { MessageCodec as GoogleMessageCodec } from '../build/compatible-engine.d/google/message-codec.js';
import { MessageCodec as OpenAIChatCompletionsMessageCodec } from '../build/compatible-engine.d/openai-chatcompletions/message-codec.js';
import { MessageCodec as OpenAIResponsesMessageCodec } from '../build/compatible-engine.d/openai-responses/message-codec.js';
import { Structuring as CompatibleStructuring } from '../build/compatible-engine/structuring.js';
import { Transport as OpenAIChatCompletionsTransport } from '../build/compatible-engine.d/openai-chatcompletions/transport.js';
import { Transport as OpenAIResponsesTransport } from '../build/compatible-engine.d/openai-responses/transport.js';
import { Transport as VolcengineTransport } from '../build/compatible-engine.d/volcengine/transport.js';
import { Transport as OpenAIResponsesNativeTransport } from '../build/native-engines.d/openai-responses/transport.js';


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
            },
        },
    },
};

test('OpenAI responses codec encodes multimodal user message', t => {
    const toolCodec = new OpenAIResponsesToolCodec({ fdm: functionDeclarationMap });
    const messageCodec = new OpenAIResponsesMessageCodec({
        toolCodec,
        vdm: verbatimDeclarationMap,
    });
    const userMessage = new CompatibleRoleMessage.User([
        new CompatibleRoleMessage.Part.Text('Hello.\n', []),
        new Media.Image({
            mimeType: new MIMEType('image/png'),
            base64: 'aGVsbG8=',
            resolution: 2,
        }),
        new Media.Pdf('cGRm'),
        Function.Response.Successful.of({
            id: 'call_1',
            name: 'noop',
            text: 'done',
        }),
    ]);

    const encoded = messageCodec.encodeUserMessage(userMessage);

    t.deepEqual(encoded, [
        {
            type: 'message',
            role: 'user',
            content: [
                {
                    type: 'input_text',
                    text: 'Hello.\n',
                },
                {
                    type: 'input_image',
                    image_url: 'data:image/png;base64,aGVsbG8=',
                    detail: 'high',
                },
                {
                    type: 'input_file',
                    file_data: 'data:application/pdf;base64,cGRm',
                },
            ],
        },
        {
            type: 'function_call_output',
            call_id: 'call_1',
            output: 'done',
        },
    ]);
});

test('OpenAI responses codec encodes PDF file input as raw base64', t => {
    const toolCodec = new OpenAIResponsesToolCodec({ fdm: functionDeclarationMap });
    const messageCodec = new OpenAIResponsesMessageCodec({
        toolCodec,
        vdm: verbatimDeclarationMap,
    });
    const userMessage = new CompatibleRoleMessage.User([
        new Media.Pdf('cGRm'),
    ]);

    const encoded = messageCodec.encodeUserMessage(userMessage);

    t.deepEqual(encoded, [{
        type: 'message',
        role: 'user',
        content: [{
            type: 'input_file',
            file_data: 'data:application/pdf;base64,cGRm',
        }],
    }]);
});

test('OpenAI responses codec omits empty user message for pure tool responses', t => {
    const toolCodec = new OpenAIResponsesToolCodec({ fdm: functionDeclarationMap });
    const messageCodec = new OpenAIResponsesMessageCodec({
        toolCodec,
        vdm: verbatimDeclarationMap,
    });
    const userMessage = new CompatibleRoleMessage.User([
        Function.Response.Successful.of({
            id: 'call_1',
            name: 'noop',
            text: 'done',
        }),
    ]);

    const encoded = messageCodec.encodeUserMessage(userMessage);

    t.deepEqual(encoded, [{
        type: 'function_call_output',
        call_id: 'call_1',
        output: 'done',
    }]);
});

test('Google compatible codec encodes PDF user message', t => {
    const toolCodec = new GoogleToolCodec({ fdm: functionDeclarationMap });
    const messageCodec = new GoogleMessageCodec({
        toolCodec,
        vdm: verbatimDeclarationMap,
    });
    const userMessage = new CompatibleRoleMessage.User([
        new Media.Pdf('cGRm'),
    ]);

    const encoded = messageCodec.encodeUserMessage(userMessage);

    t.is(encoded.role, 'user');
    t.deepEqual(encoded.parts, [{
        inlineData: {
            data: 'cGRm',
            mimeType: 'application/pdf',
        },
        mediaResolution: {
            level: 'MEDIA_RESOLUTION_MEDIUM',
        },
    }]);
});

test('Anthropic compatible codec rejects media user message', t => {
    const toolCodec = new AnthropicToolCodec({ fdm: functionDeclarationMap });
    const messageCodec = new AnthropicMessageCodec({
        toolCodec,
        vdm: verbatimDeclarationMap,
    });
    const userMessage = new CompatibleRoleMessage.User([
        new Media.Pdf('cGRm'),
    ]);

    const error = t.throws(() => messageCodec.encodeUserMessage(userMessage));

    t.truthy(error);
});

test('OpenAI chat completions codec rejects media user message', t => {
    const toolCodec = new OpenAIChatCompletionsToolCodec({ fdm: functionDeclarationMap });
    const messageCodec = new OpenAIChatCompletionsMessageCodec({
        toolCodec,
        vdm: verbatimDeclarationMap,
    });
    const userMessage = new CompatibleRoleMessage.User([
        new Media.Image({
            mimeType: new MIMEType('image/png'),
            base64: 'aGVsbG8=',
            resolution: 0,
        }),
    ]);

    const error = t.throws(() => messageCodec.encodeUserMessage(userMessage));

    t.is(error?.message, 'Unsupported user message type.');
});

test('Anthropic choice codec leaves disable_parallel_tool_use undefined when option is unspecified', t => {
    const encoded = AnthropicChoiceCodec.encode(CompatibleStructuring.Choice.AUTO);

    t.is(encoded.disable_parallel_tool_use, undefined);
});

test('OpenAI Chat Completions transport reads parallelToolCall from inferenceParams', t => {
    const toolCodec = new OpenAIChatCompletionsToolCodec({ fdm: functionDeclarationMap });
    const messageCodec = new OpenAIChatCompletionsMessageCodec({
        toolCodec,
        vdm: verbatimDeclarationMap,
    });
    const transport = new OpenAIChatCompletionsTransport({
        fdm: functionDeclarationMap,
        throttle: { requests: async () => {} },
        choice: CompatibleStructuring.Choice.AUTO,
        providerSpec: {
            baseUrl: 'https://example.invalid/openai',
            apiKey: 'test-key',
            dispatcher: undefined,
        },
        inferenceParams: {
            model: 'test-model',
            parallelToolCall: true,
            retry: 3,
        },
        messageCodec,
        toolCodec,
        billing: { charge: () => 0 },
    });
    const session = {
        chatMessages: [new CompatibleRoleMessage.User([
            new CompatibleRoleMessage.Part.Text('Hello.\n', []),
        ])],
    };

    const params = transport.makeParams(session);

    t.is(params.parallel_tool_calls, true);
    t.true(params.stream);
});

test('OpenAI Chat Completions transport streams usage by default', t => {
    const toolCodec = new OpenAIChatCompletionsToolCodec({ fdm: functionDeclarationMap });
    const messageCodec = new OpenAIChatCompletionsMessageCodec({
        toolCodec,
        vdm: verbatimDeclarationMap,
    });
    const transport = new OpenAIChatCompletionsTransport({
        fdm: functionDeclarationMap,
        throttle: { requests: async () => {} },
        choice: CompatibleStructuring.Choice.AUTO,
        providerSpec: {
            baseUrl: 'https://example.invalid/openai',
            apiKey: 'test-key',
            dispatcher: undefined,
        },
        inferenceParams: {
            model: 'test-model',
            parallelToolCall: false,
            retry: 3,
        },
        messageCodec,
        toolCodec,
        billing: { charge: () => 0 },
    });
    const session = {
        chatMessages: [new CompatibleRoleMessage.User([
            new CompatibleRoleMessage.Part.Text('Hello.\n', []),
        ])],
    };

    const params = transport.makeParams(session);

    t.is(params.parallel_tool_calls, false);
    t.true(params.stream);
    t.deepEqual(params.stream_options, {
        include_usage: true,
    });
});

test('OpenAI Responses compatible transport reads parallelToolCall from inference params', t => {
    const toolCodec = new OpenAIResponsesToolCodec({ fdm: functionDeclarationMap });
    const messageCodec = new OpenAIResponsesMessageCodec({
        toolCodec,
        vdm: verbatimDeclarationMap,
    });
    const transport = new OpenAIResponsesTransport({
        inferenceParams: {
            model: 'test-model',
            parallelToolCall: true,
            retry: 3,
        },
        providerSpec: {
            baseUrl: 'https://example.invalid/openai',
            apiKey: 'test-key',
            dispatcher: undefined,
        },
        fdm: functionDeclarationMap,
        throttle: { requests: async () => {} },
        choice: CompatibleStructuring.Choice.AUTO,
        messageCodec,
        toolCodec,
        billing: { charge: () => 0 },
    });
    const session = {
        chatMessages: [new CompatibleRoleMessage.User([
            new CompatibleRoleMessage.Part.Text('Hello.\n', []),
        ])],
    };

    const params = transport.makeParams(session);

    t.is(params.parallel_tool_calls, true);
});

test('Volcengine transport omits encrypted reasoning include from params', t => {
    const toolCodec = new OpenAIResponsesToolCodec({ fdm: functionDeclarationMap });
    const messageCodec = new OpenAIResponsesMessageCodec({
        toolCodec,
        vdm: verbatimDeclarationMap,
    });
    const transport = new VolcengineTransport({
        inferenceParams: {
            model: 'test-model',
            parallelToolCall: true,
            retry: 3,
        },
        providerSpec: {
            baseUrl: 'https://example.invalid/volcengine',
            apiKey: 'test-key',
            dispatcher: undefined,
        },
        fdm: functionDeclarationMap,
        throttle: { requests: async () => {} },
        choice: CompatibleStructuring.Choice.AUTO,
        messageCodec,
        toolCodec,
        billing: { charge: () => 0 },
    });
    const session = {
        chatMessages: [new CompatibleRoleMessage.User([
            new CompatibleRoleMessage.Part.Text('Hello.\n', []),
        ])],
    };

    const params = transport.makeParams(session);

    t.is(params.parallel_tool_calls, true);
    t.is(params.include, undefined);
    t.true(params.stream);
});

test('OpenAI Responses native transport reads parallelToolCall from inferenceParams', t => {
    const toolCodec = new OpenAIResponsesToolCodec({ fdm: functionDeclarationMap });
    const messageCodec = new OpenAIResponsesMessageCodec({
        toolCodec,
        vdm: verbatimDeclarationMap,
    });
    const transport = new OpenAIResponsesNativeTransport({
        inferenceParams: {
            model: 'test-model',
            parallelToolCall: false,
            retry: 3,
        },
        providerSpec: {
            baseUrl: 'https://example.invalid/openai',
            apiKey: 'test-key',
            dispatcher: undefined,
        },
        fdm: functionDeclarationMap,
        throttle: { requests: async () => {} },
        choice: CompatibleStructuring.Choice.AUTO,
        applyPatch: false,
        messageCodec,
        toolCodec,
        billing: { charge: () => 0 },
    });
    const session = {
        chatMessages: [new CompatibleRoleMessage.User([
            new CompatibleRoleMessage.Part.Text('Hello.\n', []),
        ])],
    };

    const params = transport.makeParams(session);

    t.is(params.parallel_tool_calls, false);
    t.true(params.stream);
});

test('Media image rejects non-image MIME type', t => {
    const error = t.throws(() => new Media.Image({
        mimeType: new MIMEType('text/plain'),
        base64: 'aGVsbG8=',
        resolution: 0,
    }));

    t.is(error?.message, 'Major MIME type of image must be `image`.');
});

test('Media text rejects non-text MIME type', t => {
    const error = t.throws(() => new Media.Text({
        mimeType: new MIMEType('application/json'),
        text: '{}',
    }));

    t.is(error?.message, 'Major MIME type of text must be `text`.');
});
