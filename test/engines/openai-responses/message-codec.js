import test from 'ava';
import { MIMEType } from 'whatwg-mimetype';
import { Function } from '../../../build/function.js';
import { Media } from '../../../build/media.js';
import { RoleMessage } from '../../../build/engine/message.js';
import { ToolCodec } from '../../../build/engines/openai-responses/tool-codec.js';
import { MessageCodec } from '../../../build/engines/openai-responses/message-codec.js';
import { Tool } from '../../../build/engines/openai-responses/tool.js';
import { functionDeclarationMap, verbatimDeclarationMap } from '../../helpers.js';


function makeCodec() {
    const toolCodec = new ToolCodec({ fdm: functionDeclarationMap });
    return new MessageCodec({
        toolCodec,
        vdm: verbatimDeclarationMap,
    });
}

test('OpenAI responses codec encodes multimodal user message', t => {
    const messageCodec = makeCodec();
    const userMessage = new RoleMessage.User([
        new RoleMessage.User.Part.Text('Hello.\n'),
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
    const messageCodec = makeCodec();
    const userMessage = new RoleMessage.User([
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
    const messageCodec = makeCodec();
    const userMessage = new RoleMessage.User([
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

test('OpenAI responses codec decodes text, function calls and apply patch calls', t => {
    const messageCodec = makeCodec();
    const aiMessage = messageCodec.decodeAiMessage([
        {
            type: 'message',
            id: 'msg_1',
            role: 'assistant',
            status: 'completed',
            content: [{
                type: 'output_text',
                text: 'hello',
                annotations: [],
            }],
        },
        {
            type: 'function_call',
            id: 'fc_1',
            call_id: 'call_1',
            name: 'noop',
            arguments: '{}',
            status: 'completed',
        },
        {
            type: 'apply_patch_call',
            id: 'ap_1',
            call_id: 'patch_1',
            status: 'completed',
            input: {
                operation: {
                    type: 'update_file',
                    path: 'a.txt',
                    diff: 'diff',
                },
            },
        },
    ]);

    t.is(aiMessage.getText(), 'hello');
    t.is(aiMessage.getFunctionCalls()[0].name, 'noop');
    t.true(aiMessage.getToolCalls()[0] instanceof Function.Call);
    t.true(aiMessage.getToolCalls()[1] instanceof Tool.ApplyPatch.Call);
});
