FROM runpod/base:0.4.0-cuda11.8.0

# Install huggingface-hub and download MiniCPM-o 2.6 model
RUN pip install huggingface-hub==0.28.1
RUN mkdir -p /app/model \
  && huggingface-cli download openbmb/MiniCPM-o-2_6 --local-dir /app/model

# System dependencies for MiniCPM-o 2.6
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libgl1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies from OpenBMB's spec
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .
COPY examples ./examples

# RunPod serverless configuration
EXPOSE 8000
CMD ["python", "app.py"]
