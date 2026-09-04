from database import engine
from models import Base

print("All old tables are being deleted...")
Base.metadata.drop_all(bind=engine)

print("New tables are being created with new columns...")
Base.metadata.create_all(bind=engine)

print("Database successfully reset!")