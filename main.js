// load the libs
const express = require('express')
const handlebars = require('express-handlebars')
const mysql = require('mysql2/promise')
const fetch = require('node-fetch')
const withquery = require('with-query').default

// configurables
const LIMIT = 10
const API_KEY = process.env.API_KEY || ""
const nytimesapiurl = 'https://api.nytimes.com/svc/books/v3/reviews.json'


// SQL
const SQL_BOOK_LETTER = 'select * from book2018 where title like ? order by title limit ? offset ?'
const SQL_BOOK = 'select title, authors, pages, rating, rating_count, genres, image_url from book2018 where book_id = ?;'

const startApp = async (app, pool) => {
	const conn = await pool.getConnection()
	try {
		console.info('Pinging database...')
		await conn.ping()
		app.listen(PORT, () => {
			console.info(`Application started on port ${PORT} at ${new Date()}`)
		})
	} catch(e) {
		console.error('Cannot ping database', e)
	} finally {
		conn.release()
	}
}

// configure port
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000

// create connection pool
const pool = mysql.createPool({
	host: process.env.DB_HOST || 'localhost',
	port: parseInt(process.env.DB_PORT) || 3306,
	database: 'goodreads',
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	connectionLimit: 4
})

// create an instance of the application
const app = express()

// configure handlebars
app.engine('hbs', handlebars({ defaultLayout: 'default.hbs' }))
app.set('view engine', 'hbs')

// configure application
app.get('/', async (req, resp) => {

	const conn = await pool.getConnection()

	try {
//		const [ result, _ ] = await conn.query(SQL_BOOK, [ LIMIT ])
		resp.status(200)
		resp.type('text/html')
		resp.render('index')
	} catch(e) {
		console.error('ERROR: ', e)
		resp.status(500)
		resp.end()
	} finally {
		conn.release()
	}
})

app.get('/byletter', async (req, resp) => {

	const letter = req.query['letter']
	const offset = parseInt(req.query['offset']) || 0
	const conn = await pool.getConnection()
	try {
		const [ result, _ ] = await conn.query(SQL_BOOK_LETTER, [ `${letter}%`, LIMIT, offset ])
		resp.status(200)
		resp.type('text/html')
		resp.render('byletter', { 
			byletter: result,
			hasResult: result.length > 0,
			letter,
			prevOffset: Math.max(0, offset - LIMIT),
			nextOffset: offset + LIMIT
		})

	} catch(e) {
		console.error('ERROR: ', e)
		resp.status(500)
		resp.end()
	} finally {
		conn.release()
	}
})

app.get('/book/:bookId', async (req, resp) => {

	const bookId = req.params['bookId']
	const conn = await pool.getConnection()

	try {
		const [ result, _ ] = await conn.query(SQL_BOOK, [bookId])
console.info(result)
		resp.status(200)
		resp.type('text/html')
		resp.render('book', { 
			book: result[0],
		})

	} catch(e) {
		console.error('ERROR: ', e)
		resp.status(500)
		resp.end()
	} finally {
		conn.release()
	}
})

//book review from API
app.get('/bookReview/:bookName', async (req, resp) => {

	const bookName = req.params['bookName']

    const url = withquery(
        nytimesapiurl,
        {
			title: bookName,
			"api-key": API_KEY
		}
	)
	
console.info(url)

    //fetch returns a promise, to be opened using await. within it is an object with a json function. 
    const result = await fetch(url) 
    //result.json returns yet another promise, containing the final json object to be examined.
	const nytimesapiresult =  await result.json() 
		
	resp.status(200)
	resp.type('text/html')

	console.info(nytimesapiresult.results)

	resp.render('bookReview', {
		copyright: nytimesapiresult.copyright, 
		description: nytimesapiresult.results,
		hasResult: nytimesapiresult.results.length > 0,
	})

}
)
/*app.use((req, resp) => {
	resp.redirect('/')
})
*/

// start application
startApp(app, pool)