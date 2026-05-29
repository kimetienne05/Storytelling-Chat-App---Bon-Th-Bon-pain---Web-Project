FROM denoland/deno:alpine-2.7.14 AS builder
WORKDIR /app
COPY deno.json deno.lock* ./
RUN deno install
COPY . .
RUN deno cache back_server.ts

FROM denoland/deno:alpine-2.7.14
WORKDIR /app
COPY --from=builder /deno-dir /deno-dir
COPY --from=builder /app/deno.json ./
COPY --from=builder /app/back_server.ts ./
COPY --from=builder /app/key.pem ./
COPY --from=builder /app/cert.pem ./
ENV DENO_DIR=/deno-dir
RUN addgroup -g 1001 -S app && adduser -u 1001 -S app -G app
RUN chown -R app:app /app /deno-dir
USER app
CMD ["deno", "task", "start"]