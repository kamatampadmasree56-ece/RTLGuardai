# Use an official lightweight Python image
FROM python:3.11-slim

# Prevent Python from writing .pyc files to disc and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=5000

WORKDIR /app

# Install build dependencies (for packages like bcrypt if wheels aren't used)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies first to leverage Docker cache
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy the entire workspace into the container
COPY . /app

# Expose the configured port
EXPOSE 5000

# Command to execute the production runner
CMD ["python", "run_production.py"]
