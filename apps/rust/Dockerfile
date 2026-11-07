# Build context is the monorepo root (see docker/compose/rust-api.yml):
#   docker build -f apps/rust/Dockerfile .
# apps/rust is a standalone crate (its own Cargo.toml/Cargo.lock), so only that dir is copied.
FROM rust:1.99-slim-bookworm AS builder

WORKDIR /usr/src/app

# rust-toolchain.toml is intentionally not copied: it pins `stable`, which would make rustup
# download a second toolchain instead of using the one in the image.
COPY apps/rust/Cargo.toml apps/rust/Cargo.lock ./
COPY apps/rust/src ./src

# Build the Rust application
RUN cargo build --release --locked

FROM debian:bookworm-slim
WORKDIR /app

# Runtime deps: the binary links only libc/libgcc (no OpenSSL in Cargo.lock); CA certs for outbound TLS.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/app/target/release/starter-rust /app/starter-rust

ENV PORT=3002
EXPOSE 3002

CMD ["./starter-rust"]
