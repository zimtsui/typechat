# XML Verbatim Channel

## Motivation

When a LLM outputs structured data in JSON format (e.g., legacy LLM function calling), if there are too many special characters in a string property (e.g., a large LaTeX document, or a complex shell command), the LLM is prone to make mistakes in JSON escaping.

XML Verbatim Channel is designed to avoid escaping in LLM messages.

## Declaration of Channels

The LLM system/user message is expected to declare all available XML Verbatim Channels in the form of

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

You can make a request through a channel in the form of

<verbatim:request name="NAME OF CHANNEL">
    <verbatim:parameter name="NAME OF PARAMETER 1"><![CDATA[ARGUMENT OF THIS PARAMETER]]></verbatim:parameter>
    <verbatim:parameter name="NAME OF PARAMETER 2"><![CDATA[ARGUMENT OF THIS PARAMETER]]></verbatim:parameter>
</verbatim:request>

-   The only attribute of <verbatim:request> is `name`. Additional attributes will be ignored.
-   The only attribute of <verbatim:parameter> is `name`. Additional attributes will be ignored.
-   All arguments must be wrapped in CDATA. The CDATA sections will be extracted not by standard XML parsers, but by regular expressions instead. Therefore, they can directly contain `]]>`, which is not allowed in standard CDATA.

## Response from Channels

The LLM user message may contain the responses to your request in the form of

<verbatim:response name="NAME OF CHANNEL"><![CDATA[RESPONSE]]></verbatim:response>

Not all requests have a response.

## Verbatim Quotation

The LLM system/user message may contain verbatim quotations in the form of

<verbatim:quotation author="AUTHOR OF THIS QUOTATION"><![CDATA[QUOTATION]]></verbatim:quotation>

The attribute `author` is optional.

## System Information

The LLM system/user message may contain system information from the AI agent framework in the form of

<verbatim:system></verbatim:system>
