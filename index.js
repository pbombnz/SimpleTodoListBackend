// Imports
const express = require('express');
const path = require('path')
const cors = require('cors');
const bodyParser = require('body-parser');
const pg = require('pg');//.native;
const morgan = require('morgan')

// Port Setup
var PORT = process.env.PORT || 8080;
var DATABASE_URL = process.env.DATABASE_URL || 'postgres://yfcxnmmnhrogdb:35786636165fbf8ad69c0b6c1f1f6c2bac235331c0ad5365e368533c745eed2d@ec2-107-22-221-60.compute-1.amazonaws.com:5432/d5r86lcb00bu3m';

// Database Setup
var pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: true,
});


/**
 * A Http Error is used, when a route cannot continue as intended, due to
 * poor/ill-formed requested, or database-related issue. This function returns
 * an error that will be sent the client. 
 * 
 * @param {*} statusCode The status code used in a response
 * @param {*} message 
 */
function HttpError(statusCode, message) {
    var err = new Error(message);
    err.statusCode = statusCode;
    return err;
}


// Express Setup
var app = express()
    // Data Processing for x-www-urlencoded or JSON
    .use(bodyParser.urlencoded({ extended : true}))
    .use(bodyParser.json())
    .use(morgan(/*'tiny'*/'combined')) // Logging
    .use(cors()) // Cross-origin Resource sharing handling (for local-hosted launch)
    .use(express.static(path.join(__dirname, 'public'))); // Public folder is accessible on web.

// A GET route that retrieves all tasks.
app.get('/tasks', async (req, res) => {
    try {
        // Connect to database and request data.
        const client = await pool.connect()
        var result = await client.query('SELECT * FROM todo ORDER BY id');  
        // Although unlikely to occur, failure to retrieve results will produce an error. 
        if (!result) {
            throw new HttpError(503, 'Failure to retrieve data.');
        }
        // Create response header and body data.
        res.type('application/json');
        res.send({success : true, data : result.rows});
        client.release(); // Close Database connection
    } catch (err) {
        // Errors caught will be processed and sent to client as response.
        if('error' in err) {
            err = err.error;
        }    
        res.status(err.statusCode || 400).send({success : false, error : err.message});
    }
});

// A GET route that gets a task based on a specifc id from the database.
app.get('/tasks/:id', async (req, res) => {
    try {
        // Connect to database and request data.
        const client = await pool.connect()
        var result = await client.query('SELECT * FROM todo WHERE id=$1', [req.params.id]); 
        // Although unlikely to occur, failure to retrieve results will produce an error.   
        if (!result || result.rowCount == 0) {
            throw new HttpError(404, `No task with id ${req.params.id}.`)
        }
        // Create response header and body data.
        res.type('application/json');
        res.send({success : true, data : result.rows[0]});
        client.release(); // Close Database connection
    } catch (err) {
        // Errors caught will be processed and sent to client as response.
        if('error' in err) {
            err = err.error;
        } 
        res.status(err.statusCode || 400).send({success : false, error : err.message});
    }
});

