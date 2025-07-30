from db.mongo import db

async def get_next_document_id():
    counter = await db.counters.find_one_and_update(
        {"_id": "documentId"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )

    seq = counter["seq"]
    return f"DOC{seq:05d}"
