from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
from datetime import datetime, timedelta, timezone
import uuid

from fastapi import UploadFile

from app.core.config import settings


class BlobStorageService:
    def __init__(self):
        self.client = BlobServiceClient.from_connection_string(
            settings.AZURE_STORAGE_CONNECTION_STRING
        )
        self.container = settings.BLOB_CONTAINER_NAME

    async def upload(self, file: UploadFile) -> str:
        file_bytes = await file.read()
        blob_name = f"{uuid.uuid4()}_{file.filename}"
        blob_client = self.client.get_blob_client(
            container=self.container, blob=blob_name
        )
        blob_client.upload_blob(file_bytes, overwrite=True)
        return blob_name

    def generate_sas_url(self, blob_name: str) -> str:
        account = self.client.account_name or ""
        key = self.client.credential.account_key
        sas_token = generate_blob_sas(
            account_name=account,
            container_name=self.container,
            blob_name=blob_name,
            account_key=key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        return f"https://{account}.blob.core.windows.net/{self.container}/{blob_name}?{sas_token}"


blob_service = BlobStorageService()
