from clerk_backend_api import Clerk, GetUserListRequest
import logging

logger = logging.getLogger(__name__)


async def fetch_clerk_user_map(clerk_client: Clerk, user_ids: list[str]):
    if not user_ids:
        return {}

    try:
        response = clerk_client.users.list(request=GetUserListRequest(user_id=user_ids))
        return {u.id: u for u in response}
    except Exception as e:
        logger.error(f"Clerk fetch failed: {e}")
        return {}


async def resolve_user_org_id(clerk_client: Clerk, user_id: str) -> str:
    """
    Retrieves the org_id for a user. Since users are pre-assigned
    to exactly one org, we take the first membership found.
    """
    try:
        response = clerk_client.users.get_organization_memberships(
            user_id=user_id, limit=1
        )

        if response.data and len(response.data) > 0:
            org_id = response.data[0].organization.id
            return org_id

        logger.warning(f"No organization found for user: {user_id}")
        return ""

    except Exception as e:
        logger.error(f"Failed to resolve org_id for user {user_id}: {e}")
        return ""
