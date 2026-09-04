from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime, date, time
import re

# ==========================================
# 1. AUTHENTICATION & USERS SCHEMAS
# ==========================================
class UserCreate(BaseModel):
    username: str
    email: str = Field(..., pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    password: str
    role: Optional[str] = "Lab Technician"

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True

# පළමු පිවිසුම් උගුල (Zero-Trust Password Change)
class PasswordChange(BaseModel):
    username: str
    temp_password: str
    new_password: str

    @field_validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('මුරපදයේ අවම වශයෙන් අකුරු 8ක් තිබිය යුතුය.')
        if not re.search(r'[A-Z]', v):
            raise ValueError('මුරපදයේ අවම වශයෙන් එක් කැපිටල් අකුරක් (A-Z) තිබිය යුතුය.')
        if not re.search(r'[a-z]', v):
            raise ValueError('මුරපදයේ අවම වශයෙන් එක් සිම්පල් අකුරක් (a-z) තිබිය යුතුය.')
        if not re.search(r'\d', v):
            raise ValueError('මුරපදයේ අවම වශයෙන් එක් ඉලක්කමක් (0-9) තිබිය යුතුය.')
        if not re.search(r'[@#\$%\^&\*\(\)_\+\-\=\[\]\{\};:"\\|,.<>\/\?]', v):
            raise ValueError('මුරපදයේ අවම වශයෙන් එක් සංකේතයක් (@, #, $) තිබිය යුතුය.')
        return v

# ==========================================
# 2. PATIENT REGISTRATION (Self-Registration)
# ==========================================
class PatientCreate(BaseModel):
    full_name: str = Field(..., pattern=r'^[a-zA-Z\s]+$') # අකුරු සහ හිස්තැන් පමණි
    dob: date 
    gender: str = Field(..., pattern=r'^[a-zA-Z]+$') 
    nic: str = Field(..., pattern=r'^([0-9]{9}[xXvV]|[0-9]{12})$') 
    city: str = Field(..., pattern=r'^[a-zA-Z\s]+$')
    province: str = Field(..., pattern=r'^[a-zA-Z\s]+$')
    home_address: str
    contact_number: str = Field(..., pattern=r'^\d{10}$') 
    email: str = Field(..., pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    username: str = Field(..., pattern=r'^[a-zA-Z0-9]+$') 
    password: str 
    consent_agreed: bool # අලුතින් එක් කළ අනිවාර්ය එකඟතාවය

    # 1. Backend Password Strength Validation
    @field_validator('password')
    def validate_password(cls, v):
        if len(v) < 8: raise ValueError('මුරපදයේ අවම වශයෙන් අකුරු 8ක් තිබිය යුතුය.')
        if not re.search(r'[A-Z]', v): raise ValueError('මුරපදයේ අවම වශයෙන් එක් කැපිටල් අකුරක් (A-Z) තිබිය යුතුය.')
        if not re.search(r'[a-z]', v): raise ValueError('මුරපදයේ අවම වශයෙන් එක් සිම්පල් අකුරක් (a-z) තිබිය යුතුය.')
        if not re.search(r'\d', v): raise ValueError('මුරපදයේ අවම වශයෙන් එක් ඉලක්කමක් (0-9) තිබිය යුතුය.')
        if not re.search(r'[@#\$%\^&\*\(\)_\+\-\=\[\]\{\};:"\\|,.<>\/\?]', v): raise ValueError('මුරපදයේ අවම වශයෙන් එක් සංකේතයක් තිබිය යුතුය.')
        return v

    # 2. Consent Validation
    @field_validator('consent_agreed')
    def check_consent(cls, v):
        if not v:
            raise ValueError('ලියාපදිංචි වීමට නම් ඔබ Privacy Policy සඳහා අනිවාර්යයෙන්ම එකඟ විය යුතුය.')
        return v

class PatientResponse(BaseModel):
    id: int
    pid: str # පද්ධතියෙන් හැදෙන P1234 අංකය
    full_name: str
    age: int # Backend එකෙන් ගණනය වන වයස
    nic: str
    contact_number: str
    is_active: bool

    class Config:
        from_attributes = True

# ==========================================
# 3. EMPLOYEE ONBOARDING (Admin Only)
# ==========================================
class DoctorCreateAdmin(BaseModel):
    full_name: str = Field(..., pattern=r'^[a-zA-Z\s]+$')
    dob: date
    gender: str
    contact_number: str = Field(..., pattern=r'^\d{10}$')
    nic: str = Field(..., pattern=r'^([0-9]{9}[xXvV]|[0-9]{12})$')
    email: str = Field(..., pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    home_address: str
    specialization: str = Field(..., pattern=r'^[a-zA-Z\s]+$') # අකුරු පමණි
    qualifications: str = Field(..., pattern=r'^[a-zA-Z\.\s]+$') # අකුරු සහ තිත් (උදා: MBBS, MD.)
    experience_years: int
    slmc_number: str = Field(..., pattern=r'^[a-zA-Z0-9]+$') # අකුරු සහ ඉලක්කම්

class LabTechCreateAdmin(BaseModel):
    full_name: str = Field(..., pattern=r'^[a-zA-Z\s]+$')
    nic: str = Field(..., pattern=r'^([0-9]{9}[xXvV]|[0-9]{12})$')
    dob: date
    gender: str
    mobile_number: str = Field(..., pattern=r'^\d{10}$')
    email: str = Field(..., pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    residential_address: str
    qualifications: str # අකුරු සහ සංකේත සඳහා සාමාන්‍ය string
    mlt_id: str = Field(..., pattern=r'^[a-zA-Z0-9]+$') # අකුරු සහ ඉලක්කම්

# ==========================================
# 4. CLINICAL & HOSPITAL OPERATIONS
# ==========================================
class LabTestRequest(BaseModel):
    test_name: str
class LabTestCreate(BaseModel):
    patient_id: int
    test_name: str

class LabTestResponse(BaseModel):
    id: int
    patient_id: int
    test_name: str
    status: str
    received_time: datetime
    completed_time: Optional[datetime] = None
    
    # --- අලුතින් දැමූ SHA-256 Hash ප්‍රතිදානය (Report Verification Tool සඳහා) ---
    file_hash: Optional[str] = None

    class Config:
        from_attributes = True

class DoctorScheduleBase(BaseModel):
    date: date
    start_time: time
    end_time: time
    max_patients: int

class DoctorScheduleCreate(DoctorScheduleBase):
    doctor_name: str

class DoctorScheduleResponse(DoctorScheduleBase):
    id: int
    doctor_id: int

    class Config:
        from_attributes = True

class AppointmentBase(BaseModel):
    doctor_name: str
    date: date
    slot_number: int

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentResponse(AppointmentBase):
    id: int
    appointment_number: str
    patient_id: int
    status: str

    class Config:
        from_attributes = True

class BillBase(BaseModel):
    appointment_id: int
    patient_id: int
    doctor_fee: float = 0.0
    lab_fee: float = 0.0
    total_amount: float = 0.0
    status: str = "PENDING"

class BillCreate(BillBase):
    pass

class BillResponse(BillBase):
    id: int
    bill_number: str

    class Config:
        from_attributes = True

class PrescriptionItemBase(BaseModel):
    medicine_name: str
    generic_name: str           # --- අලුතින් එක් කළ ---
    strength: str               # --- අලුතින් එක් කළ ---
    route: str                  # --- අලුතින් එක් කළ ---
    quantity: int               # --- අලුතින් එක් කළ ---
    before_after_meals: str     # --- අලුතින් එක් කළ ---
    dose: str
    frequency: str
    duration: str
    instructions: str

class PrescriptionCreate(BaseModel):
    medicines: List[PrescriptionItemBase]
    doctor_note: Optional[str] = None
    override_warning: bool = False

class PrescriptionItemResponse(PrescriptionItemBase):
    id: int
    
    class Config:
        from_attributes = True

class PrescriptionResponse(BaseModel):
    id: int
    prescription_number: str
    doctor_note: Optional[str] = None
    is_overridden: bool
    issue_time: datetime
    items: List[PrescriptionItemResponse] = []

    class Config:
        from_attributes = True

# ==========================================
# 5. CHATBOT (ARABELLA) SCHEMAS
# ==========================================
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    session_id: int

# ==========================================
# 6. CLINICAL BLINDNESS DTOs (Data Transfer Objects)
# ==========================================

# 1. Admin සහ අන් අයට පෙන්වන සීමිත දත්ත ආකෘතිය (Sensitive Data Hidden)
class PatientProfileBlindResponse(BaseModel):
    access_level: str = "CLINICAL_BLINDNESS_ACTIVE"
    pid: str
    full_name: str
    age: int
    gender: str
    contact_number: str
    city: str
    # මෙහි කිසිදු රසායනාගාර වාර්තාවක් හෝ බෙහෙත් වට්ටෝරුවක් අඩංගු නොවේ!

    class Config:
        from_attributes = True

# 2. වෛද්‍යවරුන්ට පෙන්වන සම්පූර්ණ දත්ත ආකෘතිය (Full Medical Record)
class PatientProfileFullResponse(BaseModel):
    access_level: str = "FULL_MEDICAL_ACCESS"
    pid: str
    full_name: str
    age: int
    gender: str
    contact_number: str
    
    # වෛද්‍ය දත්ත (Clinical Data)
    lab_tests: List[LabTestResponse] = []
    prescriptions: List[PrescriptionResponse] = []

    class Config:
        from_attributes = True

# ==========================================
# 7. MFA & NOTIFICATION SCHEMAS
# ==========================================
class MFASetupResponse(BaseModel):
    secret: str
    qr_uri: str

class MFAVerifyRequest(BaseModel):
    otp_code: Optional[str] = None
    app_code: Optional[str] = None

class LoginMFARequest(BaseModel):
    temp_token: str
    email_otp: Optional[str] = None
    app_totp: Optional[str] = None

class NotificationResponse(BaseModel):
    id: int
    message: str
    notification_type: str
    reference_id: int
    is_read: bool
    created_at: datetime
    class Config:
        from_attributes = True

class SessionResponse(BaseModel):
    id: int
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime
    is_active: bool
    is_current: Optional[bool] = False # මේකෙන් තමන් දැනට ඉන්න Session එක Highlight කරලා පෙන්වන්න පුළුවන්
    
    class Config:
        from_attributes = True

# ==========================================
# 8. MEDICAL HISTORY & TIMELINE SCHEMAS
# ==========================================
class PastLabTestResponse(BaseModel):
    test_name: str
    status: str
    completed_time: Optional[datetime] = None
    
class PastPrescriptionResponse(BaseModel):
    prescription_number: str
    issue_time: datetime
    doctor_note: Optional[str]
    items: List[PrescriptionItemResponse] = []

class HistoryTimelineResponse(BaseModel):
    date: date
    doctor_name: str
    prescriptions: List[PastPrescriptionResponse] = []
    lab_tests: List[PastLabTestResponse] = []
    
    class Config:
        from_attributes = True

# ==========================================
# 9. PROFILE CHANGE & RESET SCHEMAS
# ==========================================
class ProfileChangeRequestCreate(BaseModel):
    requested_field: str
    new_value: str

class ProfileChangeRequestResponse(BaseModel):
    id: int
    patient_id: int
    requested_field: str
    new_value: str
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    reset_token: str
    new_password: str

# ==========================================
# 10. BI DASHBOARDS & ANALYTICS SCHEMAS
# ==========================================
class LabThroughput(BaseModel):
    total_requests: int
    completed: int
    pending: int

class LabAnalyticsResponse(BaseModel):
    throughput: LabThroughput
    average_tat_hours: float # Turnaround Time (සාමාන්‍ය කාලය)

class AdminDashboardResponse(BaseModel):
    total_patients: int
    pending_bills_count: int
    total_revenue: float
    active_doctors: int

# ==========================================
# 11. INVENTORY & ENHANCED DASHBOARD SCHEMAS
# ==========================================
class MedicineCreate(BaseModel):
    name: str
    brand: str
    category: str
    unit_price: float
    stock_quantity: int

class MedicineResponse(BaseModel):
    id: int
    name: str
    brand: str
    category: str
    is_available: bool
    class Config:
        from_attributes = True

class DailyRevenue(BaseModel):
    date: str
    amount: float

class EnhancedAdminDashboard(AdminDashboardResponse):
    revenue_last_7_days: List[DailyRevenue] = [] # ප්‍රස්ථාර ඇඳීමට (For Line Charts)

# --- Security & Privacy Center Schemas ---

class PatientProfileUpdate(BaseModel):
    email: Optional[str] = None
    contact_number: Optional[str] = None
    home_address: Optional[str] = None

class PasswordChangeLoggedIn(BaseModel):
    current_password: str
    new_password: str

class UsernameChangeRequest(BaseModel):
    current_password: str
    new_username: str