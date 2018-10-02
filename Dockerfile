FROM rust:1.28.0

WORKDIR /usr/src/arenavision
COPY . .

RUN cargo install

CMD ["arenavision"]