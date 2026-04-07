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
