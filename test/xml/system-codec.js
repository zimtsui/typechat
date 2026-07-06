import assert from 'node:assert/strict';
import test from 'node:test';
import * as XmlCodec from '../../build/xml.js';


test('XML system codec wraps escaped XML body text', () => {
    const xml = XmlCodec.System.encode('a & b < c > d');

    assert.strictEqual(xml.trim(), '<typechat:system>a &amp; b &lt; c &gt; d</typechat:system>');
});
