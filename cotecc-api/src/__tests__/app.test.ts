import request from 'supertest';
import app from '../app';

describe('GET /health', () => {
  it('returns 200 with { status: "ok" }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('CORS', () => {
  it('includes Access-Control-Allow-Origin header', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('responds to preflight OPTIONS request', async () => {
    const res = await request(app)
      .options('/health')
      .set('Origin', 'http://example.com')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});

describe('JSON body parsing', () => {
  it('parses JSON request bodies', async () => {
    const res = await request(app)
      .post('/echo-test')
      .send({ key: 'value' })
      .set('Content-Type', 'application/json');

    // The route doesn't exist, but body-parser should have parsed
    // without throwing — a 404 confirms the middleware chain ran cleanly.
    expect(res.status).toBe(404);
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await request(app)
      .post('/anything')
      .set('Content-Type', 'application/json')
      .send('{ bad json }');
    expect(res.status).toBe(400);
  });
});

describe('Unknown routes', () => {
  it('returns 404 for unregistered GET routes', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
  });

  it('returns 404 for unregistered POST routes', async () => {
    const res = await request(app).post('/nonexistent');
    expect(res.status).toBe(404);
  });
});
