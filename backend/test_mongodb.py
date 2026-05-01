"""
Test MongoDB Connection
"""

print("=" * 60)
print("MongoDB Connection Test")
print("=" * 60)

# Test direct connection
print("\n1. Testing direct MongoDB connection...")
try:
    from pymongo import MongoClient
    import os
    
    MONGO_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/")
    print(f"   URI: {MONGO_URI}")
    
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
    client.admin.command('ping')
    print("   ✓ Direct connection successful")
    
    # Check database
    db = client["nyayalens"]
    collection = db["analysis_cache"]
    count = collection.count_documents({})
    print(f"   ✓ Database 'nyayalens' accessible")
    print(f"   ✓ Collection 'analysis_cache' has {count} documents")
    
except Exception as e:
    print(f"   ✗ Connection failed: {e}")

# Test through document_cache service
print("\n2. Testing through document_cache service...")
try:
    from services.document_cache import _init_mongo, USE_MONGO, collection
    
    _init_mongo()
    
    if USE_MONGO:
        print("   ✓ MongoDB connected via service")
        if collection:
            count = collection.count_documents({})
            print(f"   ✓ Cache has {count} documents")
    else:
        print("   ✗ MongoDB not connected via service")
        
except Exception as e:
    print(f"   ✗ Service test failed: {e}")

print("\n" + "=" * 60)
print("Test Complete!")
print("=" * 60)

print("\n💡 Tips:")
print("   - Make sure MongoDB service is running: net start MongoDB")
print("   - Check MONGODB_URI in .env file")
print("   - Default URI: mongodb://localhost:27017/")
