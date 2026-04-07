import logging
import uuid
from langchain_openai import AzureOpenAIEmbeddings
import pymupdf.layout  # type: ignore  # noqa: F401
from langchain_pymupdf4llm import PyMuPDF4LLMParser
from langchain_community.document_loaders.blob_loaders import Blob
from langchain_text_splitters import MarkdownTextSplitter
from langchain_community.vectorstores.azure_cosmos_db_no_sql import (
    AzureCosmosDBNoSqlVectorSearch,
)
from azure.cosmos import CosmosClient
from langchain_classic.retrievers.multi_vector import MultiVectorRetriever

from app.core.config import settings
from app.lib.doc_store import CosmosDocStore

logger = logging.getLogger(__name__)


class PolicyService:
    def __init__(self, cosmos_client: CosmosClient):
        self.embeddings = AzureOpenAIEmbeddings(
            azure_deployment="text-embedding-ada-002",
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
        )

        vector_policy = {
            "vectorEmbeddings": [
                {
                    "path": "/embedding",
                    "dataType": "float32",
                    "distanceFunction": "cosine",
                    "dimensions": 1536,
                }
            ]
        }
        indexing_policy = {
            "indexingMode": "consistent",
            "vectorIndexes": [{"path": "/embedding", "type": "diskANN"}],
        }

        self.vector_store = AzureCosmosDBNoSqlVectorSearch(
            cosmos_client=CosmosClient(
                settings.COSMOS_DB_ENDPOINT, settings.COSMOS_DB_KEY
            ),
            embedding=self.embeddings,
            vector_embedding_policy=vector_policy,
            indexing_policy=indexing_policy,
            cosmos_container_properties={
                "partition_key": {"paths": ["/id"], "kind": "Hash"}
            },
            cosmos_database_properties={},
            database_name="ExpenseAuditor",
            container_name="PolicyVectors",
            text_key="text",
        )

        db = cosmos_client.get_database_client(settings.COSMOS_DATABASE)
        self.docstore = CosmosDocStore(db.get_container_client("PolicyParents"))

        self.retriever = MultiVectorRetriever(
            vectorstore=self.vector_store,
            docstore=self.docstore,
            id_key="parent_id",
        )

    async def process_policy(self, file_bytes: bytes, filename: str) -> int:
        """
        Parses PDF, chunks it, and uses LangChain to embed and upload to Cosmos DB.
        """
        blob = Blob.from_data(data=file_bytes, path=filename)
        parser = PyMuPDF4LLMParser()
        raw_docs = list(parser.lazy_parse(blob))

        parent_splitter = MarkdownTextSplitter(chunk_size=3000, chunk_overlap=200)
        child_splitter = MarkdownTextSplitter(chunk_size=400, chunk_overlap=50)

        total_children = 0
        id_key = "parent_id"

        for doc in raw_docs:
            parent_chunks = parent_splitter.split_documents([doc])

            for p_chunk in parent_chunks:
                parent_id = str(uuid.uuid4())
                p_chunk.metadata[id_key] = parent_id
                p_chunk.metadata["source"] = filename

                child_chunks = child_splitter.split_documents([p_chunk])
                for c in child_chunks:
                    c.metadata[id_key] = parent_id  # Link to parent
                    c.metadata["source"] = filename

                self.vector_store.add_documents(child_chunks)

                self.docstore.mset([(parent_id, p_chunk)])

                total_children += len(child_chunks)

        return total_children
