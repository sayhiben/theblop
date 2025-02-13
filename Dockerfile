FROM runpod/base:0.6.2-cuda12.6.2

# System dependencies for MiniCPM-o 2.6
RUN apt-get update && apt-get install -y \
  tesseract-ocr \
  libgl1 \
  ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies from OpenBMB's spec
COPY requirements.txt .
RUN python3.11 -m pip install --upgrade pip && \
  python3.11 -m pip install --upgrade -r requirements.txt --no-cache-dir && \
  rm requirements.txt

# Copy application code
COPY app.py .
COPY examples ./examples

# RunPod serverless configuration
EXPOSE 8000
CMD python -u app.py
