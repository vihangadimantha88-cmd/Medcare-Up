from passlib.context import CryptContext

# Bcrypt යොදාගෙන Password Hashing Context එක සෑදීම
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class Hash():
    
    @staticmethod
    def bcrypt(password: str):
        # ලබාදෙන සාමාන්‍ය මුරපදය (Plain password) ආරක්ෂිත Hash කේතයක් බවට පත් කිරීම
        return pwd_context.hash(password)

    @staticmethod
    def verify(hashed_password, plain_password):
        # Database එකේ ඇති Hash අගය සහ පරිශීලකයා ලබාදෙන මුරපදය සමානදැයි පරීක්ෂා කිරීම
        return pwd_context.verify(plain_password, hashed_password)