import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";

const db = new pg.Client({
	user: "postgres",
	host: "localhost",
	database: "bookreview",
	password: "123456",
	port: 5432,
});

db.connect();

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const fetchReviews = async () => {
	const result = await db.query("SELECT * FROM books ORDER BY id ASC");
	const reviews = [];
	for (let review of result.rows) {
		const { book, authors } = await fetchBook(review.isbn);
		reviews.push({ ...review, book: book, authors: authors });
	}
	return reviews;
};

const fetchSingleReview = async (isbn) => {
	const result = await db.query("SELECT * from books WHERE isbn = $1", [isbn]);
	if (result.rowCount) {
		return result.rows[0];
	} else {
		return null;
	}
};

const fetchBook = async (isbn) => {
	try {
		let result = await axios.get(`https://openlibrary.org/isbn/${isbn}.json`);
		const book = result.data;
		let authors = [];

		try {
			for (let author of book.authors) {
				result = await axios.get(
					`https://openlibrary.org${author["key"]}.json`
				);
				authors.push(result.data);
			}
		} catch (error) {
			console.log(error.response.data);
		}
		return { book: book, authors: authors };
	} catch (error) {
		console.log(error.response.data);
		return { error: "Book is not found with isbn " + isbn };
	}
};

app.get("/", async (req, res) => {
	const reviews = await fetchReviews();
	res.render("index.ejs", {
		reviews: reviews,
	});
});

app.post("/search", async (req, res) => {
	const { search } = req.body;
	const result = await fetchSingleReview(search);

	if (result) {
		res.redirect("/edit/" + search);
	} else {
		res.redirect("/search/" + search);
	}
});

app.get("/search/:isbn", async (req, res) => {
	const { isbn } = req.params;
	const reviews = await fetchReviews();
	const result = await fetchBook(isbn);
	if (result.error) {
		res.render("index.ejs", { error: result.error, reviews: reviews });
	} else {
		res.render("index.ejs", { ...result, isbn: isbn, reviews: reviews });
	}
});

app.get("/edit/:isbn", async (req, res) => {
	const { isbn } = req.params;
	const review = await fetchSingleReview(isbn);
	const reviews = await fetchReviews();
	const result = await fetchBook(isbn);

	res.render("index.ejs", {
		...result,
		isbn: isbn,
		reviews: reviews,
		review: review,
	});
});

app.post("/post/:isbn", async (req, res) => {
	const { isbn } = req.params;
	const { rate, description } = req.body;
	await db.query(
		"INSERT INTO books (isbn, description, rating) VALUES ($1, $2, $3)",
		[isbn, description, rate]
	);
	res.redirect("/");
});

app.post("/edit/:isbn", async (req, res) => {
	const { isbn } = req.params;
	const { rate, description } = req.body;
	await db.query(
		"UPDATE books SET description = $1, rating = $2 WHERE isbn = $3;",
		[description, rate, isbn]
	);
	res.redirect("/");
});

app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});
