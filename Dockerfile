FROM python:3.11-slim

# Dependências do sistema necessárias para rodar browsers headless
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    git \
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

# Instala Node + Browsers do Playwright via rfbrowser
# (rfbrowser init baixa o Node runtime e os browsers necessários)
RUN rfbrowser init

COPY . .

# Por padrão: roda testes e gera output em /app/output
CMD ["robot", "-d", "output", "tests"]
