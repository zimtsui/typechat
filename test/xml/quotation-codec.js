import test from 'ava';
import { MIMEType } from 'node:util';
import * as XmlCodec from '../../build/xml.js';


test('XML quotation codec encodes quotation text', t => {
    const xml = XmlCodec.Quotation.encode(new MIMEType('text/plain'), 'echo hello');

    t.is(xml.trim(), '<typechat:quotation mime-type="text/plain"><![CDATA[echo hello]]></typechat:quotation>');
});

test('XML quotation codec encodes author attribute', t => {
    const xml = XmlCodec.Quotation.encode(new MIMEType('text/plain'), 'echo hello', 'example');

    t.is(xml.trim(), '<typechat:quotation author="example" mime-type="text/plain"><![CDATA[echo hello]]></typechat:quotation>');
});

test('XML quotation codec rejects unsafe author attribute text', t => {
    t.throws(() => XmlCodec.Quotation.encode(new MIMEType('text/plain'), 'echo hello', '"foo" & <bar>'));
});

test('XML quotation codec preserves CDATA terminator text', t => {
    const xml = XmlCodec.Quotation.encode(new MIMEType('text/plain'), 'a ]]> b');

    t.is(xml.trim(), '<typechat:quotation mime-type="text/plain"><![CDATA[a ]]> b]]></typechat:quotation>');
});

test('XML quotation codec escapes quoted MIME parameters in XML attributes', t => {
    const xml = XmlCodec.Quotation.encode(new MIMEType('text/plain;charset="foo bar"'), 'echo hello');

    t.is(xml.trim(), '<typechat:quotation mime-type="text/plain;charset=&quot;foo bar&quot;"><![CDATA[echo hello]]></typechat:quotation>');
});
