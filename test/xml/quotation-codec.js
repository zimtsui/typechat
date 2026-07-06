import assert from 'node:assert/strict';
import test from 'node:test';
import { MIMEType } from 'node:util';
import * as XmlCodec from '../../build/xml.js';


test('XML quotation codec encodes quotation text', () => {
    const xml = XmlCodec.Quotation.encode(new MIMEType('text/plain'), 'echo hello');

    assert.strictEqual(xml.trim(), '<typechat:quotation mime-type="text/plain"><![CDATA[echo hello]]></typechat:quotation>');
});

test('XML quotation codec encodes author attribute', () => {
    const xml = XmlCodec.Quotation.encode(new MIMEType('text/plain'), 'echo hello', 'example');

    assert.strictEqual(xml.trim(), '<typechat:quotation author="example" mime-type="text/plain"><![CDATA[echo hello]]></typechat:quotation>');
});

test('XML quotation codec rejects unsafe author attribute text', () => {
    assert.throws(() => XmlCodec.Quotation.encode(new MIMEType('text/plain'), 'echo hello', '"foo" & <bar>'));
});

test('XML quotation codec preserves CDATA terminator text', () => {
    const xml = XmlCodec.Quotation.encode(new MIMEType('text/plain'), 'a ]]> b');

    assert.strictEqual(xml.trim(), '<typechat:quotation mime-type="text/plain"><![CDATA[a ]]> b]]></typechat:quotation>');
});

test('XML quotation codec escapes quoted MIME parameters in XML attributes', () => {
    const xml = XmlCodec.Quotation.encode(new MIMEType('text/plain;charset="foo bar"'), 'echo hello');

    assert.strictEqual(xml.trim(), '<typechat:quotation mime-type="text/plain;charset=&quot;foo bar&quot;"><![CDATA[echo hello]]></typechat:quotation>');
});
