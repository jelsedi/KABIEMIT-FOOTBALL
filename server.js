require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const fixturesRoutes = require('./routes/fixtures');
const teamsRoutes = require('./routes/teams');
const playersRoutes = require('./routes/players');
const resultsRoutes = require('./routes/results');
const transfersRoutes = require('./routes/transfers');
const regionsRoutes = require('./routes/regions');
const pitchesRoutes = require('./routes/pitches');
const disciplineRoutes = require('./routes/discipline');
const rosterRoutes = require('./routes/roster');
const refereesRoutes = require('./routes/referees');

const app = express();
app.use(cors());
app.use(express.json());

// Static frontend (vanilla HTML/CSS/JS, same pattern as Malindi Delivery)
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/fixtures', fixturesRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/players', playersRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/transfers', transfersRoutes);
app.use('/api/regions', regionsRoutes);
app.use('/api/pitches', pitchesRoutes);
app.use('/api/discipline', disciplineRoutes);
app.use('/api/roster', rosterRoutes);
app.use('/api/referees', refereesRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Village Football running on http://localhost:${PORT}`);
});
