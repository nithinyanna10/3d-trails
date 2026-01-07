@echo off
cd backend
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate.bat
pip install -q -r requirements.txt
uvicorn main:app --reload --port 8000

