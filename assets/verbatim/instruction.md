# XML Verbatim Channel

## Motivation

When an LLM outputs structured data in JSON format (e.g., legacy LLM function calling), if there are too many special characters in a string property (e.g., a large LaTeX document, or a complex shell command), the LLM is prone to make mistakes in JSON escaping.

XML Verbatim Channel is designed to avoid escaping in LLM messages.

## Declaration of Channels

LLM developer/user-role messages are expected to declare all available XML Verbatim Channels in the form of

<verbatim:declaration name="NAME OF CHANNEL">
    <verbatim:description>DESCRIPTION OF CHANNEL</verbatim:description>
    <verbatim:parameter name="NAME OF PARAMETER 1">
        <verbatim:description>DESCRIPTION OF THIS PARAMETER</verbatim:description>
        <verbatim:mime-type>MIME TYPE OF THIS PARAMETER</verbatim:mime-type>
        <verbatim:required>WHETHER THIS PARAMETER IS REQUIRED</verbatim:required>
    </verbatim:parameter>
    <verbatim:parameter name="NAME OF PARAMETER 2">
        <verbatim:description>DESCRIPTION OF THIS PARAMETER</verbatim:description>
        <verbatim:mime-type>MIME TYPE OF THIS PARAMETER</verbatim:mime-type>
        <verbatim:required>WHETHER THIS PARAMETER IS REQUIRED</verbatim:required>
    </verbatim:parameter>
</verbatim:declaration>

## Request through Channels

In an LLM AI-role message you output, you can make a request through a specified channel in the form of

<verbatim:request name="NAME OF CHANNEL">
    <verbatim:parameter name="NAME OF PARAMETER 1"><![CDATA[VERBATIM ARGUMENT OF THIS PARAMETER]]></verbatim:parameter>
    <verbatim:parameter name="NAME OF PARAMETER 2"><![CDATA[VERBATIM ARGUMENT OF THIS PARAMETER]]></verbatim:parameter>
</verbatim:request>

-   The only attribute of <verbatim:request> is `name`. Additional attributes will be ignored.
-   The only attribute of <verbatim:parameter> is `name`. Additional attributes will be ignored.
-   Self closing tags are not allowed, even if the request has no parameters.
-   All arguments must be wrapped in CDATA. The CDATA sections will be extracted not by standard XML parsers, but by regular expressions instead. Therefore, they can directly contain `]]>`, which is not allowed in standard XML.

## Response from Channels

The LLM user-role message following your requests may contain the responses to your requests in the form of

<verbatim:response name="NAME OF CHANNEL"><![CDATA[VERBATIM RESPONSE]]></verbatim:response>

The CDATA section may directly contain `]]>`, which is not allowed in standard XML.

Not all requests have a response.

## Verbatim Quotation

LLM developer/user-role messages may contain verbatim quotations in the form of

<verbatim:quotation author="AUTHOR OF QUOTATION"><![CDATA[VERBATIM QUOTATION]]></verbatim:quotation>

The CDATA section may directly contain `]]>`, which is not allowed in standard XML.

The attribute `author` is optional.

## System Information

LLM developer/user-role messages may contain system information from the AI agent framework in the form of

<verbatim:system></verbatim:system>

## LLM Chat Template Compatibility

The mechanism of XML Verbatim Channel is built on top of your native LLM chat template. When you are making a verbatim request, you have to output a complete LLM AI-role message, which has its own native chat template message boundaries.
