import test from 'ava';
import { MIMEType } from 'whatwg-mimetype';
import * as VerbatimCodec from '../../build/verbatim/codec.js';


test('Verbatim response codec encodes response text', t => {
    const xml = VerbatimCodec.Response.encode('bash', new MIMEType('text/plain'), 'echo hello');

    t.is(xml.trim(), '<verbatim:response name="bash" mime-type="text/plain"><![CDATA[echo hello]]></verbatim:response>');
});

test('Verbatim response codec preserves CDATA terminator text', t => {
    const xml = VerbatimCodec.Response.encode('bash', new MIMEType('text/plain'), 'a ]]> b');

    t.is(xml.trim(), '<verbatim:response name="bash" mime-type="text/plain"><![CDATA[a ]]> b]]></verbatim:response>');
});

test('Verbatim response codec escapes quoted MIME parameters in XML attributes', t => {
    const xml = VerbatimCodec.Response.encode('bash', new MIMEType('text/plain;charset="foo bar"'), 'echo hello');

    t.is(xml.trim(), '<verbatim:response name="bash" mime-type="text/plain;charset=&quot;foo bar&quot;"><![CDATA[echo hello]]></verbatim:response>');
});
