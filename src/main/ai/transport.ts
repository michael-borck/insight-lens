// The transport seam: the only place the AI Client touches the network.
// Prod uses httpTransport (node-fetch); tests inject a fake Transport.
import fetch from 'node-fetch';

export interface TransportResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<any>;
  text(): Promise<string>;
}

export interface Transport {
  post(url: string, headers: Record<string, string>, body: unknown): Promise<TransportResponse>;
  get(url: string, headers: Record<string, string>): Promise<TransportResponse>;
}

export const httpTransport: Transport = {
  async post(url, headers, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return res as unknown as TransportResponse;
  },
  async get(url, headers) {
    const res = await fetch(url, { headers });
    return res as unknown as TransportResponse;
  },
};
