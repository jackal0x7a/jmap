FROM python:3.12-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir flask flask-cors

# Copy source
COPY server.py .

# Data directory for SQLite (mounted as volume)
RUN mkdir -p /data

EXPOSE 3747

CMD ["python", "server.py"]
