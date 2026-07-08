class AppConfig {
  const AppConfig._();

  static const realtimeBaseUrl = String.fromEnvironment(
    'REALTIME_BASE_URL',
    defaultValue: 'http://10.0.2.2:3001',
  );

  static const walletBaseUrl = String.fromEnvironment(
    'WALLET_BASE_URL',
    defaultValue: 'http://10.0.2.2:5002',
  );
}
