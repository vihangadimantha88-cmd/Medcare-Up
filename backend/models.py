from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Date, Time, Float, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

# ==========================================
# 1. CORE USERS & ROLES
# ==========================================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String) 
    role = Column(String, default="Patient") 
    is_active = Column(Boolean, default=True)
    is_first_login = Column(Boolean, default=True) 
    
    
    employee_id = Column(String, unique=True, index=True, nullable=True) 
    full_name = Column(String, nullable=True)
    dob = Column(Date, nullable=True)
    gender = Column(String, nullable=True)
    contact_number = Column(String, nullable=True)
    nic = Column(String, nullable=True)
    address = Column(String, nullable=True)
    
   
    specialization = Column(String, nullable=True) 
    qualifications = Column(String, nullable=True) 
    experience_years = Column(Integer, nullable=True) 
    slmc_number = Column(String, unique=True, index=True, nullable=True)
    
    
    mlt_id = Column(String, unique=True, index=True, nullable=True)

    
    mfa_email_enabled = Column(Boolean, default=False)
    mfa_app_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String, nullable=True) 

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    pid = Column(String, unique=True, index=True) 
    full_name = Column(String)
    dob = Column(Date)
    gender = Column(String)
    age = Column(Integer) 
    nic = Column(String, unique=True, index=True) 
    contact_number = Column(String)
    city = Column(String)
    province = Column(String)
    home_address = Column(String)
    is_active = Column(Boolean, default=True)

# ==========================================
# 2. HOSPITAL OPERATIONS (Appointments & Labs)
# ==========================================
class DoctorSchedule(Base):
    __tablename__ = "doctor_schedules"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id")) 
    date = Column(Date, index=True)
    start_time = Column(Time)
    end_time = Column(Time)
    max_patients = Column(Integer) 

    doctor = relationship("User", foreign_keys=[doctor_id])

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    appointment_number = Column(String, unique=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    doctor_name = Column(String)
    date = Column(Date)
    slot_number = Column(Integer)
    status = Column(String, default="Pending")
    
    
    completed_at = Column(DateTime, nullable=True) 
    
    bill = relationship("Bill", back_populates="appointment", uselist=False)

class LabTest(Base):
    __tablename__ = "lab_tests"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    test_name = Column(String, index=True)
    status = Column(String, default="Pending") 
    received_time = Column(DateTime, default=datetime.utcnow) 
    completed_time = Column(DateTime, nullable=True)
    
   
    file_hash = Column(String, nullable=True)
    
    patient = relationship("User")

# ==========================================
# 3. BILLING & PRESCRIPTIONS
# ==========================================
class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, index=True)
    bill_number = Column(String, unique=True, index=True) 
    appointment_id = Column(Integer, ForeignKey("appointments.id"))
    patient_id = Column(Integer, ForeignKey("users.id"))
    
    doctor_fee = Column(Float, default=0.0)
    lab_fee = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    status = Column(String, default="PENDING") 

    appointment = relationship("Appointment")
    patient = relationship("User")

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    prescription_number = Column(String, unique=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"))
    doctor_id = Column(Integer, ForeignKey("users.id"))
    patient_id = Column(Integer, ForeignKey("users.id"))
    doctor_note = Column(String, nullable=True)
    is_overridden = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
   
    medicines = relationship("PrescriptionItem", back_populates="prescription")

class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"))
    
    medicine_name = Column(String)
    
    generic_name = Column(String, nullable=True)
    strength = Column(String, nullable=True)
    route = Column(String, nullable=True)
    quantity = Column(Integer, nullable=True)
    before_after_meals = Column(String, nullable=True)
    # ----------------------------------
    dose = Column(String)
    frequency = Column(String)
    duration = Column(String)
    instructions = Column(String)

    prescription = relationship("Prescription", back_populates="medicines")

# ==========================================
# 4. AI TRIAGE (Arabella Chat)
# ==========================================
class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    session_token = Column(String, unique=True, index=True) 
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    messages = relationship("ChatMessage", back_populates="session")
    patient = relationship("User", foreign_keys=[patient_id])

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"))
    sender = Column(String) 
    message = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")

# ==========================================
# 5. IMMUTABLE AUDIT LOGS & IP TRACKING
# ==========================================
class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id")) 
    action = Column(String) 
    details = Column(String) 
    ip_address = Column(String, nullable=True) 
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    admin = relationship("User", foreign_keys=[admin_id])

class PatientActivityLog(Base):
    __tablename__ = "patient_activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String) 
    details = Column(String) 
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    patient = relationship("User", foreign_keys=[patient_id])


class DoctorActivityLog(Base):
    __tablename__ = "doctor_activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String) 
    details = Column(String) 
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    doctor = relationship("User", foreign_keys=[doctor_id])

class LabTechActivityLog(Base):
    __tablename__ = "lab_tech_activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    tech_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String) 
    details = Column(String) 
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    tech = relationship("User", foreign_keys=[tech_id])

# ==========================================
# 6. MFA (OTP) & NOTIFICATIONS
# ==========================================
class EmailOTP(Base):
    __tablename__ = "email_otps"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    otp_code = Column(String)
    expires_at = Column(DateTime) # 

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    message = Column(String)
    notification_type = Column(String) # 'PRESCRIPTION'  'LAB_REPORT'
    reference_id = Column(Integer) # 
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

# ==========================================
# 7. ACTIVE SESSIONS TRACKING
# ==========================================
class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    session_token = Column(String, unique=True, index=True) # 
    ip_address = Column(String, nullable=True) # 
    user_agent = Column(String, nullable=True) # 
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True) # 
    
    user = relationship("User")

# ==========================================
# 8. PROFILE CHANGE REQUESTS & MFA RECOVERY
# ==========================================
class ProfileChangeRequest(Base):
    __tablename__ = "profile_change_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    requested_field = Column(String) #  "full_name", "nic"
    new_value = Column(String)
    status = Column(String, default="PENDING") # PENDING, APPROVED, REJECTED
    created_at = Column(DateTime, default=datetime.utcnow)

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime)
    is_used = Column(Boolean, default=False)

# ==========================================
# 9. HOSPITAL INVENTORY (Medicines)
# ==========================================
class MedicineInventory(Base):
    __tablename__ = "medicine_inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) 
    brand = Column(String) 
    category = Column(String) # Tablet, Syrup, Injection etc.
    unit_price = Column(Float, default=0.0)
    stock_quantity = Column(Integer, default=0)
    is_available = Column(Boolean, default=True)