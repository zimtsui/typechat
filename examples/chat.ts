import { Adaptor, Engine } from '@zimtsui/typechat';
import { config } from './config.ts';

// 创建会话
const session: Engine.Session<never, never> = {
    developerMessage: new Engine.RoleMessage.Developer([
        Engine.RoleMessage.Developer.Part.Text.paragraph('You are a helpful assistant.'),
    ]),
    chatMessages: [
        new Engine.RoleMessage.User([ Engine.RoleMessage.User.Part.Text.paragraph('Hello!') ]),
    ],
};

// 选择推理引擎
const adaptor = Adaptor.create(config);
const engine = adaptor.makeEngine<{}, {}>({
    endpoint: 'gpt-5.4-mini',
    functionDeclarationMap: {},
    verbatimDeclarationMap: {},
});

const response = await engine.stateless({}, session);
console.log(response.getText());
