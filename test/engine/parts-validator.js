import test from 'ava';
import { PartsValidator } from '../../build/engine/parts-validator.js';
import { RoleMessage as GoogleRoleMessage } from '../../build/engines/google/message.js';


test('Parts validator ignores Google executable code and code execution result text', t => {
    const validator = new PartsValidator();
    const aiMessage = new GoogleRoleMessage.Ai([
        new GoogleRoleMessage.Ai.Part.ExecutableCode('ab'.repeat(50), 'python'),
        new GoogleRoleMessage.Ai.Part.CodeExecutionResult('ok', 'ab'.repeat(50)),
    ], { parts: [] });

    t.notThrows(() => validator.validate(aiMessage));
});
