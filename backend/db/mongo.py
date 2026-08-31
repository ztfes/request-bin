import os

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
client = MongoClient(MONGO_URL)
db = client.get_default_database()          # -> "request_bin" from the URL
requests_collection = db["captured_requests"]
