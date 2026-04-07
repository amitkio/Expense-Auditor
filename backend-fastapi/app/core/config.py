from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    COSMOS_DB_ENDPOINT: str = Field(default=...)
    COSMOS_DB_KEY: str = Field(default=...)
    COSMOS_DATABASE: str = "ExpenseAuditor"
    COSMOS_CONTAINER: str = "AuditHistory"

    AZURE_OPENAI_API_KEY: SecretStr = Field(default=...)
    AZURE_OPENAI_ENDPOINT: str = Field(default=...)

    AZURE_STORAGE_CONNECTION_STRING: str = Field(default=...)
    BLOB_CONTAINER_NAME: str = "receipts"

    CLERK_SECRET_KEY: str = Field(default=...)
    CLERK_FRONTEND_API: str = Field(default=...)

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
