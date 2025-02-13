FROM runpod/base:0.4.0-cuda11.8.0

# System dependencies for MiniCPM-o 2.6
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libgl1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Flash-attn is hot garbage and the developers of it should feel bad
RUN python3.11 -m pip install setuptools \
  && sudo apt-get install python3-dev \
  && python3.11 -m pip install flash-attn --no-build-isolation

# Install huggingface-hub and download MiniCPM-o 2.6 model
RUN python3.11 -m pip install huggingface-hub==0.28.1
RUN mkdir -p model \
  && huggingface-cli download openbmb/MiniCPM-o-2_6 --local-dir /app/model

# Install Python dependencies from OpenBMB's spec
COPY requirements.txt .
RUN python3.11 -m pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .
COPY examples ./examples

# RunPod serverless configuration
EXPOSE 8000
CMD ["python3.11", "app.py"]
