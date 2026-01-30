FROM debian:stable-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y curl ca-certificates && rm -rf /var/lib/apt/lists/* && \
    useradd -m -u 1000 ocage

FROM base AS runtime

# Download and install ocage as ocage user
USER ocage
RUN curl -fsSL https://raw.githubusercontent.com/segersniels/ocage/master/install.sh | bash

ENV PATH="/home/ocage/.local/bin:${PATH}"
ENV NODE_ENV=production
ENV NO_OPEN=1

EXPOSE 3333/tcp

ENTRYPOINT ["ocage"]
