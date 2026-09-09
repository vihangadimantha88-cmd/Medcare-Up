import bcrypt

class Hash:
    @staticmethod
    def bcrypt(password: str):
        # bcrypt ලයිබ්‍රරිය පාවිච්චි කර Hash කිරීම
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    @staticmethod
    def verify(hashed_password, plain_password):
        # bcrypt ලයිබ්‍රරිය පාවිච්චි කර Verify කිරීම (72-byte limit ප්‍රශ්න මඟහරවා ගැනීමට)
        try:
            return bcrypt.checkpw(
                plain_password.encode('utf-8'), 
                hashed_password.encode('utf-8')
            )
        except Exception:
            return False