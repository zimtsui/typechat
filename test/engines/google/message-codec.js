import test from 'ava';
import { Media } from '../../../build/media.js';
import { RoleMessage } from '../../../build/engine/message.js';
import { RoleMessage as GoogleRoleMessage } from '../../../build/engines/google/message.js';
import { ToolCodec } from '../../../build/engines/google/tool-codec.js';
import { MessageCodec } from '../../../build/engines/google/message-codec.js';
import { functionDeclarationMap, verbatimDeclarationMap } from '../../helpers.js';


function makeCodec(codeExecution = false) {
    const toolCodec = new ToolCodec({ fdm: functionDeclarationMap });
    return new MessageCodec({
        toolCodec,
        vdm: verbatimDeclarationMap,
        codeExecution,
    });
}

test('Google codec encodes PDF user message', t => {
    const messageCodec = makeCodec();
    const userMessage = new RoleMessage.User([
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

test('Google codec decodes text, function calls and code execution parts', t => {
    const messageCodec = makeCodec(true);

    const aiMessage = messageCodec.decodeAiMessage({
        role: 'model',
        parts: [
            { text: 'hello' },
            {
                functionCall: {
                    id: 'call_1',
                    name: 'noop',
                    args: {},
                },
            },
            {
                executableCode: {
                    code: 'print(1)',
                    language: 'PYTHON',
                },
            },
            {
                codeExecutionResult: {
                    outcome: 'OUTCOME_OK',
                    output: '1\n',
                },
            },
        ],
    });

    t.is(aiMessage.getText(), 'hello');
    t.is(aiMessage.getOnlyFunctionCall().name, 'noop');
    t.true(aiMessage.getParts()[2] instanceof GoogleRoleMessage.Ai.Part.ExecutableCode);
    t.true(aiMessage.getParts()[3] instanceof GoogleRoleMessage.Ai.Part.CodeExecutionResult);
});

test('Google codec rejects unexpected code execution parts when disabled', t => {
    const messageCodec = makeCodec(false);

    t.throws(() => messageCodec.decodeAiMessage({
        role: 'model',
        parts: [{
            executableCode: {
                code: 'print(1)',
                language: 'PYTHON',
            },
        }],
    }), { instanceOf: SyntaxError, message: 'Unexpected code execution' });
});
