CREATE TABLE books (
  id SERIAL PRIMARY KEY,
  isbn VARCHAR(13) NOT NULL,
  description VARCHAR(200) NOT NULL,
  rating INT NOT NULL,
  UNIQUE(isbn)
);
