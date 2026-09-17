const express = require('express');
const cors = require('cors');
const unitsRouter = require('./routes/units');
const staffRouter = require('./routes/staff');
const transactionsRouter = require('./routes/transactions');
const webhooksRouter = require('./routes/webhooks');

const { startSyncWorker } = require('./services/shopify');

const app = express();

app.use(cors());
app.use('/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json());

app.use('/units', unitsRouter);
app.use('/staff', staffRouter);
app.use('/transactions', transactionsRouter);
app.use('/webhooks', webhooksRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startSyncWorker();
});
