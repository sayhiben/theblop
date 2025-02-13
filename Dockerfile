FROM nvidia/cuda:12.1.0-base-ubuntu22.04 
RUN ldconfig /usr/local/cuda-12.1/compat/
ENV CUDA_HOME="/usr/local/cuda-12.1"

# Override the default huggingface cache directory.
ENV HF_HOME="/runpod-volume/.cache/huggingface/"
ENV HF_DATASETS_CACHE="/runpod-volume/.cache/huggingface/datasets/"
ENV DEFAULT_HF_METRICS_CACHE="/runpod-volume/.cache/huggingface/metrics/"
ENV DEFAULT_HF_MODULES_CACHE="/runpod-volume/.cache/huggingface/modules/"
ENV HUGGINGFACE_HUB_CACHE="/runpod-volume/.cache/huggingface/hub/"
ENV HUGGINGFACE_ASSETS_CACHE="/runpod-volume/.cache/huggingface/assets/"

# Faster transfer of models from the hub to the container
ENV HF_HUB_ENABLE_HF_TRANSFER="1"

# Shared python package cache
ENV VIRTUALENV_OVERRIDE_APP_DATA="/runpod-volume/.cache/virtualenv/"
ENV PIP_CACHE_DIR="/runpod-volume/.cache/pip/"
ENV UV_CACHE_DIR="/runpod-volume/.cache/uv/"

# Set Default Python Version
ENV PYTHON_VERSION="3.10"

# System dependencies for MiniCPM-o 2.6
RUN apt-get update && apt-get install -y \
  tesseract-ocr \
  libgl1 \
  ffmpeg \
  python3-pip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies from OpenBMB's spec
COPY requirements.txt .
RUN python3 -m pip install --upgrade pip && \
  python3 -m pip install --upgrade -r requirements.txt --no-cache-dir && \
  rm requirements.txt

# This thing thinks it's special and needs to be here
RUN pip install -U flash-attn==2.5.8 --no-build-isolation

# Copy application code
COPY app.py .
COPY examples ./examples

# RunPod serverless configuration
EXPOSE 8000
CMD python3 -u app.py
