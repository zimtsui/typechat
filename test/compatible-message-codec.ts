import test from 'ava';
import { Type } from '@sinclair/typebox';
import { Function } from '../build/function.js';
import { Media } from '../build/media.js';
import { RoleMessage as CompatibleRoleMessage } from '../build/compatible-engine/session.js';
import { ToolCodec as AnthropicToolCodec } from '../build/api-types/anthropic/tool-codec.js';
import { ToolCodec as GoogleToolCodec } from '../build/api-types/google/tool-codec.js';
import { OpenAIChatCompletionsToolCodec } from '../build/api-types/openai-chatcompletions/tool-codec.js';
import { ToolCodec as OpenAIResponsesToolCodec } from '../build/api-types/openai-responses/tool-codec.js';
import { MessageCodec as AnthropicMessageCodec } from '../build/compatible-engine.d/anthropic/message-codec.js';
import { MessageCodec as GoogleMessageCodec } from '../build/compatible-engine.d/google/message-codec.js';
import { MessageCodec as OpenAIChatCompletionsMessageCodec } from '../build/compatible-engine.d/openai-chatcompletions/message-codec.js';
import { MessageCodec as OpenAIResponsesMessageCodec } from '../build/compatible-engine.d/openai-responses/message-codec.js';


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
                mimeType: 'text/plain',
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
            mimeType: 'image/png',
            base64: 'aGVsbG8=',
            resolution: 2,
        }),
        new Media.Pdf({
            mimeType: 'application/pdf',
            base64: 'cGRm',
        }),
        Function.Response.Successful.of({
            id: 'call_1',
            name: 'noop',
            text: 'done',
        }),
    ]);

    const encoded = messageCodec.encodeUserMessage(userMessage);

    t.deepEqual(encoded, [
        {
            type: 'function_call_output',
            call_id: 'call_1',
            output: 'done',
        },
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
    ]);
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
        new Media.Pdf({
            mimeType: 'application/pdf',
            base64: 'cGRm',
        }),
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
        new Media.Pdf({
            mimeType: 'application/pdf',
            base64: 'cGRm',
        }),
    ]);

    const error = t.throws(() => messageCodec.encodeUserMessage(userMessage));

    t.truthy(error);
});

test('OpenAI chat completions codec rejects media user message', t => {
    const toolCodec = new OpenAIChatCompletionsToolCodec({
        parallelToolCall: false,
        fdm: functionDeclarationMap,
    });
    const messageCodec = new OpenAIChatCompletionsMessageCodec({
        toolCodec,
        vdm: verbatimDeclarationMap,
    });
    const userMessage = new CompatibleRoleMessage.User([
        new Media.Image({
            mimeType: 'image/png',
            base64: 'aGVsbG8=',
            resolution: 0,
        }),
    ]);

    const error = t.throws(() => messageCodec.encodeUserMessage(userMessage));

    t.is(error?.message, 'Unsupported user message type.');
});
