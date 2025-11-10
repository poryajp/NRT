export enum RequestType {
  HTTPS = 'https-get',
  HTTP = 'http-get',
}

export interface PingResult {
  id: number;
  type: RequestType;
  time: number | null;
  status: string | number | null;
  error?: string;
  timestamp: string;
}