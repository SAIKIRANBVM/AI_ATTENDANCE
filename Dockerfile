FROM python:3.13-slim-bookworm

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PATH="root/.local/bin:${PATH}"

ENV UV_HTTP_TIMEOUT=1000

WORKDIR /app

COPY pyproject.toml uv.lock .

RUN uv pip install -r pyproject.toml --system

COPY . .

EXPOSE 9000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "9000", "--reload"]