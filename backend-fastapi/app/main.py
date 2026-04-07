import logging
from contextlib import asynccontextmanager
from typing import Annotated
from datetime import datetime, timezone

from azure.cosmos import CosmosClient
from clerk_backend_api import Clerk
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.security import get_current_user, is_admin
from app.lib.audit_store import AuditStore
from app.models.audit import AuditOverrideRequest, DisputeRequest, InviteRequest
from app.services.chat_service import AuditService
from app.services.blob_service import BlobStorageService
from app.services.policy_service import PolicyService
from app.utils.clerk import fetch_clerk_user_map

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

state = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles startup and shutdown logic.
    Ensures heavy clients are initialized only once.
    """
    cosmos_client = CosmosClient(settings.COSMOS_DB_ENDPOINT, settings.COSMOS_DB_KEY)
    logger.info("Initialized CosmosDB Connection.")
    blob_service = BlobStorageService()
    logger.info("Initialized Blob Storage.")
    policy_service = PolicyService(cosmos_client)
    audit_service = AuditService(policy_service, cosmos_client)
    audit_store = AuditStore(cosmos_client)
    clerk_client = Clerk(bearer_auth=settings.CLERK_SECRET_KEY)
    logger.info("Initialized Clerk Connection.")

    state["clerk_client"] = clerk_client
    state["cosmos_client"] = cosmos_client
    state["blob_service"] = blob_service
    state["policy_service"] = policy_service
    state["audit_service"] = audit_service
    state["audit_store"] = audit_store

    yield


app = FastAPI(
    title="AI Expense Auditor API",
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    """Verify the container is healthy."""
    return {"status": "healthy", "timestamp": "2026-04-07T..."}


@app.post("/api/upload-policy")
async def upload_policy(file: Annotated[UploadFile, File()]):
    service: PolicyService = state["policy_service"]

    filename = file.filename or "unknown_policy.pdf"

    try:
        content = await file.read()
        child_chunks = await service.process_policy(content, filename)
        return {
            "status": "success",
            "filename": filename,
            "vector_chunks_created": child_chunks,
        }
    except Exception as e:
        logger.error(f"Policy ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/audit")
async def handle_audit(
    message: Annotated[str, Form()],
    user: Annotated[dict, Depends(get_current_user)],
    image: Annotated[UploadFile, File()],
):
    audit_service: AuditService = state["audit_service"]
    blob_service: BlobStorageService = state["blob_service"]

    user_id = user["user_id"]
    user_designation = user["role"]

    if image:
        try:
            image_blob = await blob_service.upload(image)
            logger.info("Receipt uploaded.")
        except Exception as e:
            logger.error(f"Receipt upload failed: {e}")
            raise HTTPException(status_code=403, detail="Image upload failed.")

        try:
            audit_result = await audit_service.audit(
                user_id=user_id,
                user_designation=user_designation,
                user_query=message,
                image_blob=image_blob,
                image_url=blob_service.generate_sas_url(image_blob),
            )
            return {**audit_result, "user_id": user_id}
        except Exception as e:
            logger.error(f"Audit pipeline error: {e}", exc_info=True)
            raise HTTPException(
                status_code=500, detail="The audit pipeline encountered an error."
            )


@app.get("/api/expenses")
async def get_expenses(user: Annotated[dict, Depends(get_current_user)]):
    """Personal history: Simple, fast, and secure."""
    store: AuditStore = state["audit_store"]
    return await store.get_user_history(user["user_id"])


@app.get("/api/reports")
async def get_reports(user: Annotated[dict, Depends(get_current_user)]):
    """Manager reports: Admin only, enriched with Clerk user data."""
    is_admin(user)

    store: AuditStore = state["audit_store"]
    all_expenses = await store.get_all_history(limit=50)

    if not all_expenses:
        return []

    user_ids = list({e["userId"] for e in all_expenses if e.get("userId")})
    clerk_map = await fetch_clerk_user_map(state["clerk_client"], user_ids)

    enriched = []
    for item in all_expenses:
        u = clerk_map.get(item.get("userId", ""))
        enriched.append(
            {
                "id": item.get("id"),
                "userId": item.get("userId"),
                "userName": f"{u.first_name} {u.last_name}".strip()
                if u
                else "Unknown User",
                "userAvatar": u.image_url if u else None,
                "email": u.email_addresses[0].email_address
                if (u and u.email_addresses)
                else "N/A",
                "merchant": item.get("merchant", "Unknown Merchant"),
                "amount": item.get("amount", 0),
                "currency": item.get("currency", "USD"),
                "timestamp": item.get("timestamp"),
                "verdict": item.get("verdict", "FLAGGED"),
                "reasoning": item.get("reasoning", "No reasoning provided by AI."),
                "policy_snippet": item.get("policy_snippet", "N/A"),
                "dispute_reason": item.get("dispute_reason", ""),
                "status": item.get("status", ""),
            }
        )

    return enriched


@app.get("/api/audit/{audit_id}")
async def get_audit_detail(
    audit_id: str, user: Annotated[dict, Depends(get_current_user)]
):
    """Fetches full audit details and enriches with Clerk user info."""
    repo: AuditStore = state["audit_store"]
    clerk_client: Clerk = state["clerk_client"]
    blob: BlobStorageService = state["blob_service"]

    audit_item = await repo.get_audit_by_id(audit_id)
    if not audit_item:
        raise HTTPException(status_code=404, detail="Audit not found")

    try:
        u = clerk_client.users.get(user_id=audit_item.get("userId", ""))
    except Exception:
        u = None

    return {
        "id": audit_item.get("id"),
        "merchant": audit_item.get("merchant", "Unknown"),
        "amount": audit_item.get("amount", 0),
        "currency": audit_item.get("currency", "INR"),
        "category": audit_item.get("category"),
        "subcategory": audit_item.get("subcategory"),
        "city": audit_item.get("city"),
        "date": audit_item.get("date"),
        "verdict": audit_item.get("verdict", "FLAGGED"),
        "reasoning": audit_item.get("reasoning", "No analysis available."),
        "policy": {
            "limit": audit_item.get("policy_limit"),
            "limit_type": audit_item.get("policy_limit_type"),
            "currency": audit_item.get("policy_currency"),
            "matched_rule": audit_item.get("matched_rule"),
            "policy_notes": audit_item.get("policy_notes"),
        },
        "submittedBy": {
            "name": f"{u.first_name} {u.last_name}".strip() if u else "Unknown",
            "avatar": u.image_url if u else None,
            "email": u.email_addresses[0].email_address
            if (u and u.email_addresses)
            else "N/A",
        },
        "timestamp": audit_item.get("timestamp"),
        "receipt_url": blob.generate_sas_url(audit_item.get("receipt_blob", "")),
        "status": audit_item.get("status", "ORIGINAL"),
        "override_comment": audit_item.get("override_comment"),
        "dispute_reason": audit_item.get("dispute_reason"),
    }


@app.patch("/api/audit/{audit_id}")
async def override_audit(
    audit_id: str,
    body: AuditOverrideRequest,
    user: Annotated[dict, Depends(get_current_user)],
):
    """Allows an Admin to manually override an AI verdict."""
    is_admin(user)

    repo: AuditStore = state["audit_store"]

    audit_item = await repo.get_audit_by_id(audit_id)
    if not audit_item:
        raise HTTPException(status_code=404, detail="Audit record not found")

    audit_item["original_verdict"] = audit_item.get("verdict")
    audit_item["verdict"] = body.verdict
    audit_item["override_comment"] = body.comment
    audit_item["status"] = "OVERRIDDEN"
    audit_item["updatedAt"] = datetime.now(timezone.utc).isoformat()

    await repo.update_audit(audit_item)

    return {
        "message": "Audit successfully overridden",
        "new_verdict": body.verdict,
        "auditId": audit_id,
    }


@app.post("/api/dispute/{expense_id}")
async def submit_dispute(
    expense_id: str,
    data: DisputeRequest,
    user: Annotated[dict, Depends(get_current_user)],
):
    store: AuditStore = state["audit_store"]
    user_id = user["user_id"]

    audit = await store.get_audit_by_id(expense_id)

    if not audit:
        raise HTTPException(status_code=404, detail="Expense record not found.")

    if audit.get("userId") != user_id:
        raise HTTPException(
            status_code=403, detail="You are not authorized to dispute this expense."
        )

    audit["verdict"] = "FLAGGED"
    audit["dispute_reason"] = data.reason.strip()
    audit["status"] = "PENDING_REVIEW"
    audit["updated_at"] = datetime.now(timezone.utc).isoformat()

    try:
        await store.update_audit(audit)
        return {
            "message": "Dispute submitted successfully",
            "id": expense_id,
            "status": "DISPUTED",
        }
    except Exception as e:
        logger.error(f"Failed to update dispute: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to save dispute to database."
        )


@app.post("/api/invite")
async def invite_member(
    payload: InviteRequest,
    user: Annotated[dict, Depends(get_current_user)],
):
    """
    Invites a new member to the organization with a specific designation.
    Only accessible by Admins.
    """
    is_admin(user)

    clerk_client: Clerk = state["clerk_client"]

    try:
        invitation = clerk_client.organization_invitations.create(
            organization_id=payload.org_id,
            email_address=payload.email,
            role="org:member",
            public_metadata={"designation": payload.designation},
        )

        logger.info(
            f"Admin {user['user_id']} invited {payload.email} as {payload.designation}"
        )

        return {
            "status": "success",
            "message": f"Invitation sent to {payload.email}",
            "invitation_id": invitation.id,
        }

    except Exception as e:
        logger.error(f"Clerk Invitation failed: {e}")
        raise HTTPException(
            status_code=400, detail=f"Failed to send invitation: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
