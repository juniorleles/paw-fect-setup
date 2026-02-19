FROM python:3.11-slim

# Dependências do sistema + Node/npm (necessário pro rfbrowser init)
RUN apt-get update && apt-get install -y \
    curl ca-certificates git \
    nodejs npm \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libasound2 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    libxshmfence1 \
    libdrm2 \
    libxkbcommon0 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Instala Playwright + browsers (Robot Framework Browser)
RUN rfbrowser init

COPY . .

CMD ["robot", "-d", "output", "tests"]