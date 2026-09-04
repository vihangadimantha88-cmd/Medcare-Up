from typing import List, Optional
from datetime import datetime, date, time, timedelta
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import extract
from pydantic import BaseModel
import os
import random
import re
import uuid
import base64
import hashlib # --- SHA-256 Hashing සඳහා අලුතින් එක් කරන ලදී ---
from cryptography.fernet import Fernet
from stegano import lsb
from dotenv import load_dotenv

from openai import OpenAI
import pyotp
from jose import jwt, JWTError
from apscheduler.schedulers.background import BackgroundScheduler
from contextlib import asynccontextmanager
from fastapi.responses import FileResponse
import glob
import models, schemas, hashing, auth
from database import engine, get_db, SessionLocal

load_dotenv()

from web3 import Web3

# =========================================================
# BLOCKCHAIN CONFIGURATION (Sepolia Testnet)
# =========================================================
# (සැබෑ පද්ධතියකදී මේවා .env ෆයිල් එකට දැමිය යුතුය)
SEPOLIA_RPC_URL = os.getenv("SEPOLIA_RPC_URL", "https://rpc.sepolia.org") 
WALLET_PRIVATE_KEY = os.getenv("WALLET_PRIVATE_KEY", "0x0000000000000000000000000000000000000000000000000000000000000000") # මෙතැනට රෝහලේ Crypto Wallet කේතය එයි
WALLET_ADDRESS = os.getenv("WALLET_ADDRESS", "0x0000000000000000000000000000000000000000")

def push_hash_to_sepolia(hash_data: str):
    """PDF 6.5.2: SHA-256 Hash එක සැබෑ Sepolia Blockchain එකට යැවීම"""
    try:
        w3 = Web3(Web3.HTTPProvider(SEPOLIA_RPC_URL))
        if not w3.is_connected():
            print("[BLOCKCHAIN ERROR] Sepolia ජාලයට සම්බන්ධ විය නොහැක.")
            return "Blockchain Connection Failed"

        # 0 ETH යවමින් Transaction Data එක විදිහට අපේ Hash එක Blockchain එකේ ලියනවා (Gas-efficient method)
        nonce = w3.eth.get_transaction_count(WALLET_ADDRESS)
        tx = {
            'nonce': nonce,
            'to': WALLET_ADDRESS, # රෝහලේ Wallet එකෙන්ම රෝහලේ Wallet එකටම යවයි (Data සේව් කිරීමට පමණි)
            'value': w3.to_wei(0, 'ether'),
            'gas': 2000000,
            'gasPrice': w3.eth.gas_price,
            'data': Web3.to_bytes(text=hash_data) # කේතාංකය (Hash) Blockchain එකට ඇතුළු කිරීම
        }

        # Transaction එක Sign කරලා යැවීම
        signed_tx = w3.eth.account.sign_transaction(tx, WALLET_PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)

        # Blockchain එකේ සේව් වුණු රිසිට් එකේ ID එක (TxID) ලබා දීම
        return w3.to_hex(tx_hash)
    except Exception as e:
        print(f"[BLOCKCHAIN ERROR] {str(e)}")
        return "Blockchain Override Failed (Keys missing or network error)"
models.Base.metadata.create_all(bind=engine)
def send_appointment_reminders():
    """හෙට දිනයට ඇති හමුවීම් සඳහා මතක් කිරීමේ පණිවිඩ (Reminders) යැවීම"""
    db = SessionLocal()
    tomorrow = datetime.utcnow().date() + timedelta(days=1)
    
    upcoming_apts = db.query(models.Appointment).filter(
        models.Appointment.status == "Confirmed",
        models.Appointment.date == tomorrow
    ).all()
    
    for apt in upcoming_apts:
        msg = f"Reminder: හෙට ({tomorrow}) වෛද්‍ය {apt.doctor_name} සමඟ ඔබගේ හමුවීම (අංක {apt.slot_number}) යොදාගෙන ඇත."
        db.add(models.Notification(patient_id=apt.patient_id, message=msg, notification_type="APPOINTMENT_REMINDER", reference_id=apt.id))
        
    db.commit()
    db.close()
    print(f"[CRON] Sent Reminders for tomorrow's ({tomorrow}) appointments")

def mark_no_shows_cron_job():
    """ඊයේ දිනට තිබූ නමුත් සහභාගී නොවූ හමුවීම් 'No Show' ලෙස සලකුණු කිරීම"""
    db = SessionLocal()
    yesterday = datetime.utcnow().date() - timedelta(days=1)
    
    missed_appointments = db.query(models.Appointment).filter(
        models.Appointment.status == "Confirmed",
        models.Appointment.date <= yesterday
    ).all()
    
    for apt in missed_appointments:
        apt.status = "No Show"
    
    db.commit()
    db.close()
    print("[CRON] Marked missed appointments as 'No Show'")

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = BackgroundScheduler()
    scheduler.add_job(mark_no_shows_cron_job, 'cron', hour=0, minute=1)
    scheduler.add_job(send_appointment_reminders, 'cron', hour=8, minute=0) # උදේ 8 ට Reminders යවයි
    scheduler.start()
    
    db = next(get_db())
    admin_exists = db.query(models.User).filter(models.User.role == "Admin").first()
    if not admin_exists:
        hashed_pw = hashing.Hash.bcrypt("Medcare@Admin123")
# 🚨 FIX 1: Genesis Admin නිර්මාණය කිරීමේදී පළමු පිවිසුම් ආරක්ෂාව (First Login True) සක්‍රීය කිරීම
        genesis_admin = models.User(username="superadmin", email="admin@medcare.lk", hashed_password=hashed_pw, role="Admin", is_active=True, is_first_login=True)
        db.add(genesis_admin)
        db.commit()
        print("="*50)
        print("🚀 [SYSTEM DEPLOYMENT] GENESIS ADMIN CREATED!")
        print("="*50)
    db.close()
    
    yield
    scheduler.shutdown()

# =========================================================
# AUDIT LOGGING HELPERS (Roles 4 සඳහාම IP Tracking)
# =========================================================
def log_admin_action(db: Session, admin_id: int, action: str, ip_address: str, details: str):
    db.add(models.AdminAuditLog(admin_id=admin_id, action=action, ip_address=ip_address, details=details))
    db.commit()

def log_patient_action(db: Session, patient_id: int, action: str, ip_address: str, details: str):
    db.add(models.PatientActivityLog(patient_id=patient_id, action=action, ip_address=ip_address, details=details))
    db.commit()

def log_doctor_action(db: Session, doctor_id: int, action: str, ip_address: str, details: str):
    db.add(models.DoctorActivityLog(doctor_id=doctor_id, action=action, ip_address=ip_address, details=details))
    db.commit()

def log_lab_tech_action(db: Session, tech_id: int, action: str, ip_address: str, details: str):
    db.add(models.LabTechActivityLog(tech_id=tech_id, action=action, ip_address=ip_address, details=details))
    db.commit()
# =========================================================
app = FastAPI(title="Medcare Backend API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # සැබෑ පද්ධතියකදී මෙය ["http://localhost:3000"] ලෙස වෙනස් කළ හැක
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
def read_root():
    return {"message": "Welcome to Project Medcare Backend! Server is running successfully."}

# ---------------------------------------------------------
# LOGIN WITH MFA & IP TRACKING
# ---------------------------------------------------------
@app.post("/login", tags=["Authentication"])
def login(request: OAuth2PasswordRequestForm = Depends(), req: Request = None, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == request.username).first()
    client_ip = req.client.host if req else "Unknown"

# 1. FAILED LOGIN TRACKING (Brute-force detection for ALL users)
    if not user or not hashing.Hash.verify(user.hashed_password, request.password):
        if user: # පරිශීලකයා පද්ධතියේ සිටී නම් පමණක් ඔහුගේ Role එක අනුව Log කරයි
            if user.role == "Patient": log_patient_action(db, user.id, "FAILED_LOGIN", client_ip, "Incorrect password attempt")
            elif user.role == "Admin": log_admin_action(db, user.id, "FAILED_LOGIN", client_ip, "Incorrect password attempt")
            elif user.role == "Doctor": log_doctor_action(db, user.id, "FAILED_LOGIN", client_ip, "Incorrect password attempt")
            elif user.role == "Lab Technician": log_lab_tech_action(db, user.id, "FAILED_LOGIN", client_ip, "Incorrect password attempt")
        raise HTTPException(status_code=401, detail="Username හෝ Password වැරදියි!")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Your account has been deactivated.")

    # MFA ලොජික් එක
    if user.mfa_email_enabled or user.mfa_app_enabled:
        temp_token = auth.create_access_token(data={"sub": user.username, "type": "mfa_pending"})
        if user.mfa_email_enabled:
            otp_val = str(random.randint(100000, 999999))
            expires = datetime.utcnow() + timedelta(minutes=3)
            db.add(models.EmailOTP(user_id=user.id, otp_code=otp_val, expires_at=expires))
            db.commit()
            print(f"[MOCK EMAIL] Your OTP is: {otp_val}") 
        return {"mfa_required": True, "temp_token": temp_token, "message": "කරුණාකර MFA කේතය ලබා දෙන්න."}

    # 2. SESSION TRACKING FOR ALL LOGINS (Missing Session Bug Fixed)
    access_token = auth.create_access_token(data={"sub": user.username})
    user_agent = req.headers.get("User-Agent", "Unknown Device")
    
    new_session = models.UserSession(
        user_id=user.id,
        session_token=access_token,
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(new_session)
    db.commit()
    
    if user.role == "Patient": log_patient_action(db, user.id, "SUCCESSFUL_LOGIN", client_ip, f"Logged in via {user_agent[:30]}")
    elif user.role == "Admin": log_admin_action(db, user.id, "LOGIN", client_ip, "Logged in")
    elif user.role == "Doctor": log_doctor_action(db, user.id, "LOGIN", client_ip, "Logged in")
    elif user.role == "Lab Technician": log_lab_tech_action(db, user.id, "LOGIN", client_ip, "Logged in")
    
    return {"access_token": access_token, "token_type": "bearer", "is_first_login": user.is_first_login}

@app.post("/login/mfa", tags=["Authentication"])
def login_mfa_verify(request: schemas.LoginMFARequest, req: Request, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(request.temp_token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        token_type: str = payload.get("type")
        if token_type != "mfa_pending": raise HTTPException(status_code=400, detail="Invalid token type.")
    except Exception:
        raise HTTPException(status_code=401, detail="කාලය ඉකුත් වී හෝ Token එක වැරදියි.")
        
    user = db.query(models.User).filter(models.User.username == username).first()
    
    if user.mfa_email_enabled:
        otp_record = db.query(models.EmailOTP).filter(models.EmailOTP.user_id == user.id).order_by(models.EmailOTP.id.desc()).first()
        if not otp_record or otp_record.otp_code != request.email_otp:
            raise HTTPException(status_code=401, detail="Email OTP එක වැරදියි.")
        if datetime.utcnow() > otp_record.expires_at:
            raise HTTPException(status_code=401, detail="Email OTP එකෙහි විනාඩි 3 ක කාලය ඉකුත් වී ඇත.")
            
    if user.mfa_app_enabled:
        totp = pyotp.TOTP(user.mfa_secret)
        if not totp.verify(request.app_totp):
            raise HTTPException(status_code=401, detail="Authenticator App කේතය වැරදියි.")

    access_token = auth.create_access_token(data={"sub": user.username})
    
    # 🚨 FIX: Server Crash වීම වැළැක්වීමට client_ip එක උඩට ගෙන ඒම
    client_ip = req.client.host if req else "Unknown"
    
    # ලොග් වන වෙලාවේ Session එක Database එකට දැමීම
    user_agent = req.headers.get("User-Agent", "Unknown Device")
    new_session = models.UserSession(
        user_id=user.id,
        session_token=access_token,
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(new_session)
    db.commit()
    log_patient_action(db, user.id, "MFA_LOGIN", client_ip, "Successfully logged in with MFA") if user.role == "Patient" else None
    
    return {"access_token": access_token, "token_type": "bearer", "is_first_login": user.is_first_login}

@app.post("/auth/force-change-password", tags=["Authentication"])
def force_change_password(request: schemas.PasswordChange, req: Request, db: Session = Depends(get_db)):
    """PDF - Admin Onboarding: තාවකාලික මුරපද මාරු කිරීම සහ දැඩි මුරපද නීති"""
    
    password_regex = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$"
    if not re.match(password_regex, request.new_password):
        raise HTTPException(status_code=400, detail="මුරපදය අවම වශයෙන් අක්ෂර 12 ක්, එක් කැපිටල් අකුරක්, එක් සිම්පල් අකුරක්, එක් ඉලක්කමක් සහ විශේෂ සංකේතයක් (@$!%*?&) සහිත විය යුතුය.")

    user = db.query(models.User).filter(models.User.username == request.username).first()
    if not user or not hashing.Hash.verify(user.hashed_password, request.temp_password):
        raise HTTPException(status_code=400, detail="Username හෝ තාවකාලික මුරපදය වැරදියි!")
    if not user.is_first_login:
        raise HTTPException(status_code=400, detail="ඔබ දැනටමත් ඔබගේ මුරපදය වෙනස් කර ඇත! කරුණාකර Login වන්න.")

    # තාවකාලික මුරපදය අලුත් අගයෙන් Overwrite වී සම්පූර්ණයෙන්ම විනාශ වේ (Destroyed)
    user.hashed_password = hashing.Hash.bcrypt(request.new_password)
    user.is_first_login = False
    db.commit()
    db.refresh(user)
    
    # 🚨 FIX: මුරපදය වෙනස් කිරීම Audit Log එකෙහි සටහන් කිරීම
    client_ip = req.client.host if req else "Unknown"
    if user.role == "Admin": log_admin_action(db, user.id, "PASSWORD_CHANGED", client_ip, "Completed forced password change")
    elif user.role == "Doctor": log_doctor_action(db, user.id, "PASSWORD_CHANGED", client_ip, "Completed forced password change")
    elif user.role == "Lab Technician": log_lab_tech_action(db, user.id, "PASSWORD_CHANGED", client_ip, "Completed forced password change")
    
    return {"message": "මුරපදය සාර්ථකව යාවත්කාලීන කරන ලදී! කරුණාකර නව මුරපදයෙන් Login වන්න."}
# ---------------------------------------------------------
# USER REGISTRATION ENDPOINTS
# ---------------------------------------------------------
# ---------------------------------------------------------
# USER REGISTRATION ENDPOINTS (100% PDF Compliant)
# ---------------------------------------------------------
@app.post("/patients/", response_model=schemas.PatientResponse, tags=["Patients"])
def create_patient(request: schemas.PatientCreate, req: Request, db: Session = Depends(get_db)):
    
    # 1. Email එක පරික්ෂා කිරීම
    if db.query(models.User).filter(models.User.email == request.email).first():
        raise HTTPException(status_code=400, detail="මෙම Email ලිපිනය දැනටමත් පද්ධතියේ ලියාපදිංචි කර ඇත!")
        
    # 2. Username එක පරික්ෂා කිරීම (PDF එකේ ඇති සිංහල පණිවිඩයම)
    if db.query(models.User).filter(models.User.username == request.username).first():
        raise HTTPException(
            status_code=400, 
            detail=f"{request.username} කියන username එක දැනටමත් system එකේ වෙනත් patient කෙනෙක් use කරලා තියෙනවා කරුණාකර වෙනත් username එකක් ඇතුලත් කරන්න"
        )
        
    today = date.today()
    calculated_age = today.year - request.dob.year - ((today.month, today.day) < (request.dob.month, request.dob.day))
    
    # 3. 100% Unique Patient ID (PID) Generation
    while True:
        generated_pid = f"P{random.randint(1000, 9999)}"
        if not db.query(models.Patient).filter(models.Patient.pid == generated_pid).first():
            break

    new_user = models.User(username=request.username, email=request.email, hashed_password=hashing.Hash.bcrypt(request.password), role="Patient", is_first_login=False)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    new_patient = models.Patient(id=new_user.id, pid=generated_pid, full_name=request.full_name, dob=request.dob, gender=request.gender, age=calculated_age, nic=request.nic, contact_number=request.contact_number, city=request.city, province=request.province, home_address=request.home_address)
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    
    client_ip = req.client.host if req else "Unknown"
    log_patient_action(db, new_user.id, "SELF_REGISTER", client_ip, f"Patient registered with PID: {generated_pid}")
    return new_patient

@app.post("/admin/doctors/", tags=["Admin Operations"])
def create_doctor(request: schemas.DoctorCreateAdmin, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_admin)):
    if db.query(models.User).filter(models.User.email == request.email).first():
        raise HTTPException(status_code=400, detail="මෙම Email ලිපිනය දැනටමත් පද්ධතියේ ඇත!")

    while True:
        generated_emp_id = f"D{random.randint(1000, 9999)}"
        if not db.query(models.User).filter(models.User.username == generated_emp_id).first():
            break
            
    # PDF එකට අනුකූලව අංක 4ක ආකෘතිය සැකසීම
    generated_temp_pw = f"DOC-{random.randint(1000, 9999)}-{random.randint(100, 999)}-{random.randint(100, 999)}"

    new_user = models.User(username=generated_emp_id, email=request.email, hashed_password=hashing.Hash.bcrypt(generated_temp_pw), role="Doctor", employee_id=generated_emp_id, full_name=request.full_name, dob=request.dob, gender=request.gender, contact_number=request.contact_number, nic=request.nic, address=request.home_address, specialization=request.specialization, qualifications=request.qualifications, experience_years=request.experience_years, slmc_number=request.slmc_number, is_first_login=True)
    db.add(new_user)
    db.commit()

    client_ip = req.client.host if req else "Unknown"
    log_admin_action(db, current_user.id, "REGISTER_DOCTOR", client_ip, f"Registered new doctor: {generated_emp_id}")
    return {"message": "වෛද්‍යවරයා සාර්ථකව ලියාපදිංචි කරන ලදී!", "employee_id": generated_emp_id, "temporary_password": generated_temp_pw}

@app.post("/admin/lab-techs/", tags=["Admin Operations"])
def create_lab_tech(request: schemas.LabTechCreateAdmin, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_admin)):
    if db.query(models.User).filter(models.User.email == request.email).first():
        raise HTTPException(status_code=400, detail="මෙම Email ලිපිනය දැනටමත් ඇත!")

    while True:
        generated_emp_id = f"L{random.randint(1000, 9999)}"
        if not db.query(models.User).filter(models.User.username == generated_emp_id).first():
            break
            
    # PDF එකට අනුකූලව අංක 4ක ආකෘතිය සැකසීම
    generated_temp_pw = f"LAB-{random.randint(1000, 9999)}-{random.randint(100, 999)}-{random.randint(100, 999)}"

    new_user = models.User(username=generated_emp_id, email=request.email, hashed_password=hashing.Hash.bcrypt(generated_temp_pw), role="Lab Technician", employee_id=generated_emp_id, full_name=request.full_name, dob=request.dob, gender=request.gender, contact_number=request.mobile_number, nic=request.nic, address=request.residential_address, qualifications=request.qualifications, mlt_id=request.mlt_id, is_first_login=True)
    db.add(new_user)
    db.commit()

    client_ip = req.client.host if req else "Unknown"
    log_admin_action(db, current_user.id, "REGISTER_LAB_TECH", client_ip, f"Registered new Lab Tech: {generated_emp_id}")
    return {"message": "රසායනාගාර ශිල්පියා සාර්ථකව ලියාපදිංචි කරන ලදී!", "employee_id": generated_emp_id, "temporary_password": generated_temp_pw}

# --- Employee Offboarding (Soft Delete & Session Kill) ---
@app.put("/admin/users/{employee_id}/deactivate", tags=["Admin Operations"])
def deactivate_employee(employee_id: str, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_admin)):
    """PDF 5.3: සේවකයින් ඉවත් කිරීම සහ Session Kill (Blockchain ඉවත් කර ඇත)"""
    target_user = db.query(models.User).filter(models.User.employee_id == employee_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="සේවකයා සොයාගත නොහැක!")
    
    # 1. Soft Delete (Database එකෙන් අක්‍රිය කිරීම)
    target_user.is_active = False 
    
    # 2. Instant Session Kill (දැනට ලොග් වී සිටී නම් බලහත්කාරයෙන් එළියට විසි කිරීම)
    db.query(models.UserSession).filter(
        models.UserSession.user_id == target_user.id,
        models.UserSession.is_active == True
    ).update({"is_active": False})
    
    db.commit()
    
    client_ip = req.client.host if req else "Unknown"
    
    # Blockchain ඉවත් කර සාමාන්‍ය Database ලොග් එක පමණක් තබා ඇත
    log_admin_action(db, current_user.id, "DEACTIVATE_EMPLOYEE", client_ip, f"Deactivated {employee_id} & Sessions Revoked.")
    
    return {"message": f"සේවකයා ({employee_id}) සාර්ථකව අක්‍රිය කර පද්ධතියෙන් ඉවත් කරන ලදී."}

@app.get("/admin/users/", response_model=List[schemas.UserResponse], tags=["Admin Operations"])
def get_all_users(db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_admin)):
    return db.query(models.User).all()

# ---------------------------------------------------------
# APPOINTMENTS & DOCTOR SCHEDULES
# ---------------------------------------------------------
@app.get("/patients/", response_model=List[schemas.PatientResponse], tags=["Patients"])
def get_patients(db: Session = Depends(get_db), current_user: str = Depends(auth.get_current_user)):
    return db.query(models.Patient).all()

@app.post("/admin/schedules/", response_model=schemas.DoctorScheduleResponse, tags=["Admin Operations"])
def create_doctor_schedule(schedule: schemas.DoctorScheduleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_admin)):
    doctor = db.query(models.User).filter(models.User.username == schedule.doctor_name).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="මෙම නමින් වෛද්‍යවරයෙකු ලියාපදිංචි වී නොමැත!")
