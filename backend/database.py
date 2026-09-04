from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# ඔයාගේ PostgreSQL Database එකට අදාළ Connection URL එක
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:20031015%40kali@localhost:5432/medcare_db"

# Database Engine එක නිර්මාණය කිරීම
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Database Session එක නිර්මාණය කිරීම
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Models සඳහා Base Class එක නිර්මාණය කිරීම
Base = declarative_base()

# Dependency එකක් ලෙස Database Session එක ලබා දීම
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()