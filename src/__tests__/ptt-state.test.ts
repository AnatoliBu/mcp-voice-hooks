import { TestServer } from '../test-utils/test-server.js';

describe('PTT State API', () => {
  let server: TestServer;

  beforeEach(async () => {
    server = new TestServer();
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('POST /api/ptt', () => {
    it('should broadcast PTT start event and return action in response', async () => {
      const response = await fetch(`${server.url}/api/ptt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });

      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action).toBe('start');
    });

    it('should broadcast PTT stop event and return action in response', async () => {
      const response = await fetch(`${server.url}/api/ptt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });

      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action).toBe('stop');
    });

    it('should return 400 for invalid action', async () => {
      const response = await fetch(`${server.url}/api/ptt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invalid' })
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing action', async () => {
      const response = await fetch(`${server.url}/api/ptt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      expect(response.status).toBe(400);
    });
  });
});
