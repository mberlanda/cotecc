import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
app.use(helmet());
app.use(express.json());
app.use(cors());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