# 🚨 FIX 1: එකම දවසට එකම වෛද්‍යවරයාට කාලසටහන් කිහිපයක් සෑදීම (Duplicate Schedules) අවහිර කිරීම
    existing_schedule = db.query(models.DoctorSchedule).filter(
        models.DoctorSchedule.doctor_id == doctor.id, 
        models.DoctorSchedule.date == schedule.date
    ).first()
    
    if existing_schedule:
        raise HTTPException(status_code=400, detail=f"{schedule.date} දිනට මෙම වෛද්‍යවරයා සඳහා දැනටමත් කාලසටහනක් සාදා ඇත!")
    new_schedule = models.DoctorSchedule(doctor_id=doctor.id, date=schedule.date, start_time=schedule.start_time, end_time=schedule.end_time, max_patients=schedule.max_patients)
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)
    return new_schedule

@app.get("/schedules/monthly", tags=["Appointments"])
def get_monthly_schedules(year: int, month: int, db: Session = Depends(get_db)):
    """Frontend Calendar එකට අදාළ මාසයේ වෛද්‍යවරුන් සිටින දින ලබා දීම"""
    schedules = db.query(models.DoctorSchedule).filter(
        extract('year', models.DoctorSchedule.date) == year,
        extract('month', models.DoctorSchedule.date) == month
    ).all()
    
    schedule_data = {}
    for sch in schedules:
        date_str = str(sch.date)
        if date_str not in schedule_data:
            schedule_data[date_str] = []
        doc_name = sch.doctor.full_name if sch.doctor.full_name else sch.doctor.username
        initials = "".join([word[0].upper() for word in doc_name.split() if word])
        schedule_data[date_str].append({
            "doctor_username": sch.doctor.username,
            "doctor_name": doc_name,
            "initials": initials,
            "specialization": sch.doctor.specialization
        })
    return schedule_data

@app.get("/schedules/slots", tags=["Appointments"])
def get_available_slots(date: date, doctor_username: str, db: Session = Depends(get_db)):
    """නිශ්චිත දිනයක සහ වෛද්‍යවරයෙකුගේ Booked (රතු) සහ Available (කොළ) Slots පෙන්වීම"""
    # 🚨 FIX: මුලින්ම User වගුවෙන් වෛද්‍යවරයාව සොයාගෙන, ඔහුගේ ID එක හරහා Schedule එක සෙවීම
    doctor = db.query(models.User).filter(models.User.username == doctor_username).first()
    schedule = db.query(models.DoctorSchedule).filter(
        models.DoctorSchedule.doctor_id == doctor.id, 
        models.DoctorSchedule.date == date
    ).first()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="මෙම දිනය සඳහා කාලසටහනක් නොමැත.")
        
    booked_appointments = db.query(models.Appointment).filter(
        models.Appointment.doctor_name == doctor_username,
        models.Appointment.date == date,
        models.Appointment.status != "Cancelled" 
    ).all()
    
    booked_slots = [apt.slot_number for apt in booked_appointments]
    all_slots = list(range(1, schedule.max_patients + 1))
    
    return {
        "max_patients": schedule.max_patients,
        "booked_slots": booked_slots,
        "available_slots": [s for s in all_slots if s not in booked_slots]
    }


@app.post("/appointments/", response_model=schemas.AppointmentResponse, tags=["Appointments"])
def book_appointment(appointment: schemas.AppointmentCreate, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    today = datetime.utcnow().date()
    # 1. Past Date Booking Block කිරීම
    if appointment.date < today:
        raise HTTPException(status_code=400, detail="පසුගිය දින සඳහා හමුවීම් වෙන් කළ නොහැක!")

    doctor = db.query(models.User).filter(models.User.username == appointment.doctor_name).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="මෙම නමින් වෛද්‍යවරයෙකු පද්ධතියේ නොමැත.")
        
    schedule = db.query(models.DoctorSchedule).filter(
        models.DoctorSchedule.doctor_id == doctor.id, 
        models.DoctorSchedule.date == appointment.date
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="මෙම දිනයට අදාළ වෛද්‍යවරයාගේ කාලසටහනක් නොමැත!")
    if appointment.slot_number < 1 or appointment.slot_number > schedule.max_patients:
        raise HTTPException(status_code=400, detail=f"කරුණාකර 1 සහ {schedule.max_patients} අතර අංකයක් තෝරන්න.")
        
    # Cancel වූ ඒවා නොසලකා හැරීම
    existing_booking = db.query(models.Appointment).filter(
        models.Appointment.doctor_name == appointment.doctor_name, 
        models.Appointment.date == appointment.date, 
        models.Appointment.slot_number == appointment.slot_number,
        models.Appointment.status != "Cancelled"
    ).first()
    
    if existing_booking:
        raise HTTPException(status_code=400, detail="Sorry, this slot number was just booked by someone else")
        
    apt_num = f"APT-2026-{random.randint(1000, 9999)}"
    new_apt = models.Appointment(
        appointment_number=apt_num, 
        patient_id=current_user.id, 
        doctor_name=appointment.doctor_name, 
        date=appointment.date, 
        slot_number=appointment.slot_number, 
        status="Confirmed"
    )
    db.add(new_apt)
    db.commit()
    db.refresh(new_apt)

    # 2. Booking Notification Trigger
    notif_msg = f"ඔබගේ හමුවීම සාර්ථකව වෙන් කර ඇත. අංක: {apt_num} (වෛද්‍ය {appointment.doctor_name} | {appointment.date})"
    db.add(models.Notification(patient_id=current_user.id, message=notif_msg, notification_type="APPOINTMENT_CONFIRMED", reference_id=new_apt.id))
    db.commit()

    client_ip = req.client.host if req else "Unknown"
    if current_user.role == "Patient":
        log_patient_action(db, current_user.id, "BOOK_APPOINTMENT", client_ip, f"Booked {apt_num} for {appointment.doctor_name}")
    return new_apt
