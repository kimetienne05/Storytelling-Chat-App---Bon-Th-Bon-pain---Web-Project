FROM denoland/deno:alpine-2.7.14 AS builderfront
WORKDIR /app
COPY deno.json deno.lock* ./
RUN deno install
COPY . .
RUN deno task build
RUN deno cache front_server.ts

FROM denoland/deno:alpine-2.7.14
WORKDIR /app
COPY --from=builderfront /deno-dir /deno-dir
COPY --from=builderfront /app/deno.json ./
COPY --from=builderfront /app/front_server.ts ./
COPY --from=builderfront /app/key.pem ./
COPY --from=builderfront /app/cert.pem ./
COPY --from=builderfront /app/dist ./dist
ENV DENO_DIR=/deno-dir
RUN addgroup -g 1001 -S app && adduser -u 1001 -S app -G app
RUN chown -R app:app /app /deno-dir
USER app
CMD ["deno", "task", "start"]