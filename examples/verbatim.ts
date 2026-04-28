import { Adaptor, RoleMessage, type Session, OpenAIResponsesStructuringChoice, Verbatim } from '@zimtsui/typechat';
import Assets from '@zimtsui/typechat/assets';
import * as Codec from '@zimtsui/typechat/codec';
import { config } from './config.ts';
import { MIMEType } from 'whatwg-mimetype';

// 声明 XML Verbatim 频道
const vdm = {
    bash: {
        description: '执行 Bash 命令',
        parameters: {
            command: {
                description: 'Bash 命令',
                mimeType: new MIMEType('text/plain'),
                required: true as const,
            },
        },
    },
} satisfies Verbatim.Decl.Map.Proto;
type vdm = typeof vdm;
type vdu = Verbatim.Decl.From<vdm>;


// 创建会话
const session: Session<never, vdu> = {
    developerMessage: new RoleMessage.Developer([
        RoleMessage.Developer.Part.Text.paragraph(Assets.verbatim.instruction),
        RoleMessage.Developer.Part.Text.paragraph('# Available Verbatim Channels'),
        RoleMessage.Developer.Part.Text.paragraph(Codec.Declarations.encode(vdm)),
    ]),
    chatMessages: [
        new RoleMessage.User([ RoleMessage.User.Part.Text.paragraph('请使用 Bash 命令查询当前系统时间。') ]),
    ],
};

// 选择推理引擎
const adaptor = Adaptor.create(config);
const engine = adaptor.makeOpenAIResponsesEngine<{}, vdm>({
    endpoint: 'gpt-5.4-mini',
    functionDeclarationMap: {},
    verbatimDeclarationMap: vdm,
    structuringChoice: OpenAIResponsesStructuringChoice.VRequest.ANYONE,
});

const response = await engine.stateless({}, session);
console.log(response.getOnlyVerbatimRequest().args.command);
