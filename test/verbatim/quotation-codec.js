import test from 'ava';
import { MIMEType } from 'whatwg-mimetype';
import * as VerbatimCodec from '../../build/verbatim/codec.js';


test('Verbatim quotation codec encodes quotation text', t => {
    const xml = VerbatimCodec.Quotation.encode(new MIMEType('text/plain'), 'echo hello');

    t.is(xml.trim(), '<verbatim:quotation mime-type="text/plain"><![CDATA[echo hello]]></verbatim:quotation>');
});

test('Verbatim quotation codec encodes author attribute', t => {
    const xml = VerbatimCodec.Quotation.encode(new MIMEType('text/plain'), 'echo hello', '"foo" & <bar>');

    t.is(xml.trim(), '<verbatim:quotation author="&quot;foo&quot; &amp; &lt;bar&gt;" mime-type="text/plain"><![CDATA[echo hello]]></verbatim:quotation>');
});

test('Verbatim quotation codec preserves CDATA terminator text', t => {
    const xml = VerbatimCodec.Quotation.encode(new MIMEType('text/plain'), 'a ]]> b');

    t.is(xml.trim(), '<verbatim:quotation mime-type="text/plain"><![CDATA[a ]]> b]]></verbatim:quotation>');
});

test('Verbatim quotation codec escapes quoted MIME parameters in XML attributes', t => {
    const xml = VerbatimCodec.Quotation.encode(new MIMEType('text/plain;charset="foo bar"'), 'echo hello');

    t.is(xml.trim(), '<verbatim:quotation mime-type="text/plain;charset=&quot;foo bar&quot;"><![CDATA[echo hello]]></verbatim:quotation>');
});
