from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Azure OpenAI
    azure_openai_endpoint: str
    azure_openai_api_key: str
    azure_openai_api_version: str = "2024-12-01-preview"
    azure_openai_chat_deployment: str
    azure_openai_embedding_deployment: str

    # Supabase
    supabase_url: str
    supabase_service_role_key: str

    # Chunking
    chunk_max_tokens: int = 512
    chunk_overlap_tokens: int = 50

    # Embedding
    embedding_dimensions: int = 1536
    embedding_batch_size: int = 100

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
