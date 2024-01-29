// server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB (replace 'your_mongodb_uri' with your actual MongoDB URI)
// const mongoUri = "mongodb+srv://bmuppalla1:Bhargav@143@cluster0.bvcmanr.mongodb.net/?retryWrites=true&w=majority";
const password = encodeURIComponent('Bhargav@143');
mongoose.connect(`mongodb+srv://bmuppalla1:${password}@cluster0.bvcmanr.mongodb.net/?retryWrites=true&w=majority`, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection.useDb('volunteer-management-app');


db.on('connected', () => {
  console.log('Connected to MongoDB');
});

// Event handling for connection error
db.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Event handling for disconnection
db.on('disconnected', () => {
  console.log('Disconnected from MongoDB');
});

// Close the Mongoose connection when the Node process terminates
process.on('SIGINT', () => {
  db.close(() => {
    console.log('Mongoose connection closed due to application termination');
    process.exit(0);
  });
});

// Middleware
app.use(bodyParser.json());

// Cors (Cross origin resource sharing)
app.use(cors({ origin: '*', credentials: true }));


// Define a MongoDB model for users
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String,
});


const User = db.model('User', userSchema,'User');

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('reached server endpoint');
  try {
    const user = await User.findOne({ username, password });

    if (user) {
      // Authentication successful, send user role in the response
      res.json({ role: user.role });
    } else {
      // Authentication failed
      res.status(401).json({ error: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add user endpoint
app.post('/add-user', async (req, res) => {
  const { username, password, role } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({ error: 'User with the provided username already exists' });
    }

    // Create a new user
    const newUser = new User({
      username,
      password,
      role,
    });
    console.log(newUser);

    // Save the new user to the database
    const result = await newUser.save();

    console.log('User added successfully:', result);

    // Respond with success
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const volunteerActivitySchema = new mongoose.Schema({
  volunteerName: String,
  username: String,
  event: String,
  description: String,
  hours: Number,
  status: String,
});

const VolunteerActivity = db.model('VolunteerActivity', volunteerActivitySchema,'VolunteerActivity');

app.get('/requests',async (req,res)=>{
  try {
    // Retrieve pending requests from MongoDB
    const pendingRequests = await VolunteerActivity.find({ status: 'Pending' });
    // Send the data as a response
    res.json(pendingRequests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update the route to include the username parameter
app.get('/my-activities/:username/:status', async (req, res) => {
  const { username, status } = req.params;

  try {
    // Retrieve approved activities for the specified user from MongoDB
    const pendingActivities = await VolunteerActivity.find({
      username,
      status,
    });
    // Send the data as a response
    res.json(pendingActivities);
  } catch (error) {
    console.error('Error fetching my activities:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/approve-reject-request', async (req, res) => {
  try {
    const { requestId, action } = req.body;

    // Update the status based on action and requestId
    const filter = { _id: requestId }; 
    const update = { $set: { status: action === 'approve' ? 'approved' : 'rejected' } };

    // Use Mongoose to update the document
    const result = await VolunteerActivity.updateOne(filter, update);

    if (result.modifiedCount === 1) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Request not found' });
    }
  } catch (error) {
    console.error('Error handling request approval/rejection:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/log-hours', async (req, res) => {
  try {
    const { volunteerName, username, event, description, hours, userRole } = req.body;
    const status = userRole === 'admin' ? 'Approved' : 'Pending';

    const newActivity = new VolunteerActivity({
      volunteerName,
      username,
      event,
      description,
      hours,
      status
    });

    const result = await newActivity.save();

    console.log('Volunteer hours logged successfully:', result);

    // Respond with success
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging volunteer hours:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