// A PUT route that updates a task with a specific id and applies those changes in the database.
app.put('/tasks/:id', async (req, res) => {
    try {
        // We need to do some pre-processing on the request data to generate the
        // SQL query to remove any unneccessary key-value pairs.

        // Retrieve all the keys, as its easier to observe at the keys directly, rather
        // than with its data.
        let bodyKeys = Object.keys(req.body); 

        // If the body is empty, produce error
        if(bodyKeys.length == 0) {
            throw new HttpError(400, `No body parameters provided.`);
        }

        // Setup params and the inital query.
        let resParams = [];
        let resQuery = "UPDATE todo SET ";

        // Add relevant key-pairs in the data to the constructed query above.
        for(let i = 0; i < bodyKeys.length; i++) {
            // Ignore keys which we belive the client should not be allowed to modify.
            if(bodyKeys[i].toLowerCase() == 'id' || bodyKeys[i].toLowerCase() == 'date_created') {
                continue;
            }
            // Add the key-value pair to the query and params.
            resParams.push(req.body[bodyKeys[i]])
            resQuery += bodyKeys[i] + '=$' + resParams.length + ', ';
        }
        // To finish off the query, we must specify the id of the task so the database
        // knows which task to edit.
        resParams.push(req.params.id);
        resQuery = resQuery.slice(0, -2).concat(' WHERE id=$', resParams.length);

        // Connect to database and request data.
        const client = await pool.connect();
        var result = await client.query(resQuery, resParams); 
        // Although unlikely to occur, failure to retrieve results will produce an error.   
        if (!result || result.rowCount == 0) {
            throw new HttpError(404,`No task updated as no task exists with id ${req.params.id}.`);
        }

        // Retrieve the task data from 'todo' table after task has updated.
        result = await client.query('SELECT * FROM todo WHERE id=$1', [req.params.id]); 
        // Although unlikely to occur, failure to retrieve results will produce an error.   
        if (!result) {
            throw new HttpError(503, 'Task updated successfully, but cannot retrieve updated task data from database.');
        }

        // Response body is the updated task.
        res.type('application/json');
        res.send({success : true, data : result.rows[0]});
        client.release(); // Close Database connection
    } catch (err) {
        // Errors caught will be processed and sent to client
        if('error' in err) {
            err = err.error;
        }    
        res.status(err.statusCode || 400).send({success : false, error : err.message});
    }
});

// A POST route that create a task and places it in the database.
app.post('/tasks', async (req, res) => {
    try {
        // Connect to database and request data.
        const client = await pool.connect();

        // To determine how to new task data into todo table, we need to create a
        // different query depending on the number of elements in the request body,
        // and the keys that are present in the JSON.
        if(Object.keys(req.body).length == 2 && req.body.item && req.body.completed) {
            // Only 'item' and 'completed' keys are present
            var result = await client.query('INSERT INTO todo(item, completed) VALUES($1, $2) RETURNING id', [req.body.item, req.body.completed]);   
        } else if(Object.keys(req.body).length == 1 && req.body.item) {
            // Only 'item' key is present
            var result = await client.query('INSERT INTO todo(item) VALUES($1) RETURNING id', [req.body.item]);   
        } else {
            // Some other variation where no 'item' key exists and/or too many other misc. keys present.
            throw new HttpError(400, 'Body must contain a \'item\' field.');
        }

        // Although unlikely to occur, failure to retrieve results will produce an error.
        if (!result) {
            throw new HttpError(503, 'Task cannot be inserted into database.');
        }

        // Retrieve the new task data from todo table after inserted.
        result = await client.query('SELECT * FROM todo WHERE id=$1', [result.rows[0].id]);   
        // Although unlikely to occur, failure to retrieve results will produce an error.
        if (!result) {
            throw new HttpError(503, 'Task inserted successfully, but cannot retrieve new task data from database.');
        }

        // Response body is the new task.
        res.type('application/json');
        res.send({success : true, data : result.rows[0]});
        client.release();
    } catch (err) {
        // Errors caught will be processed and sent to client
        if('error' in err) {
            err = err.error;
        }    
        res.status(err.statusCode || 400).send({success : false, error : err.message});
    }
});

// A DELETE route that deletes a task with a specific id from the database.
app.delete('/tasks/:id', async (req, res) => {
    try {
        // Connect to database and request data.
        const client = await pool.connect()
        var result = await client.query('DELETE FROM todo WHERE id=$1', [req.params.id]); 
        // If results is undefined or null, and/or the rowCount is zero, its likely that
        // a task with that specific id does not exist. 
        if (!result || result.rowCount == 0) {
            throw new HttpError(404, `No task exists with id ${req.params.id}.`);
        }

        // Response body is the updated task.
        res.type('application/json');
        res.send({success : true});
        client.release();
    } catch (err) {
        // Errors caught will be processed and sent to client
        if('error' in err) {
            err = err.error;
        }    
        res.status(err.statusCode || 400).send({success : false, error : err.message});
    }
});

// Listening for incoming connections.
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));