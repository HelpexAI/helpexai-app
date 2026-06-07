# Qdrant Cloud Setup Instructions

## 1. Create Cluster
- Go to cloud.qdrant.io
- Create a new cluster (Free tier)
- Region: us-east4 (or closest to your target users)
- Copy your cluster URL and API key → add to .env.local

## 2. Create Collection
Run this once to create the collection with correct vector dimensions.

Use the Qdrant Cloud dashboard or run via API:

```bash
curl -X PUT "https://YOUR-CLUSTER-URL/collections/helpexai_dev" \
  -H "Content-Type: application/json" \
  -H "api-key: YOUR-QDRANT-API-KEY" \
  -d '{
    "vectors": {
      "size": 1536,
      "distance": "Cosine"
    },
    "optimizers_config": {
      "default_segment_number": 2
    },
    "replication_factor": 1
  }'
```

## 3. Create Payload Indexes (for fast filtering)

```bash
# Index namespace field (used to isolate user data)
curl -X PUT "https://YOUR-CLUSTER-URL/collections/helpexai_dev/index" \
  -H "Content-Type: application/json" \
  -H "api-key: YOUR-QDRANT-API-KEY" \
  -d '{"field_name": "namespace", "field_schema": "keyword"}'

# Index docId field (used for document deletion)
curl -X PUT "https://YOUR-CLUSTER-URL/collections/helpexai_dev/index" \
  -H "Content-Type: application/json" \
  -H "api-key: YOUR-QDRANT-API-KEY" \
  -d '{"field_name": "payload.docId", "field_schema": "keyword"}'
```

## 4. Verify
```bash
curl "https://YOUR-CLUSTER-URL/collections/helpexai_dev" \
  -H "api-key: YOUR-QDRANT-API-KEY"
```

Expected: status "green", vectors_count: 0
