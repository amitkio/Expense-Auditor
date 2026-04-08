# Expense Auditor

## The Problem

Corporate finance teams manually cross-reference every employee expense receipt against a 40+ page Travel & Expense Policy — a process that is slow, inconsistent, and error-prone. Spending limits vary by employee seniority and location, policy language is often ambiguous, and the sheer volume of monthly receipts creates 3-week reimbursement backlogs. This results in "Spend Leakage" — non-compliant claims slipping through — and high operational costs.

## The Solution

**Expense Auditor** is an AI-powered system that simultaneously "reads" expense receipts and company policy documents to automatically audit every claim for compliance. By leveraging Large Language Models (LLMs) and Optical Character Recognition (OCR), it eliminates manual cross-referencing.

Key features include:

- **Digital Receipt & Narrative Ingestion**: Automatically extracts Merchant, Date, Amount, and Currency from JPG, PNG, and PDF receipts.
- **Automated Policy Cross-Reference Engine**: Checks every receipt against relevant sections of the company policy to deliver an immediate verdict (Approved, Flagged, or Rejected) with a policy-backed explanation.
- **Dispute & Override System**: Allows employees to dispute flags and admins to manually override AI verdicts.

## Tech Stack

- **Frontend**:
  - React 19 (TypeScript)
  - TanStack Router & TanStack Start
  - TanStack Query (Data Fetching)
  - Tailwind CSS & DaisyUI (Styling)
  - Clerk (Authentication)
- **Backend**:
  - Python 3.12+
  - FastAPI (REST API)
  - Azure OpenAI (AI Policy Auditing & OCR)
  - Azure Cosmos DB (NoSQL Audit & Policy Store)
  - Azure Blob Storage (Receipt Document Store)
  - Clerk SDK (Backend Auth & Identity)
- **Deployment**:
  - Azure Static Web Apps (Frontend)
  - Docker (Backend)
  - uv (Fast Python Package Management)

## Setup Instructions

### Prerequisites

- Python 3.12 or higher installed.
- Node.js 20 or higher installed.
- `uv` installed (recommended for Python package management).
- `az` installed (for easy azure project initialization)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend-fastapi
   ```
2. Run Azure initialization script

   ```bash
   # 1. Configuration
   RESOURCE_GROUP="ExpenseAuditorRG"
   LOCATION="eastus"
   UNIQUE_ID=$RANDOM
   COSMOS_ACCOUNT="expense-auditor-db-$UNIQUE_ID"
   OPENAI_ACCOUNT="expense-auditor-ai-$UNIQUE_ID"
   DATABASE_NAME="ExpenseAuditor"

   # 2. Create a Resource Group
   az group create --name $RESOURCE_GROUP --location $LOCATION

   # 3. Create Cosmos DB Account (Serverless + NoSQL Vector Search)
   az cosmosdb create \
      --name $COSMOS_ACCOUNT \
      --resource-group $RESOURCE_GROUP \
      --locations regionName=$LOCATION \
      --kind GlobalDocumentDB \
      --capabilities EnableServerless EnableNoSQLVectorSearch

   # 4. Create Azure OpenAI Account
   az cognitiveservices account create \
      --name $OPENAI_ACCOUNT \
      --resource-group $RESOURCE_GROUP \
      --location $LOCATION \
      --kind OpenAI \
      --sku S0

   # 5. Deploy text-embedding-ada-002 (1536 Dimensions)
   az cognitiveservices account deployment create \
      --name $OPENAI_ACCOUNT \
      --resource-group $RESOURCE_GROUP \
      --deployment-name "text-embedding-ada-002" \
      --model-name "text-embedding-ada-002" \
      --model-version "2" \
      --model-format OpenAI \
      --sku-capacity "120" --sku-name "Standard"

   # 6. Deploy GPT-4o
   az cognitiveservices account deployment create \
      --name $OPENAI_ACCOUNT \
      --resource-group $RESOURCE_GROUP \
      --deployment-name "gpt-4o-mini" \
      --model-name "gpt-4o-mini" \
      --model-version "2024-12-01-preview" \
      --model-format OpenAI \
      --sku-capacity "10" --sku-name "Standard"

   # 7. Create SQL Database
   az cosmosdb sql database create --account-name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --name $DATABASE_NAME

   # 8. Define Vector and Indexing Policies (DiskANN)
   V_POLICY='{
      "vectorEmbeddings": [
         {"path": "/embedding", "dataType": "float32", "distanceFunction": "cosine", "dimensions": 1536}
      ]
   }'

   I_POLICY='{
      "indexingMode": "consistent",
      "includedPaths": [{"path": "/*"}],
      "excludedPaths": [{"path": "/\"_etag\"/?"}, {"path": "/embedding/*"}],
      "vectorIndexes": [{"path": "/embedding", "type": "diskANN"}]
   }'

   # 9. Create Containers

   # A. PolicyVectors (Vector Search Enabled with DiskANN)
   az cosmosdb sql container create \
      --account-name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --database-name $DATABASE_NAME \
      --name "PolicyVectors" \
      --partition-key-path "/metadata/orgId" \
      --vector-embedding-policy "$V_POLICY" \
      --idx "$I_POLICY"

   # B. PolicyVectorParents (Parent Chunk Store)
   az cosmosdb sql container create \
      --account-name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --database-name $DATABASE_NAME \
      --name "PolicyVectorParents" \
      --partition-key-path "/metadata/orgId"

   # C. AuditHistory (Audit Logs)
   az cosmosdb sql container create \
      --account-name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --database-name $DATABASE_NAME \
      --name "AuditHistory" \
      --partition-key-path "/orgId"

   # 10. Output Deployment Keys
   echo "--- COPY TO YOUR .ENV FILE ---"
   echo "COSMOS_ENDPOINT: https://$COSMOS_ACCOUNT.documents.azure.com:443/"
   az cosmosdb keys list --name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --query "primaryMasterKey" -o tsv
   az cognitiveservices account keys list --name $OPENAI_ACCOUNT --resource-group $RESOURCE_GROUP --query "key1" -o tsv
   az cognitiveservices account show --name $OPENAI_ACCOUNT --resource-group $RESOURCE_GROUP --query "properties.endpoint" -o tsv
   ```

3. Create a `.env` file based on the following template:
   ```env
   COSMOS_DB_ENDPOINT=your_cosmos_endpoint
   COSMOS_DB_KEY=your_cosmos_key
   AZURE_OPENAI_API_KEY=your_openai_key
   AZURE_OPENAI_ENDPOINT=your_openai_endpoint
   AZURE_STORAGE_CONNECTION_STRING=your_storage_connection_string
   CLERK_SECRET_KEY=your_clerk_secret_key
   CLERK_FRONTEND_API=your_clerk_frontend_api
   ```
4. Install dependencies:
   ```bash
   uv sync
   ```
5. Run the FastAPI server:
   ```bash
   uv run fastapi dev
   ```
   _The server will start at `http://localhost:8000`._

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Create a `.env` file and add these items:

   ```env
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   VITE_API_BASE_URL=http://localhost:8000 //for local dev
   CLERK_SECRET_KEY=your_clerk_secret_key
   ```

3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
   _The app will be accessible at `http://localhost:3000`._
