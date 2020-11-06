// load the libs
const express = require('express')
const handlebars = require('express-handlebars')
const mysql = require('mysql2/promise')

// configurables
const LIMIT = 10

// SQL
const SQL_BOOK_LIST = 'select book_id, title from book2018 order by title asc limit ?'
const SQL_BOOK = 'select * from book2018 where book_id = ?'

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
		const [ result, _ ] = await conn.query(SQL_BOOK_LIST, [ LIMIT ])
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

app.get('/byletter/:letter', async (req, resp) => {

	const letter = req.params.letter

	const conn = await pool.getConnection()

	try {
//		const [ result, _ ] = await conn.query(SQL_BOOK, [ letter ])
		resp.status(200)
		resp.type('text/html')
		resp.render('byletter')
	} catch(e) {
		console.error('ERROR: ', e)
		resp.status(500)
		resp.end()
	} finally {
		conn.release()
	}
})

app.use((req, resp) => {
	resp.redirect('/')
})

// start application
startApp(app, pool)