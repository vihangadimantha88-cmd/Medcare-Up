from database import engine
from models import Base

print("🔴 පරණ වගු (Tables) සියල්ල මකා දමමින් පවතී...")
Base.metadata.drop_all(bind=engine)

print("🟢 නව තීරු (Columns) සමඟ වගු අලුතින් නිර්මාණය කරමින් පවතී...")
Base.metadata.create_all(bind=engine)

print("✅ Database එක සාර්ථකව Reset කරන ලදී!")