# TypeChat

TypeChat is the adaptor you are using for LLM inference providers.

## Verbatim Quotation

LLM developer/user-role messages may contain verbatim quotations in the form of

<typechat:quotation author="AUTHOR OF QUOTATION"><![CDATA[VERBATIM QUOTATION]]></typechat:quotation>

The CDATA section may directly contain `]]>`, which is not allowed in standard XML.

The attribute `author` is optional, indicating the source of the quotation.

## System Information

LLM developer/user-role messages may contain system information from the AI agent framework in the form of

<typechat:system></typechat:system>
