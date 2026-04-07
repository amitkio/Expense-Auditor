import logging
from typing import Any, Dict, Optional

from azure.cosmos import CosmosClient
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import AzureChatOpenAI

from app.core.config import settings
from app.lib.audit_store import AuditStore
from app.models.audit import AuditReasoning, PolicyLimit, ReceiptMetadata
from app.services.policy_service import PolicyService
from app.utils.prompts import (
    EXTRACTION_SYSTEM_PROMPT,
    LIMIT_EXTRACTION_SYSTEM_PROMPT,
    LIMIT_EXTRACTION_USER_TEMPLATE,
    REASONING_SYSTEM_PROMPT,
    REASONING_USER_TEMPLATE,
)

logger = logging.getLogger(__name__)


class AuditService:
    def __init__(self, policy_service: PolicyService, cosmos_client: CosmosClient):
        self.policy_service = policy_service
        self.llm = AzureChatOpenAI(
            azure_deployment="gpt-4o-mini",
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version="2024-12-01-preview",
            temperature=0,
        )
        self.extractor = self.llm.with_structured_output(ReceiptMetadata)
        self.limit_finder = self.llm.with_structured_output(PolicyLimit)
        self.reasoner = self.llm.with_structured_output(AuditReasoning)
        self.store = AuditStore(cosmos_client)

    async def audit(
        self,
        user_id: str,
        user_designation: str,
        user_query: str,
        image_blob: str,
        image_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            metadata = await self._extract_metadata(
                user_query, user_designation, image_url
            )

            limit_data = await self._get_policy_limit(metadata)
            verdict, flag_reason = self._compute_verdict(metadata, limit_data)
            reasoning_obj = await self._generate_reasoning(
                verdict, flag_reason, metadata, limit_data
            )

            final_document = {
                "userId": user_id,
                "query": user_query,
                "verdict": verdict,
                "reasoning": reasoning_obj.reasoning,
                "merchant": metadata.vendor,
                "amount": metadata.total,
                "currency": metadata.currency,
                "category": metadata.category,
                "subcategory": metadata.subcategory,
                "city": metadata.city,
                "date": metadata.date,
                "policy_limit": limit_data.limit,
                "policy_limit_type": limit_data.limit_type,
                "policy_currency": limit_data.currency,
                "matched_rule": limit_data.matched_rule,
                "policy_notes": limit_data.policy_notes,
                "audit_details": {
                    "claimed": metadata.model_dump(),
                    "policy": limit_data.model_dump(),
                    "expense_metadata": metadata.model_dump(),
                },
                "receipt_blob": image_blob,
            }
            saved_doc = await self.store.save_audit_result(final_document)
            return saved_doc

        except Exception as e:
            logger.error(f"Audit Pipeline Failed: {e}", exc_info=True)
            return {"verdict": "ERROR", "reasoning": str(e)}

    async def _extract_metadata(
        self, query: str, user_designation: str, image_url: Optional[str]
    ) -> ReceiptMetadata:
        content: list[Any] = [
            {"type": "text", "text": f"User Query: {query}"},
            {"type": "text", "text": f"User Role: {user_designation}"},
        ]
        if image_url:
            content.append({"type": "image_url", "image_url": {"url": image_url}})

        result = await self.extractor.ainvoke(
            [
                SystemMessage(content=EXTRACTION_SYSTEM_PROMPT),
                HumanMessage(content=content),
            ]
        )

        if not isinstance(result, ReceiptMetadata):
            raise ValueError(
                f"LLM failed to return ReceiptMetadata. Got: {type(result)}"
            )

        return result

    async def _get_policy_limit(self, meta: ReceiptMetadata) -> PolicyLimit:
        # Use the multi_retriever from your policy service
        search_query = (
            f"{meta.category} {meta.subcategory} limit for {meta.level} in {meta.city}"
        )
        docs = await self.policy_service.retriever.ainvoke(search_query)
        context = "\n\n".join([d.page_content for d in docs])

        user_prompt = LIMIT_EXTRACTION_USER_TEMPLATE.format(
            policy_context=context, **meta.model_dump()
        )

        result = await self.limit_finder.ainvoke(
            [
                SystemMessage(content=LIMIT_EXTRACTION_SYSTEM_PROMPT),
                HumanMessage(content=user_prompt),
            ]
        )

        if not isinstance(result, PolicyLimit):
            raise ValueError(f"LLM failed to return PolicyLimit. Got: {type(result)}")

        return result

    def _compute_verdict(
        self, meta: ReceiptMetadata, limit: PolicyLimit
    ) -> tuple[str, str]:
        if meta.total <= 0:
            return "FLAGGED", "no_total"
        if limit.limit <= 0:
            return "FLAGGED", "no_policy"

        # Logic for per-head/per-person
        multiplier = (
            meta.num_attendees
            if any(x in limit.limit_type for x in ["person", "head"])
            else 1
        )
        effective_limit = limit.limit * multiplier

        if meta.total <= effective_limit:
            return "APPROVED", ""
        return "REJECTED", ""

    async def _generate_reasoning(
        self, verdict: str, flag: str, meta: ReceiptMetadata, limit: PolicyLimit
    ) -> AuditReasoning:
        user_prompt = REASONING_USER_TEMPLATE.format(
            verdict=verdict,
            flag_reason=flag or "N/A",
            total=meta.total,
            currency=meta.currency,
            limit=limit.limit,
            limit_currency=limit.currency,
            limit_type=limit.limit_type,
            overage=max(0, meta.total - limit.limit),
            level=meta.level,
            category=meta.category,
            subcategory=meta.subcategory,
            city=meta.city,
            matched_rule=limit.matched_rule,
            policy_notes=limit.policy_notes,
        )

        result = await self.reasoner.ainvoke(
            [
                SystemMessage(content=REASONING_SYSTEM_PROMPT),
                HumanMessage(content=user_prompt),
            ]
        )

        if not isinstance(result, AuditReasoning):
            raise ValueError(
                f"LLM failed to return AuditReasoning. Got: {type(result)}"
            )

        return result
