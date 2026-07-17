FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# All we need is the python files
#TODO Work on this afterwards
COPY src/*.py .

CMD exec gunicorn -w 4 -b 0.0.0.0:5000 --timeout 0 main:app
# CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 main:app