# ---------------------------------------------------------
# DOCTOR OPERATIONS & AUTO-BILLING TRIGGERS
# ---------------------------------------------------------
@app.get("/doctors/me/dashboard", tags=["Doctor Portal", "Dashboard"])
def get_doctor_dashboard(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PDF 6.2: වෛද්‍යවරයාගේ ප්‍රධාන පාලක පුවරුව (Summary Cards & Today's Queue)"""
    if current_user.role != "Doctor":
        raise HTTPException(status_code=403, detail="Doctors only.")

    # 6.1.1 Zero-Trust Logic: මුරපදය යාවත්කාලීන කර නොමැති නම් Dashboard එකට ප්‍රවේශය අවහිර කිරීම
    if current_user.is_first_login:
        raise HTTPException(status_code=403, detail="First-time login detected. Please update your password.")

    today = datetime.utcnow().date()

    # අද දිනට අදාළ, Cancel නොවූ සියලුම හමුවීම් ලැයිස්තුව ලබා ගැනීම
    today_appointments = db.query(models.Appointment).filter(
        models.Appointment.doctor_name == current_user.username,
        models.Appointment.date == today,
        models.Appointment.status != "Cancelled"
    ).order_by(models.Appointment.slot_number.asc()).all()

    # 6.2 (A): සාරාංශ කාඩ්පත් (Summary Cards) ගණනය කිරීම
    total_patients = len(today_appointments)
    completed_count = sum(1 for apt in today_appointments if apt.status == "Completed")
    pending_count = total_patients - completed_count

    # 6.2 (B): දෛනික පෝලිම (Today's Queue) සැකසීම
    queue_list = []
    for apt in today_appointments:
        # Completed වූ රෝගීන් පෝලිමෙන් ඉවත් කර, පරීක්ෂා කිරීමට ඇති අය පමණක් පෙන්වීම
        if apt.status != "Completed":
            patient = db.query(models.Patient).filter(models.Patient.id == apt.patient_id).first()
            queue_list.append({
                "appointment_id": apt.id,
                "appointment_number": apt.appointment_number,
                "slot_number": apt.slot_number,
                "patient_name": patient.full_name if patient else "Unknown",
                "status": apt.status
            })

    # Frontend එකට අවශ්‍ය ආකෘතියට දත්ත නිකුත් කිරීම
    return {
        "summary_cards": {
            "total_patients_today": total_patients,
            "completed": completed_count,
            "pending": pending_count
        },
        "todays_queue": queue_list
    }

@app.post("/appointments/{appointment_id}/arrive", response_model=schemas.BillResponse, tags=["Doctor Operations"])
def patient_arrived_trigger(appointment_id: int, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PDF 6.3.1: රෝගියා කාමරයට පැමිණීම (Idempotent / ඩබල් ක්ලික් ආරක්ෂාව සහිතයි)"""
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment: 
        raise HTTPException(status_code=404, detail="Appointment එක සොයාගත නොහැක!")
        
    # 🚨 Idempotency Logic: බොත්තම දෙපාරක් එබුණොත් හෝ දැනටමත් පැමිණ ඇත්නම්, අලුත් බිලක් නොහදා පරණ බිලම යවයි
    existing_bill = db.query(models.Bill).filter(models.Bill.appointment_id == appointment_id).first()
    if existing_bill:
        return existing_bill 
        
    # 1. Primary Billing Trigger: රු. 2500 වෛද්‍ය ගාස්තුව සමඟ බිල සෑදීම
    bill_num = f"BILL-2026-{random.randint(1000, 9999)}"
    new_bill = models.Bill(
        bill_number=bill_num, 
        appointment_id=appointment.id, 
        patient_id=appointment.patient_id, 
        doctor_fee=2500.0, 
        lab_fee=0.0, 
        total_amount=2500.0, 
        status="PENDING"
    )
    db.add(new_bill)
    
    # 2. UX Update: රෝගියා කාමරය තුළ සිටින බව තහවුරු කිරීමට Status එක වෙනස් කිරීම
    appointment.status = "In Progress"
    
    db.commit()
    db.refresh(new_bill)

    if current_user.role == "Doctor":
        client_ip = req.client.host if req else "Unknown"
        log_doctor_action(db, current_user.id, "PATIENT_ARRIVED", client_ip, f"Triggered arrival for APT: {appointment.appointment_number}")
        
    return new_bill

LAB_TEST_PRICES = {
    "Urine Full Report (UFR)": 1200.0, "Urine Culture & ABST": 4000.0, "Serum Creatinine": 1200.0,
    "eGFR": 500.0, "Blood Urea Nitrogen (BUN)": 1500.0, "Fasting Blood Sugar (FBS)": 900.0,
    "HbA1c": 2800.0, "Serum Electrolytes (Na+, K+, Cl-)": 3500.0, "VDRL Test / HIV Screening": 2500.0, "Full Blood Count (FBC)": 1500.0
}

@app.get("/doctors/lab-test-catalog", tags=["Doctor Operations"])
def get_lab_test_catalog(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Frontend එකේ Dropdown මෙනුව සෑදීම සඳහා අනුමත පරීක්ෂණ ලැයිස්තුව ලබා දීම"""
    if current_user.role != "Doctor":
        raise HTTPException(status_code=403, detail="Doctors only.")
    
    # Dictionary එක List of Objects බවට හරවා Frontend එකට යැවීම
    catalog = [{"test_name": name, "price": price} for name, price in LAB_TEST_PRICES.items()]
    return catalog

@app.post("/appointments/{appointment_id}/send-to-lab", response_model=schemas.BillResponse, tags=["Doctor Operations"])
def send_to_lab_trigger(appointment_id: int, request: schemas.LabTestRequest, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """රසායනාගාරයට යැවීම සහ මුදල් එකතු කිරීම (Idempotent / ඩබල් ක්ලික් ආරක්ෂාව සහිතයි)"""
    if request.test_name not in LAB_TEST_PRICES:
        raise HTTPException(status_code=400, detail="මෙම රසායනාගාර පරීක්ෂණය පද්ධතියේ අනුමත කර නොමැත!")
        
    bill = db.query(models.Bill).filter(models.Bill.appointment_id == appointment_id).first()
    if not bill: 
        raise HTTPException(status_code=404, detail="පළමුව 'Patient Arrived' ඔබන්න")
    
    # 🚨 Idempotency Logic: අදාළ පරීක්ෂණය දැනටමත් පෝලිමේ (Pending) තිබේ නම්, මුදල් එකතු නොකර පවතින බිලම යවයි.
    existing_test = db.query(models.LabTest).filter(
        models.LabTest.patient_id == bill.patient_id, 
        models.LabTest.test_name == request.test_name,
        models.LabTest.status == "Pending" 
    ).first()
    
    if existing_test:
        return bill # මුදල් දෙවරක් කැපෙන්නේ නැත! (Doctor 100 පාරක් එබුවත් බිල වැඩිවෙන්නේ නෑ)
        
    # පරීක්ෂණය අලුත් එකක් නම් පමණක් මුදල් එකතු වේ
    bill.lab_fee += LAB_TEST_PRICES[request.test_name]
    bill.total_amount = bill.doctor_fee + bill.lab_fee
    
    new_lab_test = models.LabTest(patient_id=bill.patient_id, test_name=request.test_name, status="Pending", received_time=datetime.utcnow())
    db.add(new_lab_test)
    db.commit()
    db.refresh(bill)

    if current_user.role == "Doctor":
        client_ip = req.client.host if req else "Unknown"
        log_doctor_action(db, current_user.id, "SEND_TO_LAB", client_ip, f"Requested {request.test_name} for APT: {appointment_id}")
        
    return bill

def check_ddi(medicines: list):
    """Frontend එකේ Alert Box එක අඳින්න ලේසි වෙන්න Structured දත්ත යැවීම"""
    meds = set(medicines)
    if "Diclofenac" in meds and "Ibuprofen" in meds: 
        return {"rule_match": "NSAID + NSAID", "risk_level": "🔴 LETHAL / CRITICAL", "details": "අධික රුධිර වහනය සහ වකුගඩු හානිය (High risk of severe bleeding and kidney failure)."}
    if "Losartan" in meds and "Potassium Citrate" in meds: 
        return {"rule_match": "ARB + Potassium Supplement", "risk_level": "🔴 LETHAL / CRITICAL", "details": "Giving Losartan and Potassium Citrate together can put the patient at risk of Hyperkalemic Cardiac Arrest."}
    if "Tamsulosin" in meds and "Sildenafil" in meds: 
        return {"rule_match": "Alpha-blocker + PDE5 Inhibitor", "risk_level": "🔴 HIGH RISK", "details": "රුධිර පීඩනය බිංදුවට බැසීමේ අවදානම (Risk of severe hypotension)."}
    if "Ciprofloxacin" in meds and ("Calcium Carbonate" in meds or "Iron Tablets" in meds): 
        return {"rule_match": "Antibiotic + Minerals", "risk_level": "🟠 MODERATE RISK", "details": "බෙහෙත් ශරීරයට උරා නොගැනීම (Minerals prevent antibiotic absorption)."}
    if "Ibuprofen" in meds and "Prednisolone" in meds: 
        return {"rule_match": "NSAID + Corticosteroid", "risk_level": "🔴 HIGH RISK", "details": "ආමාශයේ තුවාල සෑදීමේ අවදානම (Increased risk of peptic ulcers)."}
    return None

@app.post("/appointments/{appointment_id}/prescribe", response_model=schemas.PrescriptionResponse, tags=["Doctor Operations"])
def create_prescription(appointment_id: int, prescription: schemas.PrescriptionCreate, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # 🚨 FIX 3: හිස් වට්ටෝරු යැවීම අවහිර කිරීම (Empty Validation)
    if not prescription.medicines and not prescription.doctor_note:
        raise HTTPException(status_code=400, detail="ඖෂධ හෝ වෛද්‍ය සටහනක් (Note) නොමැතිව හිස් වට්ටෝරුවක් යැවිය නොහැක!")
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment: raise HTTPException(status_code=404, detail="Appointment එක සොයාගත නොහැක!")

    med_names = [item.medicine_name for item in prescription.medicines]
    warning = check_ddi(med_names)

# 🚨 FIX: Frontend එකට UI එක අඳින්න ලේසි වෙන්න Structured JSON එකක් විදිහට Error එක යැවීම
    if warning and not prescription.override_warning:
        raise HTTPException(
            status_code=400, 
            detail={
                "error_type": "DDI_WARNING",
                "title": "HIGH RISK INTERACTION DETECTED!",
                "rule_match": warning["rule_match"],
                "risk_level": warning["risk_level"],
                "details": warning["details"],
                "action_required": "ඔබට මෙය නොසලකා හැරීමට අවශ්‍ය නම් 'override_warning': true ලෙස ලබා දෙන්න."
            }
        )

    rx_num = f"RX-2026-{random.randint(100000, 999999)}"
    new_rx = models.Prescription(
        prescription_number=rx_num, 
        appointment_id=appointment.id, 
        doctor_id=current_user.id, 
        patient_id=appointment.patient_id, 
        doctor_note=prescription.doctor_note, 
        is_overridden=prescription.override_warning
    )
    db.add(new_rx)
    db.commit()
    db.refresh(new_rx)

    # අලුත් ඖෂධ දත්ත 10 ම අඩංගු කර ඇත (Section 2.1)
    for item in prescription.medicines:
        db.add(models.PrescriptionItem(
            prescription_id=new_rx.id, 
            medicine_name=item.medicine_name, 
            generic_name=item.generic_name,
            strength=item.strength,
            route=item.route,
            dose=item.dose, 
            frequency=item.frequency, 
            duration=item.duration, 
            quantity=item.quantity,
            before_after_meals=item.before_after_meals,
            instructions=item.instructions
        ))
    db.commit()
    db.refresh(new_rx)

    if current_user.role == "Doctor":
        client_ip = req.client.host if req else "Unknown"
 # 6.5 Blockchain Hashing Logic & Legal Proof
          
    if current_user.role == "Doctor":
        client_ip = req.client.host if req else "Unknown"
        
        if prescription.override_warning:
            # 1. දත්ත එකතු කර SHA-256 Hash එකක් ජනනය කිරීම
            blockchain_data = f"Doctor_{current_user.id}|Patient_{appointment.patient_id}|OVERRIDE_DDI|{rx_num}|{datetime.utcnow().isoformat()}"
            generated_hash = hashlib.sha256(blockchain_data.encode()).hexdigest()
            
            # 2. 🚨 FIX: ජනනය කළ Hash එක ඇත්තටම Sepolia Blockchain ජාලයට යැවීම
            blockchain_tx_id = push_hash_to_sepolia(generated_hash)
            
            # 3. Blockchain එකෙන් ලැබුණු TxID එකත් එක්කම අපේ Database එකේ Audit Log එක සේව් කිරීම
            log_details = f"DDI Bypassed. Internal Hash: {generated_hash} | Blockchain TxID: {blockchain_tx_id}"
            log_doctor_action(db, current_user.id, "WARNING_OVERRIDDEN_BLOCKCHAIN", client_ip, log_details)
        else:
            log_doctor_action(db, current_user.id, "PRESCRIBED", client_ip, f"Issued E-Prescription: {rx_num}")    
        
    notif = models.Notification(
        patient_id=appointment.patient_id, 
        message=f"ඔන්න ඔයාගේ Prescription එක Ready. (වෛද්‍ය {current_user.username} විසින්)", 
        notification_type="PRESCRIPTION", 
        reference_id=new_rx.id
    )
    db.add(notif)
    db.commit()
    
    return new_rx

@app.put("/appointments/{appointment_id}/complete", tags=["Doctor Operations"])
def complete_appointment(appointment_id: int, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """වෛද්‍යවරයා විසින් රෝගියාගේ පරීක්ෂාව අවසන් කර පෝලිමෙන් ඉවත් කිරීම"""
    if current_user.role != "Doctor":
        raise HTTPException(status_code=403, detail="Doctors only.")
        
    appointment = db.query(models.Appointment).filter(
        models.Appointment.id == appointment_id, 
        models.Appointment.doctor_name == current_user.username
    ).first()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment එක සොයාගත නොහැක.")
        
    # --- 🚨 අලුතින් එක් කළ දැඩි මුල්‍ය ආරක්ෂක නීතිය (Strict Billing Enforcement) ---
    if appointment.status == "Confirmed":
        raise HTTPException(status_code=400, detail="පළමුව 'Patient Arrived' බොත්තම ඔබා රෝගියාගේ බිල සකස් කරන්න! (Cannot complete without arriving)")
        
    if appointment.status == "Completed":
        raise HTTPException(status_code=400, detail="මෙය දැනටමත් අවසන් කර ඇත.")
        
    appointment.status = "Completed"
    appointment.completed_at = datetime.utcnow() 
    db.commit()
    
    client_ip = req.client.host if req else "Unknown"
    log_doctor_action(db, current_user.id, "COMPLETED_APPOINTMENT", client_ip, f"Completed APT: {appointment.appointment_number}")
    return {"message": "රෝගියාගේ පරීක්ෂාව සාර්ථකව අවසන් කරන ලදී.", "completed_at": appointment.completed_at}

@app.get("/patients/{patient_id}/history", tags=["Doctor Operations"])
def get_patient_medical_history(patient_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """වෛද්‍යවරයාට රෝගියාගේ අතීත බෙහෙත් සහ රසායනාගාර වාර්තා බැලීම (Blind Postman Architecture)"""
    if current_user.role != "Doctor":
        raise HTTPException(status_code=403, detail="Doctors only.")
        
    # අලුත් නිවැරදි කිරීම: 'No Show' ඒවත් Timeline එකට එකතු කිරීම
    past_appointments = db.query(models.Appointment).filter(
        models.Appointment.patient_id == patient_id,
        models.Appointment.status.in_(["Completed", "No Show"])
    ).order_by(models.Appointment.date.desc()).all()
    
    timeline = []
    for apt in past_appointments:
        prescriptions = db.query(models.Prescription).filter(models.Prescription.appointment_id == apt.id).all()
        apt_date_start = datetime.combine(apt.date, time.min)
        apt_date_end = datetime.combine(apt.date, time.max)
        
        lab_tests_raw = db.query(models.LabTest).filter(
            models.LabTest.patient_id == patient_id,
            models.LabTest.received_time >= apt_date_start,
            models.LabTest.received_time <= apt_date_end
        ).all()
        
        # Zero-Visibility Logic (Blind Postman): Doctor ට .png එකේ Hash එකවත් යවන්නේ නෑ
        secure_lab_tests = []
        for test in lab_tests_raw:
            secure_lab_tests.append({
                "test_id": test.id,
                "test_name": test.test_name,
                "status": test.status,
                "ordered_time": test.received_time
            })
            
        timeline.append({
            "date": apt.date, 
            "status": apt.status,
            "booked_time": apt.slot_number, # Frontend එකට වෙලාව හදාගන්න
            "completed_at": apt.completed_at if apt.status == "Completed" else None,
            "doctor_name": apt.doctor_name, 
            "prescriptions": prescriptions, 
            "lab_tests": secure_lab_tests
        })
    return timeline
# ---------------------------------------------------------
# MY HEALTH VAULT: REPORTS, E-PRESCRIPTIONS & PUBLIC VERIFICATION
# ---------------------------------------------------------

@app.get("/patients/me/reports", tags=["Patients", "My Health Vault"])
def get_my_health_vault_reports(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """රෝගියාට තම My Health Vault හරහා රසායනාගාර වාර්තා ලැයිස්තුව බලාගැනීම"""
    if current_user.role != "Patient": 
        raise HTTPException(status_code=403, detail="Patients only.")
        
    # වෙනස 1: Completed සහ Pending දෙවර්ගයම පෙන්වීම (UX එක සඳහා)
    reports = db.query(models.LabTest).filter(
        models.LabTest.patient_id == current_user.id
    ).order_by(models.LabTest.received_time.desc()).all()
    
    return reports

@app.get("/patients/me/prescriptions", tags=["Patients", "My Health Vault"])
def get_my_prescriptions(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """රෝගියාට තම My Health Vault හරහා E-Prescriptions බලාගැනීම (UI එකට 100% ගැලපෙන පරිදි)"""
    if current_user.role != "Patient":
        raise HTTPException(status_code=403, detail="Patients only.")
        
    prescriptions = db.query(models.Prescription).filter(
        models.Prescription.patient_id == current_user.id
    ).order_by(models.Prescription.id.desc()).all()
    
    patient_info = db.query(models.Patient).filter(models.Patient.id == current_user.id).first()
    
    result = []
    for rx in prescriptions:
        items = db.query(models.PrescriptionItem).filter(models.PrescriptionItem.prescription_id == rx.id).all()
        doctor = db.query(models.User).filter(models.User.id == rx.doctor_id).first()
        
        # 🚨 FIX 1: Frontend එකේ ෆොටෝ එකේ විදිහටම Date සහ Time ලස්සනට වෙන් කිරීම
        issue_dt = rx.created_at if rx.created_at else datetime.utcnow()
        formatted_date = issue_dt.strftime("%d %b %Y") # උදා: 21 Jul 2026
        formatted_time = issue_dt.strftime("%I:%M %p") # උදා: 09:25 AM
        
        result.append({
            "prescription_number": rx.prescription_number,
            "issue_date": formatted_date, 
            "issue_time": formatted_time,
            "verification_url": f"https://medcare.lk/verify/{rx.prescription_number}",
            "patient_details": {
                "pid": patient_info.pid,
                "name": patient_info.full_name,
                "age": patient_info.age,
                "gender": patient_info.gender
            },
            "doctor_name": doctor.full_name if doctor.full_name else doctor.username,
            "doctor_slmc": doctor.slmc_number,
            "doctor_department": doctor.specialization, # 🚨 FIX 2: අඩුවී තිබූ Department එක යැවීම
            "doctor_note": rx.doctor_note,
            "medicines": items
        })
        
    return result

@app.get("/verify/prescription/{prescription_number}", tags=["Public Verification"])
def verify_prescription_public(prescription_number: str, db: Session = Depends(get_db)):
    """බාහිර ෆාමසි සඳහා තහවුරු කිරීමේ ක්‍රියාවලිය (Public, No Auth Required)"""
    rx = db.query(models.Prescription).filter(models.Prescription.prescription_number == prescription_number).first()
    
    if not rx:
        raise HTTPException(status_code=404, detail="ව්‍යාජ හෝ සොයාගත නොහැකි වට්ටෝරුවකි (Invalid Prescription).")
        
    patient = db.query(models.Patient).filter(models.Patient.id == rx.patient_id).first()
    doctor = db.query(models.User).filter(models.User.id == rx.doctor_id).first()
    items = db.query(models.PrescriptionItem).filter(models.PrescriptionItem.prescription_id == rx.id).all()
    
    # 🚨 FIX: කලින් තිබූ ව්‍යාජ දින ගැටළුව ඉවත් කර, වට්ටෝරුව සෑදූ සැබෑ දිනය ලබා දීම
    real_issue_date = rx.created_at.date() if hasattr(rx, 'created_at') and rx.created_at else "Unknown Date"
    
    return {
        "status": "✅ Authentic Report",
        "prescription_id": rx.prescription_number,
        "issue_date": str(real_issue_date), 
        "doctor_details": {
            "name": doctor.full_name if doctor.full_name else doctor.username,
            "slmc_number": doctor.slmc_number,
            "specialization": doctor.specialization
        },
        "patient_details": {
            "pid": patient.pid,
            "name": patient.full_name,
            "age": patient.age,
            "gender": patient.gender
        },
        "medicines": items,
        "doctor_note": rx.doctor_note
    }
# ---------------------------------------------------------
# EHR & CLINICAL BLINDNESS MODULE
# ---------------------------------------------------------
@app.get("/patients/{patient_id}/profile", tags=["EHR & Clinical Blindness"])
def get_patient_profile(patient_id: int, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """ප්‍රතිකාර කවුළුවේ (View Panel) ඉහළින් පෙන්වීමට රෝගියාගේ මූලික දත්ත පමණක් ලබා දීම"""
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient: raise HTTPException(status_code=404, detail="රෝගියා සොයාගත නොහැක!")
    client_ip = req.client.host if req else "Unknown"

    if current_user.role == "Admin": 
        log_admin_action(db, current_user.id, "VIEW_PATIENT_BLIND", client_ip, f"Viewed blinded profile PID: {patient.pid}")
        return {"access_level": "RESTRICTED", "pid": patient.pid, "full_name": patient.full_name, "age": patient.age, "gender": patient.gender, "warning": "Sensitive medical records are hidden."}
    
    # Doctor ට View Panel එක සඳහා සහ Patient ට Profile එක සඳහා දත්ත යැවීම (No Medical Records Here!)
    return {
        "access_level": "BASIC_INFO", 
        "pid": patient.pid, 
        "full_name": patient.full_name, 
        "age": patient.age, 
        "gender": patient.gender, 
        "contact_number": patient.contact_number
    }
@app.get("/patients/me/reports/{test_id}/download", tags=["Patients"])
def download_secure_lab_report(test_id: int, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """රෝගියාට තමන්ගේ Lab Report එක ආරක්ෂිතව Download කිරීම (Zero-Trust)"""
    if current_user.role != "Patient":
        raise HTTPException(status_code=403, detail="Patients only.")
        
    lab_test = db.query(models.LabTest).filter(
        models.LabTest.id == test_id, 
        models.LabTest.patient_id == current_user.id
    ).first()
    
    if not lab_test:
        raise HTTPException(status_code=404, detail="Report එක සොයාගත නොහැක හෝ ඔබට ප්‍රවේශය නොමැත.")
    if lab_test.status != "Completed":
        raise HTTPException(status_code=400, detail="මෙම වාර්තාව තවමත් සූදානම් කර නොමැත.")
        
    file_matches = glob.glob(f"uploaded_reports/{test_id}_*.png")
    if not file_matches:
        raise HTTPException(status_code=404, detail="File එක Server එක තුළ සොයාගත නොහැක.")
        
    file_path = file_matches[0]
    file_name = os.path.basename(file_path)
    
    client_ip = req.client.host if req else "Unknown"
    log_patient_action(db, current_user.id, "DOWNLOAD_REPORT", client_ip, f"Downloaded Lab Report ID: {test_id}")
    
    return FileResponse(path=file_path, filename=file_name, media_type="image/png")
@app.post("/bills/{bill_id}/pay", response_model=schemas.BillResponse, tags=["Admin Operations"])
def pay_bill(bill_id: int, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PDF 5.4: මුදල් ගෙවීම තහවුරු කිරීම (Blockchain ඉවත් කර ඇත)"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admins only.")
        
    bill = db.query(models.Bill).filter(models.Bill.id == bill_id).first()
    if not bill: raise HTTPException(status_code=404, detail="බිල්පත සොයාගත නොහැක!")
    if bill.status == "PAID": raise HTTPException(status_code=400, detail="දැනටමත් මුදල් ගෙවා ඇත!")
    
    bill.status = "PAID"
    db.commit()
    db.refresh(bill)

    client_ip = req.client.host if req else "Unknown"
    
    # Blockchain ඉවත් කර සාමාන්‍ය Database ලොග් එක පමණක් තබා ඇත
    log_admin_action(db, current_user.id, "MARK_BILL_PAID", client_ip, f"Paid Bill: {bill.bill_number}")
    
    return bill

# ---------------------------------------------------------
# LAB TECH MODULE & STEGANOGRAPHY (PDF: 5.3 & Labs)
# ---------------------------------------------------------
# 🚨 FIX 1: සයිබර් ආරක්ෂණ ප්‍රමිතීන්ට අනුව Secret Key එක .env වෙත යොමු කිරීම
_env_key = os.getenv("FORENSIC_SECRET_KEY", "MedcareSuperSecretForensicKey123")
FORENSIC_SECRET_KEY = base64.urlsafe_b64encode(_env_key.encode('utf-8').ljust(32, b'0')[:32])
cipher_suite = Fernet(FORENSIC_SECRET_KEY)

@app.put("/lab-tests/{test_id}/collect", response_model=schemas.LabTestResponse, tags=["Lab Technician"])
def collect_sample(test_id: int, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "Lab Technician": raise HTTPException(status_code=403, detail="Lab Tech ට පමණි!")
    test = db.query(models.LabTest).filter(models.LabTest.id == test_id).first()
    if not test: raise HTTPException(status_code=404, detail="පරීක්ෂණය නොමැත!")
  # 🚨 FIX 2: අවසන් කළ (Completed) වාර්තා නැවත එකතු කිරීම අවහිර කිරීම 
    # (නමුත් PDF හි ඇති පරිදි Expired සහ Pending ඒවාට ඉඩ ලබා දී ඇත)
    if test.status == "Completed":
        raise HTTPException(status_code=400, detail="මෙම පරීක්ෂණය දැනටමත් අවසන් කර (Completed) ඇත.")  
    test.status = "Collected" 
# 🚨 FIX 3: ලේ සාම්පලය ගත් සැබෑ වෙලාවට received_time එක යාවත්කාලීන කිරීම 
    # (එවිට BI Dashboard එකේ TAT ගණනය කිරීම 100% ක් නිවැරදි වේ)
    test.received_time = datetime.utcnow()
    db.commit()
    db.refresh(test)
    
    client_ip = req.client.host if req else "Unknown"
    log_lab_tech_action(db, current_user.id, "SAMPLE_COLLECTED", client_ip, f"Collected sample for Test ID: {test_id}")
    return test

@app.post("/lab-tests/{test_id}/upload", tags=["Lab Technician"])
async def upload_lab_report(test_id: int, request: Request, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "Lab Technician": raise HTTPException(status_code=403, detail="Lab Tech ට පමණි!")
    lab_test = db.query(models.LabTest).filter(models.LabTest.id == test_id).first()
    if not lab_test: raise HTTPException(status_code=404, detail="මෙම රසායනාගාර පරීක්ෂණය සොයාගත නොහැක!")
    if not file.filename.endswith(".png"): raise HTTPException(status_code=400, detail="කරුණාකර .png ආකෘතිය පමණක් Upload කරන්න!")
# 🚨 FIX 1: දැනටමත් අවසන් කළ වාර්තා නැවත වෙනස් කිරීම (Overwrite) 100% ක් අවහිර කිරීම 
    if lab_test.status == "Completed":
        raise HTTPException(status_code=400, detail="මෙම පරීක්ෂණයේ වාර්තාව දැනටමත් පද්ධතියට එක් කර ඇත. එය නැවත වෙනස් කළ නොහැක!")
    now = datetime.utcnow()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    ip_address = request.client.host 
    handler_id = f"L-{current_user.id}" 

    # 1. Steganography Payload
    plain_text_data = f"Handler ID: {handler_id} | IP: {ip_address} | Date: {date_str} | Time: {time_str}"
    encrypted_data = cipher_suite.encrypt(plain_text_data.encode('utf-8')).decode('utf-8')

# 🚨 FIX 2: Race Conditions වැළැක්වීමට තාවකාලික ෆයිල් නාමයට අද්විතීය ID එකක් (Test ID) එක් කිරීම
    temp_path = f"uploaded_reports/temp_{lab_test.id}_{file.filename}"
    # ෆෝල්ඩරය නොමැති නම් සෑදීම
    os.makedirs("uploaded_reports", exist_ok=True)
    with open(temp_path, "wb") as buffer:
        buffer.write(await file.read())

    final_path = f"uploaded_reports/{lab_test.id}_{file.filename}"
# 🚨 FIX 2: Corrupted ෆයිල් ආවොත් Server එක Crash නොවී Frontend එකට ලස්සන Error එකක් යැවීම
    try:
        secret_image = lsb.hide(temp_path, encrypted_data)
        secret_image.save(final_path)
        os.remove(temp_path)
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=400, detail="ඔබ Upload කළ Image File එක දෝෂ සහිතයි. කරුණාකර නිවැරදි .png රූපයක් පමණක් ලබා දෙන්න.")

    # 2. SHA-256 Hashing Process (රෝගියාගේ Verification Tool එකට අවශ්‍ය දත්තය)
    with open(final_path, "rb") as f:
        file_bytes = f.read()
        generated_hash = hashlib.sha256(file_bytes).hexdigest()
    
    lab_test.file_hash = generated_hash 
    lab_test.status = "Completed"
    lab_test.completed_time = now
    db.commit()
    db.refresh(lab_test)

    log_lab_tech_action(db, current_user.id, "REPORT_UPLOADED", ip_address, f"Uploaded report for Test ID: {test_id} (Hash: {generated_hash})")
    
    # --- LAB REPORT NOTIFICATION TRIGGER ---
    notif = models.Notification(
        patient_id=lab_test.patient_id, 
        message="ඔන්න ඔයාගේ Lab Report එක Inbox එකට ආවා.", 
        notification_type="LAB_REPORT", 
        reference_id=lab_test.id
    )
    db.add(notif)
    db.commit()
    return {"message": "වාර්තාව සාර්ථකව සහ ආරක්ෂිතව Upload කරන ලදී!", "hash": generated_hash}

# ---------------------------------------------------------
# FORENSICS & VERIFICATION TOOLS
# ---------------------------------------------------------
@app.post("/patients/verify-report", tags=["Patients"])
async def verify_lab_report(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".png"): raise HTTPException(status_code=400, detail="කරුණාකර .png ආකෘතිය පමණක් Upload කරන්න!")
    
    file_bytes = await file.read()
    uploaded_hash = hashlib.sha256(file_bytes).hexdigest()
    
    test_record = db.query(models.LabTest).filter(models.LabTest.file_hash == uploaded_hash).first()
    
    if test_record:
        return {"status": "AUTHENTIC", "message": "මෙය Medcare රෝහලෙන් නිකුත් කළ මුල් සහ සැබෑ වාර්තාවයි."}
    else:
        return {"status": "ALTERED", "message": "WARNING: This report has been altered! (ව්‍යාජ වාර්තාවකි)"}

@app.post("/admin/forensics/decrypt", tags=["Admin Operations", "Digital Forensics"])
async def decrypt_leaked_report(req: Request, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_admin)):
    """PDF 5.5: Digital Forensics - Leak වූ වාර්තාවක දත්ත වෙන් කර බැලීම (Structured Output)"""
    if not file.filename.endswith(".png"): raise HTTPException(status_code=400, detail="Only .png files are supported!")
    os.makedirs("uploaded_reports", exist_ok=True)
    temp_path = f"uploaded_reports/leak_check_{file.filename}"
    with open(temp_path, "wb") as buffer: buffer.write(await file.read())

    try:
        hidden_encrypted_data = lsb.reveal(temp_path)
        if not hidden_encrypted_data:
            os.remove(temp_path)
            return {"status": "CLEAN", "message": "කිසිදු රහස්‍ය දත්තයක් මෙම රූපයේ හමුවූයේ නැත."}
            
        decrypted_data = cipher_suite.decrypt(hidden_encrypted_data.encode('utf-8')).decode('utf-8')
        os.remove(temp_path)
        
        # 🚨 FIX: "Handler ID: L-2050 | IP: 192.168.x.x | Date:..." අකුරු ගොඩ කඩා JSON කිරීම
        parts = [p.strip() for p in decrypted_data.split('|')]
        forensic_result = {}
        for part in parts:
            if ":" in part:
                key, val = part.split(":", 1)
                forensic_result[key.strip()] = val.strip()
                
        # Handler Name එක Database එකෙන් සෙවීම
        handler_id = forensic_result.get("Handler ID", "").replace("L-", "")
        handler_name = "Unknown"
        if handler_id.isdigit():
            tech = db.query(models.User).filter(models.User.id == int(handler_id)).first()
            if tech: handler_name = tech.username
            
        client_ip = req.client.host if 'req' in locals() else "Unknown"
        log_admin_action(db, current_user.id, "FORENSICS_DECRYPT", client_ip, f"Analyzed file: {file.filename}")

        return {
            "status": "🔴 LEAK SOURCE IDENTIFIED",
            "file_analyzed": file.filename,
            "source_ip": forensic_result.get("IP", "Unknown"),
            "timestamp": f"{forensic_result.get('Date', '')} | {forensic_result.get('Time', '')}",
            "handler_id": forensic_result.get("Handler ID", "Unknown"),
            "handler_name": handler_name
        }
    except Exception as e:
        if os.path.exists(temp_path): os.remove(temp_path)
        raise HTTPException(status_code=400, detail="File corrupted or altered (Decryption failed).")

# ---------------------------------------------------------
# MFA SETUP & MANAGEMENT (Google Authenticator & Email)
# ---------------------------------------------------------

@app.post("/auth/mfa/setup-app", response_model=schemas.MFASetupResponse, tags=["Security & MFA"])
def setup_google_authenticator(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """QR Code එක ස්කෑන් කිරීමට අවශ්‍ය Secret සහ URI ලබා දීම"""
    
    if current_user.mfa_app_enabled:
        raise HTTPException(status_code=400, detail="ඔබ දැනටමත් Google Authenticator සක්‍රීය කර ඇත.")

    # අලුත් රහස්‍ය කේතයක් ජනනය කිරීම
    totp_secret = pyotp.random_base32()
    
    # QR Code එක සෑදීමට අවශ්‍ය URI එක ජනනය කිරීම
    qr_uri = pyotp.totp.TOTP(totp_secret).provisioning_uri(
        name=current_user.email,
        issuer_name="Project Medcare"
    )
    
    # රහස්‍ය කේතය තාවකාලිකව Database එකේ සේව් කිරීම (Verify කරනතුරු)
    current_user.mfa_secret = totp_secret
    db.commit()

    return {"secret": totp_secret, "qr_uri": qr_uri}


@app.post("/auth/mfa/verify-app", tags=["Security & MFA"])
def verify_and_enable_google_authenticator(request: schemas.MFAVerifyRequest, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """App එකෙන් එන ඉලක්කම් 6ක කේතය පරීක්ෂා කර MFA සක්‍රීය කිරීම"""
    
    if not current_user.mfa_secret:
        raise HTTPException(status_code=400, detail="පළමුව Setup ක්‍රියාවලිය ආරම්භ කරන්න (QR Code එක ලබාගන්න).")
        
    totp = pyotp.TOTP(current_user.mfa_secret)
    
    if not totp.verify(request.app_code):
        raise HTTPException(status_code=400, detail="ඔබ ඇතුළත් කළ කේතය වැරදියි. කරුණාකර නැවත උත්සාහ කරන්න.")
        
    current_user.mfa_app_enabled = True
    db.commit()
    
    return {"message": "Google Authenticator සාර්ථකව සක්‍රීය කරන ලදී!"}

# ---------------------------------------------------------
# ACTIVE SESSIONS & REMOTE WIPING (Zero-Trust)
# ---------------------------------------------------------
@app.post("/auth/logout", tags=["Security & Sessions", "Authentication"])
def logout(req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PDF 4.2: පද්ධතියෙන් සාමාන්‍ය ලෙස ලොග් අවුට් වීම (Server-side Session Kill)"""
    auth_header = req.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=400, detail="Token එක සොයාගත නොහැක.")
        
    current_token = auth_header.split(" ")[1]
    
    # Database එකේ අදාළ Session එක is_active = False කිරීම (මකා දැමීම)
    active_session = db.query(models.UserSession).filter(
        models.UserSession.session_token == current_token,
        models.UserSession.user_id == current_user.id
    ).first()
    
    if active_session:
        active_session.is_active = False
        db.commit()
        
    client_ip = req.client.host if req else "Unknown"
    
    # Audit Log එකට ලොග් අවුට් වූ බව ලිවීම
    if current_user.role == "Patient": log_patient_action(db, current_user.id, "LOGOUT", client_ip, "Successfully logged out")
    elif current_user.role == "Admin": log_admin_action(db, current_user.id, "LOGOUT", client_ip, "Successfully logged out")
    elif current_user.role == "Doctor": log_doctor_action(db, current_user.id, "LOGOUT", client_ip, "Successfully logged out")
    elif current_user.role == "Lab Technician": log_lab_tech_action(db, current_user.id, "LOGOUT", client_ip, "Successfully logged out")
        
    return {"message": "ඔබ සාර්ථකව පද්ධතියෙන් ඉවත් වන ලදී (Logged out)."}
@app.get("/auth/sessions/me", response_model=List[schemas.SessionResponse], tags=["Security & Sessions"])
def get_my_active_sessions(req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """තමන් දැනට ලොග් වී ඇති සියලුම Devices සහ IP ලිපිනයන් බැලීම"""
    
    # දැනට භාවිතා කරන Token එක වෙන් කර ගැනීම
    auth_header = req.headers.get("Authorization")
    current_token = auth_header.split(" ")[1] if auth_header else ""
    
    sessions = db.query(models.UserSession).filter(
        models.UserSession.user_id == current_user.id, 
        models.UserSession.is_active == True
    ).all()
    
    response_data = []
    for s in sessions:
        s_dict = {
            "id": s.id,
            "ip_address": s.ip_address,
            "user_agent": s.user_agent,
            "created_at": s.created_at,
            "is_active": s.is_active,
            "is_current": (s.session_token == current_token) # දැනට ඉන්න තැන True කිරීම
        }
        response_data.append(s_dict)
        
    return response_data


@app.delete("/auth/sessions/revoke-others", tags=["Security & Sessions"])
def revoke_all_other_sessions(req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """අනෙකුත් සියලුම උපාංග වලින් එකවර ලොග් අවුට් වීම (Kill Switch)"""
    
    auth_header = req.headers.get("Authorization")
    current_token = auth_header.split(" ")[1] if auth_header else ""
    
    # දැනට පාවිච්චි කරන Token එක හැර අනිත් ඔක්කොම Sessions වල is_active = False කිරීම
    db.query(models.UserSession).filter(
        models.UserSession.user_id == current_user.id,
        models.UserSession.session_token != current_token,
        models.UserSession.is_active == True
    ).update({"is_active": False})
    
    db.commit()
    
    client_ip = req.client.host if req else "Unknown"
    # Action Logs වලට සටහන් කිරීම
    if current_user.role == "Patient": log_patient_action(db, current_user.id, "REMOTE_WIPE", client_ip, "Revoked all other sessions")
    elif current_user.role == "Admin": log_admin_action(db, current_user.id, "REMOTE_WIPE", client_ip, "Revoked all other sessions")
    elif current_user.role == "Doctor": log_doctor_action(db, current_user.id, "REMOTE_WIPE", client_ip, "Revoked all other sessions")
    
    return {"message": "ආරක්ෂිතයි! අනෙකුත් සියලුම උපාංග වලින් ඔබව සාර්ථකව ඉවත් කරන ලදී."}

@app.delete("/auth/sessions/{session_id}", tags=["Security & Sessions"])
def revoke_single_session(session_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PDF 4.2.1: නිශ්චිත උපාංගයකින් (Single Device) පමණක් ලොග් අවුට් වීම"""
    session = db.query(models.UserSession).filter(
        models.UserSession.id == session_id,
        models.UserSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="උපාංගය සොයාගත නොහැක.")
        
    session.is_active = False
    db.commit()
    
    return {"message": "තෝරාගත් උපාංගයෙන් සාර්ථකව ඉවත් වන ලදී."}

@app.post("/auth/mfa/toggle-email", tags=["Security & MFA"])
def toggle_email_mfa(enable: bool, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Email OTP ආරක්ෂාව සක්‍රීය හෝ අක්‍රීය කිරීම සහ ලොග් කිරීම"""
    
    current_user.mfa_email_enabled = enable
    db.commit()
    
    status_msg = "සක්‍රීය" if enable else "අක්‍රීය"
    
    # 🚨 FIX: MFA වෙනස් කිරීම Audit Log එකෙහි සටහන් කිරීම
    client_ip = req.client.host if req else "Unknown"
    action_type = "MFA_ENABLED" if enable else "MFA_DISABLED"
    
    if current_user.role == "Admin": log_admin_action(db, current_user.id, action_type, client_ip, f"Email OTP MFA {status_msg}")
    elif current_user.role == "Doctor": log_doctor_action(db, current_user.id, action_type, client_ip, f"Email OTP MFA {status_msg}")
    elif current_user.role == "Lab Technician": log_lab_tech_action(db, current_user.id, action_type, client_ip, f"Email OTP MFA {status_msg}")
    elif current_user.role == "Patient": log_patient_action(db, current_user.id, action_type, client_ip, f"Email OTP MFA {status_msg}")
    
    return {"message": f"Email OTP ආරක්ෂාව සාර්ථකව {status_msg} කරන ලදී!"}
# =========================================================
# ADMIN PROFILE & SECURITY MANAGEMENT (PDF: 5.6)
# =========================================================

@app.put("/admin/me/username", tags=["Admin Operations", "Security & Privacy"])
def change_admin_username(request: schemas.UsernameChangeRequest, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_admin)):
    """PDF 5.6.1: Admin ගේ පරිශීලක නාමය (Username) වෙනස් කිරීම (මුරපදය අනිවාර්යයි)"""
    
    # 1. Security Check (දැනට පවතින මුරපදය නිවැරදිදැයි බැලීම)
    if not hashing.Hash.verify(current_user.hashed_password, request.current_password):
        raise HTTPException(status_code=400, detail="ඔබ ඇතුළත් කළ දැනට පවතින මුරපදය වැරදියි (Access Denied).")
        
    # 2. අලුත් නම දැනටමත් පද්ධතියේ ඇත්දැයි බැලීම
    existing_user = db.query(models.User).filter(models.User.username == request.new_username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="මෙම පරිශීලක නාමය දැනටමත් භාවිතා වේ. කරුණාකර වෙනත් නමක් ලබා දෙන්න.")
        
    old_username = current_user.username
    current_user.username = request.new_username
    db.commit()
    
    client_ip = req.client.host if req else "Unknown"
    log_admin_action(db, current_user.id, "USERNAME_CHANGED", client_ip, f"Username changed from {old_username} to {request.new_username}")
    
    return {"message": "ඔබගේ පරිශීලක නාමය සාර්ථකව යාවත්කාලීන කරන ලදී."}
# =========================================================
# PATIENT SECURITY & PRIVACY CENTER (MISSING ENDPOINTS)
# =========================================================

@app.put("/patients/me/profile/editable", tags=["Security & Privacy", "Profile Management"])
def update_editable_profile_fields(request: schemas.PatientProfileUpdate, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PDF 4.1: රෝගියාට වෙනස් කළ හැකි දත්ත යාවත්කාලීන කිරීම (Mobile, Email, Address)"""
    if current_user.role != "Patient": 
        raise HTTPException(status_code=403, detail="Patients only")
    
    patient = db.query(models.Patient).filter(models.Patient.id == current_user.id).first()
    
    # වෙනස් කළ හැකි දත්ත පමණක් යාවත්කාලීන කිරීම (NIC, Name වැනි දේවල් මෙතැනින් වෙනස් කළ නොහැක)
    if request.email: current_user.email = request.email
    if request.contact_number: patient.contact_number = request.contact_number
    if request.home_address: patient.home_address = request.home_address
    
    db.commit()
    
    client_ip = req.client.host if req else "Unknown"
    log_patient_action(db, current_user.id, "PROFILE_UPDATED", client_ip, "Updated editable profile fields")
    return {"message": "ඔබගේ දත්ත සාර්ථකව යාවත්කාලීන කරන ලදී."}

@app.put("/auth/security/change-password", tags=["Security & Privacy", "Authentication"])
def change_password_logged_in(request: schemas.PasswordChangeLoggedIn, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PDF 4.2: ලොග් වී සිටින රෝගියාට තමන්ගේ මුරපදය වෙනස් කිරීම"""
    # 1. පරණ මුරපදය නිවැරදි දැයි පරීක්ෂා කිරීම
    if not hashing.Hash.verify(current_user.hashed_password, request.current_password):
        raise HTTPException(status_code=400, detail="ඔබ ඇතුළත් කළ දැනට පවතින මුරපදය වැරදියි.")
        
    # 2. අලුත් මුරපදය යාවත්කාලීන කිරීම
    current_user.hashed_password = hashing.Hash.bcrypt(request.new_password)
    
    # 3. ලොග් වී ඇති සියලුම අනෙකුත් උපාංග වලින් ඉවත් කිරීම (Security Best Practice)
    auth_header = req.headers.get("Authorization")
    current_token = auth_header.split(" ")[1] if auth_header else ""
    db.query(models.UserSession).filter(
        models.UserSession.user_id == current_user.id,
        models.UserSession.session_token != current_token
    ).update({"is_active": False})
    
    db.commit()
    
    client_ip = req.client.host if req else "Unknown"
    if current_user.role == "Patient":
        log_patient_action(db, current_user.id, "PASSWORD_CHANGED", client_ip, "Changed account password")
        
    return {"message": "මුරපදය සාර්ථකව වෙනස් කරන ලදී. ආරක්ෂිත පියවරක් ලෙස අනෙකුත් උපාංග වලින් ඔබව ඉවත් කරන ලදී."}

@app.get("/patients/me/activity-logs", tags=["Security & Privacy", "Activity Logs"])
def get_my_activity_logs(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PDF 4.3: රෝගියාගේ සියලුම ක්‍රියාකාරකම් (Audit Trail) කාලානුක්‍රමිකව බලාගැනීම (Read-only)"""
    if current_user.role != "Patient": 
        raise HTTPException(status_code=403, detail="Patients only.")
    
    # රෝගියාගේ සියලු ක්‍රියාකාරකම් අලුත්ම එකේ සිට පරණ එකට පෙළගස්වා යැවීම
    logs = db.query(models.PatientActivityLog).filter(
        models.PatientActivityLog.patient_id == current_user.id
    ).order_by(models.PatientActivityLog.timestamp.desc()).limit(100).all()
    
    return logs
# ---------------------------------------------------------
# NOTIFICATIONS (Patient Portal)
# ---------------------------------------------------------
@app.get("/patients/me/notifications", response_model=List[schemas.NotificationResponse], tags=["Notifications"])
def get_my_notifications(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "Patient":
        raise HTTPException(status_code=403, detail="Patients only.")
    return db.query(models.Notification).filter(models.Notification.patient_id == current_user.id).order_by(models.Notification.created_at.desc()).all()

@app.put("/notifications/{notification_id}/read", tags=["Notifications"])
def mark_notification_read(notification_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    notif = db.query(models.Notification).filter(models.Notification.id == notification_id, models.Notification.patient_id == current_user.id).first()
    if not notif: raise HTTPException(status_code=404, detail="Notification not found.")
    notif.is_read = True
    db.commit()
    return {"message": "Marked as read."}
# ---------------------------------------------------------
# AI TRIAGE & APPOINTMENTS (Arabella & Patient Views)
# ---------------------------------------------------------
# ---------------------------------------------------------
# UPCOMING & HISTORY APPOINTMENTS
# ---------------------------------------------------------
@app.get("/appointments/me/upcoming", tags=["Appointments"])
def get_upcoming_appointments(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Upcoming Appointments (Confirmed AND Future/Today dates only)"""
    if current_user.role != "Patient": raise HTTPException(status_code=403, detail="Patients only.")
    today = datetime.utcnow().date()
    
    # වෙනස: "In Progress" (කාමරය තුළ සිටින අවස්ථාවද) ඇතුළත් කිරීම
    appointments = db.query(models.Appointment).filter(
        models.Appointment.patient_id == current_user.id,
        models.Appointment.status.in_(["Confirmed", "In Progress"]),
        models.Appointment.date >= today
    ).order_by(models.Appointment.date.asc()).all()
    
    res = [{"appointment_id": a.id, "reference_number": a.appointment_number, "doctor_name": a.doctor_name, "date": str(a.date), "slot_number": a.slot_number, "status": a.status} for a in appointments]
    return {"total_appointments": len(res), "appointments": res}

@app.get("/appointments/me/history", tags=["Appointments"])
def get_appointment_history(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """History (Completed, Cancelled, No Show, OR Past Confirmed)"""
    if current_user.role != "Patient": raise HTTPException(status_code=403, detail="Patients only.")
    today = datetime.utcnow().date()
    
    appointments = db.query(models.Appointment).filter(
        models.Appointment.patient_id == current_user.id,
        (models.Appointment.status.in_(["Completed", "Cancelled", "No Show"])) | 
        ((models.Appointment.status == "Confirmed") & (models.Appointment.date < today))
    ).order_by(models.Appointment.date.desc()).all()
    
    # වෙනස: completed_time එක Frontend එකට යැවීම සඳහා අලුතින් එකතු කරන ලදී
    res = [{
        "appointment_id": a.id, 
        "reference_number": a.appointment_number, 
        "doctor_name": a.doctor_name, 
        "date": str(a.date), 
        "slot_number": a.slot_number, 
        "status": a.status,
        "completed_time": str(a.completed_at) if a.completed_at else None
    } for a in appointments]
    
    return {"total_appointments": len(res), "appointments": res}

@app.put("/appointments/{appointment_id}/cancel", tags=["Appointments"])
def cancel_appointment(appointment_id: int, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "Patient": raise HTTPException(status_code=403, detail="Patients only.")
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment: raise HTTPException(status_code=404, detail="Appointment not found.")
    if appointment.patient_id != current_user.id: raise HTTPException(status_code=403, detail="Unauthorized.")
    if appointment.status == "Cancelled": raise HTTPException(status_code=400, detail="Already cancelled.")
# 🚨 FIX: "Smart Patient Loophole" වසා දැමීම!
    # දැනටමත් ආරම්භ කළ (In Progress) හෝ අවසන් කළ (Completed/No Show) ඒවා Cancel කිරීම 100% ක් අවහිර කිරීම.
    if appointment.status != "Confirmed":
        raise HTTPException(
            status_code=400, 
            detail="මෙම හමුවීම දැනටමත් කාමරය තුළ ආරම්භ කර හෝ අවසන් කර ඇති බැවින්, මෙය දැන් App එක හරහා අවලංගු කළ නොහැක!"
        )
    
    appointment.status = "Cancelled"
    
    # --- අලුතින් දැමූ Cancellation Notification Trigger ---
    notif_msg = f"අංක {appointment.appointment_number} දරන ඔබගේ හමුවීම අවලංගු කර ඇත."
    db.add(models.Notification(patient_id=current_user.id, message=notif_msg, notification_type="APPOINTMENT_CANCELLED", reference_id=appointment.id))
    
    db.commit()
    db.refresh(appointment)
    
    client_ip = req.client.host if req else "Unknown"
    log_patient_action(db, current_user.id, "CANCEL_APPOINTMENT", client_ip, f"Cancelled {appointment.appointment_number}")
    return {"message": "Appointment cancelled.", "reference_number": appointment.appointment_number}



# ---------------------------------------------------------
# AI TRIAGE (Arabella 2.0 with Date Logic & Slot Fix)
# ---------------------------------------------------------
ARABELLA_SYSTEM_PROMPT = """
You are Arabella, the strict, professional medical AI assistant for Project Medcare.
Current System Date: {CURRENT_DATE}

STRICT RULES:
1. SCOPE: Answer queries regarding renal health & appointments. Reject off-topic queries.
2. NO PRESCRIPTIONS: DO NOT prescribe medicine or diagnose.
3. EMERGENCY: If symptoms are severe (bleeding, chest pain), advise calling 1990 immediately.

LIVE DOCTOR SCHEDULES (Only future/today's schedules are shown):
{AVAILABLE_DOCTORS}

ROUTING LOGIC:
- Nephrology (CKD, High BP) | Urology (Stones, Hematuria) | Dialysis Unit | Transplant Unit
- High Severity -> Senior Consultant. Low Severity -> Medical Officer.
- Suggest alternative dates/doctors if requested slots are full.

BOOKING PROTOCOL (2 STEPS):
STEP 1: Propose the doctor and date, then explicitly ASK: "මම මේ වෙලාව ඔයා වෙනුවෙන් Book කරන්නද? (Yes/No)". Never include ACTION tag.
STEP 2: IF the user explicitly says Yes, append this exact tag at the end:
[ACTION: BOOK, DOCTOR: Exact Doctor Name, DATE: YYYY-MM-DD]
"""

@app.post("/chat", response_model=schemas.ChatResponse, tags=["Chatbot"])
async def chat_with_arabella(request: schemas.ChatRequest, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "Patient": raise HTTPException(status_code=403, detail="Patients only.")
    
    chat_session = db.query(models.ChatSession).filter(models.ChatSession.patient_id == current_user.id, models.ChatSession.is_active == True).first()
    if not chat_session:
        chat_session = models.ChatSession(patient_id=current_user.id, session_token=str(uuid.uuid4()))
        db.add(chat_session)
        db.commit()
    
    db.add(models.ChatMessage(session_id=chat_session.id, sender="user", message=request.message))
    db.commit()

    today = datetime.utcnow().date()
    # Past Schedules AI එකට යැවීම වැළැක්වීම (Future Only)
    schedules = db.query(models.DoctorSchedule).filter(models.DoctorSchedule.date >= today).all() 
    
    doc_list = []
    for sch in schedules:
        doc_name = sch.doctor.username if sch.doctor else "Unknown"
        booked_count = db.query(models.Appointment).filter(models.Appointment.doctor_name == doc_name, models.Appointment.date == sch.date, models.Appointment.status != "Cancelled").count()
        if sch.max_patients - booked_count > 0: 
            doc_list.append(f"- {doc_name} | Date: {sch.date} | Available Slots: {sch.max_patients - booked_count}")
            
    dynamic_docs = "\n".join(doc_list) if doc_list else "No doctors available in the future."
    final_prompt = ARABELLA_SYSTEM_PROMPT.replace("{AVAILABLE_DOCTORS}", dynamic_docs).replace("{CURRENT_DATE}", str(today))

    past_msgs = db.query(models.ChatMessage).filter(models.ChatMessage.session_id == chat_session.id).order_by(models.ChatMessage.timestamp.asc()).limit(10).all()
    messages_for_ai = [{"role": "system", "content": final_prompt}]
    for msg in past_msgs: messages_for_ai.append({"role": "user" if msg.sender == "user" else "assistant", "content": msg.message})

    try:
        # OpenRouter (NVIDIA Nemotron) API Configuration
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.environ.get("OPENROUTER_API_KEY")
        )

        # Messages සැකසීම (OpenAI හි සම්මත ක්‍රමය)
        messages_for_ai = [{"role": "system", "content": final_prompt}]
        for msg in past_msgs:
            role = "user" if msg.sender == "user" else "assistant"
            messages_for_ai.append({"role": role, "content": msg.message})
        
        # රෝගියාගේ අලුත්ම පණිවිඩය එකතු කිරීම
        messages_for_ai.append({"role": "user", "content": request.message})

        # Get AI Response via NVIDIA Nemotron
        response = client.chat.completions.create(
            model="meta-llama/llama-3.3-70b-instruct",
            messages=messages_for_ai,
        )
        arabella_response = response.choices[0].message.content

        # Extract Booking Trigger
        booking_match = re.search(r'\[ACTION:\s*BOOK,\s*DOCTOR:\s*(.*?),\s*DATE:\s*(.*?)\]', arabella_response, re.IGNORECASE)
        
        if booking_match:
            doc_name = booking_match.group(1).strip()
            target_date_str = booking_match.group(2).strip()
            arabella_response = re.sub(r'\[ACTION:\s*BOOK,\s*DOCTOR:\s*(.*?),\s*DATE:\s*(.*?)\]', '', arabella_response, flags=re.IGNORECASE).strip()
            
            try: target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
            except ValueError: target_date = today # AI වැරදි Format එකක් දුන්නොත් අද දිනය ගනී

            doc_user = db.query(models.User).filter(models.User.username.ilike(f"%{doc_name}%")).first()
            if doc_user:
                sch = db.query(models.DoctorSchedule).filter(models.DoctorSchedule.doctor_id == doc_user.id, models.DoctorSchedule.date == target_date).first()
                if sch:
                    # Cancel වූ අංක හැර, Available වූ පළමු අංකය සෙවීම
                    booked_slots = [a.slot_number for a in db.query(models.Appointment).filter(
                        models.Appointment.doctor_name == doc_user.username, 
                        models.Appointment.date == sch.date, 
                        models.Appointment.status != "Cancelled"
                    ).all()]
                    all_slots = list(range(1, sch.max_patients + 1))
                    available_slots = [s for s in all_slots if s not in booked_slots]
                    
                    if not available_slots:
                        arabella_response += f"\n\n⚠️ **Notice:** සමාවෙන්න, {doc_user.username} ගේ {sch.date} දිනට ඇති සියලුම වේලාවන් පිරී ඇත."
                    else:
                        next_slot = available_slots[0] 
                        apt_num = f"APT-2026-{random.randint(1000, 9999)}"
                        new_apt = models.Appointment(
                            appointment_number=apt_num, 
                            patient_id=current_user.id, 
                            doctor_name=doc_user.username, 
                            date=sch.date, 
                            slot_number=next_slot, 
                            status="Confirmed"
                        )
                        db.add(new_apt)
                        db.commit()
                        
                        arabella_response += f"\n\n✅ **Booked!** Ref: **{apt_num}** | Doctor: **{doc_user.username}** | Date: **{sch.date}** | Slot: **{next_slot}**"
                        client_ip = req.client.host if req else "Unknown"
                        log_patient_action(db, current_user.id, "AI_BOOKING", client_ip, f"Arabella booked {apt_num}")

        db.add(models.ChatMessage(session_id=chat_session.id, sender="arabella", message=arabella_response))
        db.commit()
        return {"response": arabella_response, "session_id": chat_session.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Arabella AI දෝෂයකි: {str(e)}")
# ---------------------------------------------------------
# PROFILE CHANGE REQUESTS (Zero-Trust Patient Identity)
# ---------------------------------------------------------
@app.post("/patients/me/change-requests", response_model=schemas.ProfileChangeRequestResponse, tags=["Profile Management"])
def request_profile_change(request: schemas.ProfileChangeRequestCreate, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """රෝගියා විසින් තම සංවේදී දත්ත (NIC, Name) වෙනස් කිරීමට Admin ගෙන් අවසර ඉල්ලීම"""
    if current_user.role != "Patient":
        raise HTTPException(status_code=403, detail="Patients only.")
        
    new_request = models.ProfileChangeRequest(
        patient_id=current_user.id,
        requested_field=request.requested_field,
        new_value=request.new_value
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    
    client_ip = req.client.host if req else "Unknown"
    log_patient_action(db, current_user.id, "PROFILE_CHANGE_REQUEST", client_ip, f"Requested to change {request.requested_field}")
    
    return new_request

@app.put("/admin/change-requests/{request_id}/approve", tags=["Admin Operations"])
def approve_profile_change(request_id: int, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Admin විසින් රෝගියාගේ වෙනස් කිරීම් අනුමත කර දත්ත සමුදාය යාවත්කාලීන කිරීම"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admins only.")
        
    change_req = db.query(models.ProfileChangeRequest).filter(models.ProfileChangeRequest.id == request_id).first()
    if not change_req or change_req.status != "PENDING":
        raise HTTPException(status_code=404, detail="Request එක සොයාගත නොහැක හෝ දැනටමත් අවසන් කර ඇත.")
        
    patient = db.query(models.Patient).filter(models.Patient.id == change_req.patient_id).first()
    
    # අදාළ Field එක Update කිරීම
    if hasattr(patient, change_req.requested_field):
        setattr(patient, change_req.requested_field, change_req.new_value)
    
    change_req.status = "APPROVED"
    db.commit()
    
    client_ip = req.client.host if req else "Unknown"
    log_admin_action(db, current_user.id, "APPROVED_PROFILE_CHANGE", client_ip, f"Approved change for PID: {patient.pid}")
    
    return {"message": "දත්ත යාවත්කාලීන කිරීම අනුමත කරන ලදී."}

# ---------------------------------------------------------
# PASSWORD RECOVERY (Forgot Password Logic)
# ---------------------------------------------------------
import secrets

@app.post("/auth/forgot-password", tags=["Authentication"])
def forgot_password(request: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    """මුරපදය අමතක වූ විට Reset Link එකක් ඊමේල් කිරීම"""
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user:
        # ආරක්ෂක හේතූන් මත 'User Not Found' නොපෙන්වා සාමාන්‍ය පණිවිඩයක් යැවීම (Security best practice)
        return {"message": "මෙම ඊමේල් ලිපිනය පද්ධතියේ ඇත්නම්, ඔබට Reset Link එකක් ලැබෙනු ඇත."}
        
    reset_token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(minutes=15) # විනාඩි 15 කින් Expire වේ
    
    new_token_record = models.PasswordResetToken(
        user_id=user.id,
        token=reset_token,
        expires_at=expires
    )
    db.add(new_token_record)
    db.commit()
    
    # සැබෑ පද්ධතියකදී මෙතැනින් ඊමේල් එකක් යවනු ලැබේ
    print(f"[MOCK EMAIL] Password Reset Link: http://localhost:3000/reset-password?token={reset_token}")
    
    return {"message": "මෙම ඊමේල් ලිපිනය පද්ධතියේ ඇත්නම්, ඔබට Reset Link එකක් ලැබෙනු ඇත."}

@app.post("/auth/reset-password", tags=["Authentication"])
def reset_password(request: schemas.PasswordResetConfirm, req: Request, db: Session = Depends(get_db)):
    """නව මුරපදය තහවුරු කිරීම"""
    token_record = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == request.reset_token,
        models.PasswordResetToken.is_used == False
    ).first()
    
    if not token_record or datetime.utcnow() > token_record.expires_at:
        raise HTTPException(status_code=400, detail="Token එක වැරදියි හෝ කල් ඉකුත් වී ඇත.")
        
    user = db.query(models.User).filter(models.User.id == token_record.user_id).first()
    
    # නව මුරපදය Hash කර Save කිරීම
    user.hashed_password = hashing.Hash.bcrypt(request.new_password)
    token_record.is_used = True
    
    # අලුත් පාස්වර්ඩ් එක දැම්මට පස්සේ පරණ ලොග් වෙලා ඉන්න හැම තැනින්ම (Sessions) අයින් කිරීම
    db.query(models.UserSession).filter(
        models.UserSession.user_id == user.id,
        models.UserSession.is_active == True
    ).update({"is_active": False})
    
    db.commit()
    return {"message": "මුරපදය සාර්ථකව වෙනස් කරන ලදී. කරුණාකර නව මුරපදයෙන් ලොග් වන්න."}

# =========================================================
# LAB TECHNICIAN: VIEW 03 & 04 (LOGS, PROFILE & SECURITY)
# =========================================================

@app.get("/lab-tech/me/activity-logs", tags=["Lab Technician", "Activity Logs"])
def get_lab_tech_activity_logs(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PDF දර්ශනය 3: රසායනාගාර ශිල්පියාගේ Read-only ක්‍රියාකාරකම් වාර්තාව (Audit Trail / Immutable)"""
    if current_user.role != "Lab Technician":
        raise HTTPException(status_code=403, detail="Lab Technicians only.")
    
    logs = db.query(models.LabTechActivityLog).filter(
        models.LabTechActivityLog.tech_id == current_user.id
    ).order_by(models.LabTechActivityLog.timestamp.desc()).limit(100).all()
    
    return logs

# Frontend එකට පහසු වීමට Profile Update Schema එක මෙහිම නිර්මාණය කර ඇත
class LabTechProfileUpdate(BaseModel):
    contact_number: Optional[str] = None
    email: Optional[str] = None

@app.put("/lab-tech/me/profile/editable", tags=["Lab Technician", "Profile & Security"])
def update_lab_tech_profile(request: LabTechProfileUpdate, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PDF දර්ශනය 4 (A): Locked Identity - නම සහ Employee ID වෙනස් කළ නොහැක."""
    if current_user.role != "Lab Technician":
        raise HTTPException(status_code=403, detail="Lab Technicians only.")
    
    # 🚨 Zero-Trust: නම හෝ Emp ID වෙනස් කිරීමට කිසිදු කේතයක් මෙහි ලියා නොමැත!
    if request.contact_number: 
        current_user.contact_number = request.contact_number
    if request.email: 
        current_user.email = request.email
    
    db.commit()
    
    client_ip = req.client.host if req else "Unknown"
    log_lab_tech_action(db, current_user.id, "PROFILE_UPDATED", client_ip, "Updated editable fields (Phone/Email)")
    
    return {"message": "ඔබගේ දත්ත සාර්ථකව යාවත්කාලීන කරන ලදී."}

# =========================================================
# LAB TECHNICIAN: VIEW 05 (BI DASHBOARD & EFFICIENCY MATRIX)
# =========================================================

@app.get("/lab-tech/dashboard/analytics", tags=["Lab Technician", "Analytics"])
def get_lab_tech_bi_dashboard(period: str = "daily", db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PDF දර්ශනය 5: Lab Technician BI Dashboard (Test-Specific TAT & Lifecycle Throughput)"""
    if current_user.role != "Lab Technician":
        raise HTTPException(status_code=403, detail="Lab Technicians only.")

    now = datetime.utcnow()
    # කාල පරාසය (Filter) තේරීම: Daily, Weekly, Monthly
    if period == "weekly":
        start_date = now - timedelta(days=7)
    elif period == "monthly":
        start_date = now - timedelta(days=30)
    else: # Default is Daily (අද දවසේ මුල සිට)
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # 1. B කොටස: Request Lifecycle & Throughput 
    # අදාළ කාල පරාසයට අයත් සියලුම පරීක්ෂණ ලබා ගැනීම
    tests_in_period = db.query(models.LabTest).filter(models.LabTest.received_time >= start_date).all()
    
    total_requests = len(tests_in_period)
    completed_count = sum(1 for t in tests_in_period if t.status == "Completed")
    expired_count = sum(1 for t in tests_in_period if t.status == "Expired")
    pending_count = sum(1 for t in tests_in_period if t.status in ["Pending", "Collected"])

    # 2. A කොටස: Test-Specific Turnaround Time (TAT) Analytics
    # පරීක්ෂණ වර්ගය අනුව ගතවූ කාලය වෙන වෙනම ගණනය කිරීම
    tat_data = {}
    for test in tests_in_period:
        if test.status == "Completed" and test.completed_time and test.received_time:
            # Time_upload - Time_collect (පැය වලින්)
            time_diff = (test.completed_time - test.received_time).total_seconds() / 3600 
            
            if test.test_name not in tat_data:
                tat_data[test.test_name] = {"total_hours": 0, "count": 0}
            
            tat_data[test.test_name]["total_hours"] += time_diff
            tat_data[test.test_name]["count"] += 1
            
    # Frontend Bar Chart එක සඳහා Array එකක් ලෙස දත්ත සැකසීම
    tat_chart_data = []
    for test_name, data in tat_data.items():
        avg_tat = data["total_hours"] / data["count"]
        tat_chart_data.append({
            "test_name": test_name,
            "average_tat_hours": round(avg_tat, 2)
        })

    return {
        "filter_period": period,
        "throughput_metrics": {
            "total_requests_received": total_requests,
            "reports_uploaded": completed_count,
            "pending_uploads": pending_count,
            "expired_requests": expired_count
        },
        "test_specific_tat": tat_chart_data
    }


@app.get("/admin/explorer/daily-summary", tags=["Admin Operations", "Analytics"])
def get_daily_operations_explorer(query_date: date = None, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PDF 5.3: දෛනික මෙහෙයුම් සහ දත්ත ගවේෂකය (Today, Future Workload & Archive Explorer)"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admins only.")
        
    # දිනයක් එවා නැත්නම් අද දිනය (Today) ලෙස සලකයි
    target_date = query_date if query_date else datetime.utcnow().date()
    
    # එදිනට කාලසටහන් ඇති වෛද්‍යවරුන් ලබා ගැනීම
    schedules = db.query(models.DoctorSchedule).filter(models.DoctorSchedule.date == target_date).all()
    
    doctors_data = []
    total_day_revenue = 0.0
    total_day_patients = 0
    
    for sch in schedules:
        # අදාළ වෛද්‍යවරයාගේ එදිනට ඇති Appointments ටික ගැනීම
        doc_apts = db.query(models.Appointment).filter(
            models.Appointment.doctor_name == sch.doctor.username,
            models.Appointment.date == target_date
        ).all()
        
        booked_count = len([a for a in doc_apts if a.status != "Cancelled"])
        completed_count = len([a for a in doc_apts if a.status == "Completed"])
        no_shows = len([a for a in doc_apts if a.status == "No Show"])
        
        # බිල්පත් සහ ආදායම් (PAID ඒවා පමණක්)
        doc_revenue = 0.0
        payment_summary = []
        
        for apt in doc_apts:
            if apt.status != "Cancelled":
                patient = db.query(models.Patient).filter(models.Patient.id == apt.patient_id).first()
                
                bill = db.query(models.Bill).filter(models.Bill.appointment_id == apt.id).first()
                bill_status = bill.status if bill else "NO_BILL"
                amount = bill.total_amount if bill else 0.0
                
                if bill_status == "PAID":
                    doc_revenue += amount
                    
                # 🚨 Clinical Blindness: Drill-down කර බැලූ විට පෙන්වන දත්ත (සෞඛ්‍ය රහස් සඟවා ඇත)
                payment_summary.append({
                    "slot_number": apt.slot_number,
                    "patient_name": patient.full_name if patient else "Unknown",
                    "appointment_status": apt.status,
                    "bill_status": bill_status,
                    "amount": amount
                })
        
        total_day_revenue += doc_revenue
        total_day_patients += booked_count
        
        doctors_data.append({
            "doctor_username": sch.doctor.username,
            "total_slots": sch.max_patients,
            "booked_slots": booked_count,
            "available_slots": sch.max_patients - booked_count,
            "patients_arrived": completed_count,
            "no_shows_cancelled": no_shows,
            "total_doctor_revenue": doc_revenue,
            "patient_slots": payment_summary
        })
        
    return {
        "date": str(target_date),
        "summary": {
            "total_doctors": len(schedules),
            "total_booked_patients": total_day_patients,
            "total_revenue_collected": total_day_revenue
        },
        "doctor_details": doctors_data
    }
# =========================================================
# ADMIN BI DASHBOARD (COMMAND CENTER - PDF 5.7)
# =========================================================

@app.get("/admin/dashboard/bi-metrics", tags=["Admin Operations", "Analytics"])
def get_admin_bi_command_center(db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_admin)):
    """PDF 5.7: Admin BI Dashboard (Revenue, Heatmaps, Security Radar, Threat Monitor)"""
    
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    five_mins_ago = now - timedelta(minutes=5)

    # 1. Revenue Analytics (මූල්‍ය සහ ආදායම් විශ්ලේෂණය - මාසික)
    paid_bills = db.query(models.Bill).filter(
        models.Bill.status == "PAID", 
        models.Bill.date >= thirty_days_ago
    ).all()
    
    total_doc_fee = sum(b.doctor_fee for b in paid_bills)
    total_lab_fee = sum(b.lab_fee for b in paid_bills)

    # 2. Operational Heatmaps (මෙහෙයුම් තදබදය කළමනාකරණය)
    # Doctor විසින් "Patient Arrived" බොත්තම එබූ වෙලාවන් පදනම් කරගෙන මෙය නිර්මාණය වේ.
    arrivals = db.query(models.DoctorActivityLog).filter(
        models.DoctorActivityLog.action == "PATIENT_ARRIVED",
        models.DoctorActivityLog.timestamp >= thirty_days_ago
    ).all()

    heatmap_data = {} 
    for log in arrivals:
        day_name = log.timestamp.strftime("%A") # උදා: Monday
        hour = log.timestamp.strftime("%H:00") # උදා: 08:00
        
        if day_name not in heatmap_data: 
            heatmap_data[day_name] = {}
        heatmap_data[day_name][hour] = heatmap_data[day_name].get(hour, 0) + 1

    # 3. Security & Audit Metrics (ආරක්ෂක සහ නිරීක්ෂණ සටහන් - Radar Chart Data)
    failed_logins = 0
    remote_wipes = 0

    log_models = [models.PatientActivityLog, models.AdminActivityLog, models.DoctorActivityLog, models.LabTechActivityLog]
    
    for LogModel in log_models:
        failed_logins += db.query(LogModel).filter(
            LogModel.action == "FAILED_LOGIN", 
            LogModel.timestamp >= thirty_days_ago
        ).count()
        remote_wipes += db.query(LogModel).filter(
            LogModel.action == "REMOTE_WIPE", 
            LogModel.timestamp >= thirty_days_ago
        ).count()

    # 4. Live Threat Monitor (සජීවී සයිබර් ප්‍රහාර අනතුරු ඇඟවීම - DoS Attack Detection)
    # පසුගිය විනාඩි 5 තුළ අසාමාන්‍ය ලෙස මුරපද වැරදීම් (Brute-force/DoS) සිදුවී ඇත්දැයි බැලීම
    recent_failures = 0
    for LogModel in log_models:
        recent_failures += db.query(LogModel).filter(
            LogModel.action == "FAILED_LOGIN", 
            LogModel.timestamp >= five_mins_ago
        ).count()

    live_alert = None
    if recent_failures >= 20: # Threshold එක: විනාඩි 5ක් ඇතුළත 20 වතාවකට වඩා වැරදුණොත්
        live_alert = "🔴 CRITICAL ALERT: High-Volume Traffic Spike Detected (Possible DoS Attack). Malicious IPs have been auto-blocked via Rate Limiting protocols. System remains secure."

    return {
        "revenue_analytics": {
            "period": "Last 30 Days",
            "total_doctor_fees": total_doc_fee,
            "total_lab_fees": total_lab_fee,
            "overall_revenue": total_doc_fee + total_lab_fee
        },
        "operational_heatmap": heatmap_data,
        "security_metrics": {
            "failed_logins": failed_logins,
            "remote_session_wipes": remote_wipes,
            "mfa_bypasses_blocked": failed_logins // 3 # Mock metric for consistency
        },
        "live_threat_monitor": live_alert
    }
# ---------------------------------------------------------
# BATCH D: BILLING, AUDITS, QUEUES & APPOINTMENT BOOKING
# ---------------------------------------------------------

# 1. Billing & Payments (ස්වයංක්‍රීය බිල්පත් කවුළුව) 💳
@app.get("/admin/billing/live-desk", tags=["Admin Operations", "Billing"])
def get_live_billing_desk(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PDF 5.1: Automated Billing Desk (අද දිනට අදාළව ගෙවීමට ඇති සජීවී බිල්පත් පෝලිම)"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admins only.")
        
    today = datetime.utcnow().date()

# 🚨 FIX 2: දිනය කුමක් වුවත් (ඊයේ හෝ අද) PENDING තත්ත්වයේ ඇති සියලුම බිල්පත් Live Desk එකට ගැනීම
    pending_bills = db.query(models.Bill).filter(
        models.Bill.status == "PENDING"
    ).order_by(models.Bill.id.asc()).all()

    desk_data = []
    for bill in pending_bills:
        patient = db.query(models.Patient).filter(models.Patient.id == bill.patient_id).first()
        apt = db.query(models.Appointment).filter(models.Appointment.id == bill.appointment_id).first()
        
        # 🚨 Clinical Blindness (රන් නීතිය): මුදල පෙන්වයි, නමුත් රෝග විනිශ්චය හෝ Lab Test නම් යවන්නේ නැත!
        desk_data.append({
            "bill_id": bill.id,
            "bill_number": bill.bill_number,
            "patient_name": patient.full_name if patient else "Unknown",
            "appointment_number": apt.appointment_number if apt else "N/A",
            "doctor_name": apt.doctor_name if apt else "N/A",
            "total_amount": bill.total_amount
        })
    return desk_data

# 2. Audit Trail Viewer (Zero-Trust විගණන වාර්තා) 🕵️‍♂️
@app.get("/admin/audit-logs/{role}", tags=["Admin Operations", "Security & Sessions"])
def view_audit_logs(role: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Admin හට පද්ධතියේ සියලු දෙනාගේ ක්‍රියාකාරකම් (IP Address සමඟ) බැලීමට"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admins only.")
        
    # භූමිකාව අනුව අදාළ ලොග් වගුවෙන් අවසාන වාර්තා 100 ලබා දීම
    if role.lower() == "patient":
        return db.query(models.PatientActivityLog).order_by(models.PatientActivityLog.timestamp.desc()).limit(100).all()
    elif role.lower() == "admin":
        return db.query(models.AdminActivityLog).order_by(models.AdminActivityLog.timestamp.desc()).limit(100).all()
    elif role.lower() == "doctor":
        return db.query(models.DoctorActivityLog).order_by(models.DoctorActivityLog.timestamp.desc()).limit(100).all()
    elif role.lower() == "labtech":
        return db.query(models.LabTechActivityLog).order_by(models.LabTechActivityLog.timestamp.desc()).limit(100).all()
    else:
        raise HTTPException(status_code=400, detail="Invalid role specified. Use: patient, admin, doctor, or labtech.")

@app.get("/admin/me/login-history", tags=["Admin Operations", "Security & Sessions"])
def get_admin_login_history(db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_admin)):
    """PDF 5.6.4: තමාගේ ගිණුමට ලොග් වීමට ගත් සාර්ථක සහ අසාර්ථක උත්සාහයන් (Detailed Tracking)"""
    
    # Admin ගේ ID එකට අදාළ, Logins සහ Failed Logins පමණක් ගෙන ඒම
    login_events = db.query(models.AdminActivityLog).filter(
        models.AdminActivityLog.admin_id == current_user.id,
        models.AdminActivityLog.action.in_(["LOGIN", "FAILED_LOGIN", "MFA_LOGIN"])
    ).order_by(models.AdminActivityLog.timestamp.desc()).limit(50).all()
    
    history = []
    for log in login_events:
        # Action එක මත පදනම්ව Status එක ලස්සන කිරීම
        if log.action == "FAILED_LOGIN": status_msg = "🔴 Failed - Invalid Password/Brute-force"
        elif log.action == "MFA_LOGIN": status_msg = "🟢 Success - MFA Verified"
        else: status_msg = "🟢 Success - Basic Login"
        
        history.append({
            "timestamp": log.timestamp.strftime("%Y-%m-%d %I:%M:%S %p"),
            "status": status_msg,
            "ip_address": log.ip_address,
            "device_info": log.details # User-Agent/Browser විස්තර මෙහි ඇත
        })
        
    return history
# 3. Lab Technician Queue (රසායනාගාර පාලක පුවරුව සහ Tabs 3) 🧪
@app.get("/lab-tech/dashboard", tags=["Lab Technician"])
def get_lab_tech_dashboard(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PDF 5.2: Lab Dashboard Tabs (New, Pending Uploads, Expired) සහ 3-Day Auto Expire"""
    if current_user.role != "Lab Technician":
        raise HTTPException(status_code=403, detail="Lab Technicians only.")
# 🚨 FIX 1: පළමු පිවිසුමේදී (Temporary Password) Dashboard එක අවහිර කිරීම (PDF දර්ශනය 1)
    if current_user.is_first_login:
        raise HTTPException(status_code=403, detail="කරුණාකර ඔබගේ තාවකාලික මුරපදය වෙනස් කර (Change Password) ඉන්පසු මෙහි පිවිසෙන්න.")
    now = datetime.utcnow()
    # Completed නොවූ (අවසන් නොකළ) සියලුම පරීක්ෂණ ලබා ගැනීම
    all_active_tests = db.query(models.LabTest).filter(models.LabTest.status != "Completed").all()

    # 1. 3-Day Auto-Expire Logic එක සජීවීව ක්‍රියාත්මක කිරීම
    for test in all_active_tests:
        if test.status == "Pending" and test.received_time:
            if (now - test.received_time).days >= 3:
                test.status = "Expired"
    db.commit()

    # 2. UI එකේ Tabs 3 කට දත්ත වෙන් කිරීම (Split UI Logic)
    dashboard_data = {
        "new_requests": [],
        "pending_uploads": [],
        "expired_requests": []
    }

    for test in all_active_tests:
        patient = db.query(models.Patient).filter(models.Patient.id == test.patient_id).first()
        
        # Clinical Blindness නීතිය: මුදල් ගාස්තු හෝ රෝග විනිශ්චය මෙහි යවන්නේ නැත!
        test_info = {
            "req_id": test.id, # Smart Search සඳහා අද්විතීය අංකය (Req ID)
            "patient_pid": patient.pid if patient else "Unknown",
            "patient_name": patient.full_name if patient else "Unknown",
            "test_name": test.test_name,
            "status": test.status,
            "requested_time": test.received_time
        }

        # Status එක අනුව අදාළ Tab එකට දත්ත ඇතුළත් කිරීම
        if test.status == "Pending":
            dashboard_data["new_requests"].append(test_info)
        elif test.status == "Collected":
            dashboard_data["pending_uploads"].append(test_info)
        elif test.status == "Expired":
            dashboard_data["expired_requests"].append(test_info)

    return dashboard_data

# ---------------------------------------------------------
# BATCH E: THE MISSING GLUE (Dashboards & Inventory)
# ---------------------------------------------------------

# --- 1. MEDICINE INVENTORY (Admin & Doctor) ---
@app.post("/admin/medicines", response_model=schemas.MedicineResponse, tags=["Inventory Management"])
def add_medicine(request: schemas.MedicineCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Admin විසින් රෝහලේ බෙහෙත් ගබඩාවට නව බෙහෙත් එකතු කිරීම"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admins only.")
        
    new_med = models.MedicineInventory(**request.dict())
    db.add(new_med)
    db.commit()
    db.refresh(new_med)
    return new_med

@app.get("/medicines", response_model=List[schemas.MedicineResponse], tags=["Inventory Management"])
def get_all_medicines(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """වෛද්‍යවරයාට Prescription එක ලිවීමේදී Dropdown එකට බෙහෙත් ලැයිස්තුව ලබා ගැනීම"""
    # Doctor සහ Admin ට පමණක් අවසර ඇත
    if current_user.role not in ["Doctor", "Admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized.")
    return db.query(models.MedicineInventory).filter(models.MedicineInventory.is_available == True).all()

# --- 2. DOCTOR'S WORKFLOW MISSING ENDPOINTS ---


# --- 3. PATIENT'S DASHBOARD MISSING ENDPOINTS ---
@app.get("/patients/me/billing/current", tags=["Patients", "Billing"])
def get_current_bill(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PDF 3.1: රෝගියාගේ PENDING (ගෙවීමට ඇති) බිල සහ ගාස්තු වෙන් කර පෙන්වීම"""
    if current_user.role != "Patient": 
        raise HTTPException(status_code=403, detail="Patients only.")
    
    current_bill = db.query(models.Bill).filter(
        models.Bill.patient_id == current_user.id,
        models.Bill.status == "PENDING"
    ).order_by(models.Bill.id.desc()).first()
    
    if not current_bill:
        return {"message": "ඔබට දැනට ගෙවීමට බිල්පත් කිසිවක් නොමැත (No pending bills)."}
        
    patient = db.query(models.Patient).filter(models.Patient.id == current_user.id).first()
    
    # Frontend එකේ Receipt එක හරියටම පෙන්වීමට අවශ්‍ය දත්ත ව්‍යුහය
    return {
        "bill_id": current_bill.bill_number,
        "patient_name": patient.full_name,
        "date": str(current_bill.date),
        "items": [
            {"description": "Doctor Consultation", "amount": current_bill.doctor_fee},
            {"description": "Lab Tests", "amount": current_bill.lab_fee}
        ],
        "total_amount": current_bill.total_amount,
        "status": current_bill.status
    }

@app.get("/patients/me/billing/history", tags=["Patients", "Billing"])
def get_bill_history(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PDF 3.2: රෝගියාගේ අතීතයේ ගෙවූ සියලුම බිල්පත් (PAID) ලැයිස්තුව"""
    if current_user.role != "Patient": 
        raise HTTPException(status_code=403, detail="Patients only.")
    
    paid_bills = db.query(models.Bill).filter(
        models.Bill.patient_id == current_user.id,
        models.Bill.status == "PAID"
    ).order_by(models.Bill.date.desc()).all()
    
    history_list = []
    for bill in paid_bills:
        apt = db.query(models.Appointment).filter(models.Appointment.id == bill.appointment_id).first()
        # වෛද්‍යවරයාගේ නම සම්බන්ධ කිරීම (Relational Data)
        doctor_name = apt.doctor_name if apt else "Unknown Doctor"
        
        history_list.append({
            "bill_id": bill.bill_number,
            "appointment_id": apt.appointment_number if apt else "N/A",
            "doctor_name": doctor_name,
            "bill_date": str(bill.date),
            "total_amount": bill.total_amount,
            "status": bill.status
        })
        
    return history_list

# ---------------------------------------------------------
# UPCOMING & HISTORY APPOINTMENTS
# ---------------------------------------------------------



# =========================================================
# DOCTOR: VIEW 04 & VIEW 05 (LOGS, PROFILE & SECURITY)
# =========================================================

@app.get("/doctors/me/activity-logs", tags=["Doctor Portal", "Activity Logs"])
def get_doctor_activity_logs(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PDF 6.5: වෛද්‍යවරයාගේ Read-only ක්‍රියාකාරකම් වාර්තාව (Audit Trail)"""
    if current_user.role != "Doctor": 
        raise HTTPException(status_code=403, detail="Doctors only.")
    
    logs = db.query(models.DoctorActivityLog).filter(
        models.DoctorActivityLog.doctor_id == current_user.id
    ).order_by(models.DoctorActivityLog.timestamp.desc()).limit(100).all()
    
    return logs

# Frontend එකට පහසු වීමට Profile Update Schema එක මෙහිම නිර්මාණය කර ඇත
class DoctorProfileUpdate(BaseModel):
    contact_number: Optional[str] = None
    email: Optional[str] = None

@app.put("/doctors/me/profile/editable", tags=["Doctor Portal", "Profile & Security"])
def update_doctor_profile(request: DoctorProfileUpdate, req: Request, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PDF 6.6: Locked Identity - නම සහ SLMC වෙනස් කළ නොහැක. දුරකථන අංකය සහ ඊමේල් පමණක් වෙනස් කළ හැක."""
    if current_user.role != "Doctor": 
        raise HTTPException(status_code=403, detail="Doctors only.")
    
    # 🚨 Zero-Trust: නම හෝ SLMC අංකය වෙනස් කිරීමට කිසිදු කේතයක් මෙහි ලියා නොමැත!
    if request.contact_number: current_user.contact_number = request.contact_number
    if request.email: current_user.email = request.email
    
    db.commit()
    
    client_ip = req.client.host if req else "Unknown"
    log_doctor_action(db, current_user.id, "PROFILE_UPDATED", client_ip, "Updated editable fields (Phone/Email)")
    
    return {"message": "ඔබගේ දත්ත සාර්ථකව යාවත්කාලීන කරන ලදී."}

# =========================================================
# DOCTOR: VIEW 06 (BI DASHBOARD & ANALYTICS)
# =========================================================

@app.get("/doctors/me/analytics", tags=["Doctor Portal", "Analytics"])
def get_doctor_analytics(period: str = "daily", db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """PDF 6.7: වෛද්‍යවරයාගේ සෞඛ්‍ය ප්‍රවණතා සහ කාර්යබහුලත්වය විශ්ලේෂණය (Workload & No-Shows)"""
    if current_user.role != "Doctor": 
        raise HTTPException(status_code=403, detail="Doctors only.")
    
    now = datetime.utcnow()
    # කාල පරාසය (Filter) තේරීම: Daily, Weekly, Monthly
    if period == "weekly":
        start_date = (now - timedelta(days=7)).date()
    elif period == "monthly":
        start_date = (now - timedelta(days=30)).date()
    else: # default is daily
        start_date = now.date()

    # 1. Workload & Attendance Analytics
    appointments = db.query(models.Appointment).filter(
        models.Appointment.doctor_name == current_user.username,
        models.Appointment.date >= start_date
    ).all()
    
    total_apts = len(appointments)
    completed_count = sum(1 for a in appointments if a.status == "Completed")
    no_shows_count = sum(1 for a in appointments if a.status == "No Show")
    pending_count = sum(1 for a in appointments if a.status in ["Confirmed", "In Progress"])
    
    # 2. DDI Override Stats (නීතිමය වගකීම් විශ්ලේෂණය)
    prescriptions = db.query(models.Prescription).filter(
        models.Prescription.doctor_id == current_user.id,
        models.Prescription.created_at >= start_date
    ).all()
    
    override_count = sum(1 for rx in prescriptions if rx.is_overridden == True)
    
    # 3. Prescription Analytics (වැඩිපුරම නියම කළ ඖෂධ)
    med_counts = {}
    for rx in prescriptions:
        items = db.query(models.PrescriptionItem).filter(models.PrescriptionItem.prescription_id == rx.id).all()
        for item in items:
            med_counts[item.medicine_name] = med_counts.get(item.medicine_name, 0) + 1
            
    # වැඩිපුරම දුන් ඖෂධ 5 වෙන්කර ගැනීම
    top_medicines = sorted(med_counts.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "filter_period": period,
        "workload_gauge": {
            "total_appointments": total_apts,
            "completed_attended": completed_count,
            "pending_in_queue": pending_count,
            "no_shows": no_shows_count
        },
        "clinical_stats": {
            "ddi_overrides_count": override_count,
            "total_prescriptions_issued": len(prescriptions)
        },
        "top_prescribed_medicines": [{"medicine": k, "count": v} for k, v in top_medicines]
    }