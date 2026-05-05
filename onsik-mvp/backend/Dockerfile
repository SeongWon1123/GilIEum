# NVIDIA CUDA 기반 Python 이미지 (GPU 지원)
FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

WORKDIR /app

# Python 3.11 및 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    python3.11 python3.11-venv python3-pip \
    gcc g++ libc-dev \
    && rm -rf /var/lib/apt/lists/*

# python3 -> python 심볼릭 링크
RUN ln -sf /usr/bin/python3.11 /usr/bin/python && \
    ln -sf /usr/bin/pip3 /usr/bin/pip

# 의존성 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스 코드 복사
COPY . .

EXPOSE 8002

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002", "--reload"]
