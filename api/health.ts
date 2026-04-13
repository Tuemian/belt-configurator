type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

export default async function handler(_: unknown, response: ApiResponse): Promise<void> {
  response.status(200).json({
    ok: true,
    service: 'ft-configurator',
    timestamp: new Date().toISOString(),
  });
}
