FROM nvidia/cuda:12.1.0-base-ubuntu22.04

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
  nvidia-container-toolkit \
  tesseract-ocr \
  libgl1 \
  ffmpeg \
  python3-pip \
  git \
  jq \
  vim \
  bash \ 
  curl \
  && rm -rf /var/lib/apt/lists/*

RUN ldconfig /usr/local/cuda-12.1/compat/

WORKDIR /app

# Install Python dependencies from OpenBMB's spec
COPY requirements-cuda.txt .
COPY requirements.txt .
RUN python3 -m pip install --upgrade pip && \
  python3 -m pip install --upgrade -r requirements-cuda.txt --no-cache-dir
RUN python3 -m pip install --upgrade -r requirements.txt --no-cache-dir

# This thing thinks it's special and needs to be here
RUN FLASH_ATTENTION_SKIP_CUDA_BUILD=TRUE python3 -m pip install -U flash-attn --no-build-isolation

# Install autogtpq
RUN git clone https://github.com/OpenBMB/AutoGPTQ.git \
    && cd AutoGPTQ \
    && git checkout minicpmo \
    && python3 -m pip install -vvv --no-build-isolation -e .

# Copy application code
COPY app.py .
COPY examples ./examples
COPY prompt.txt .

# RunPod serverless configuration
EXPOSE 8000
CMD python3 -u app.py
