import 'package:flutter/material.dart';
import 'package:lucy_mobile/src/design_system/lucy_theme.dart';
import 'package:lucy_mobile/src/models/pro_session.dart';
import 'package:lucy_mobile/src/navigation/mobile_shell.dart';
import 'package:lucy_mobile/src/screens/login_screen.dart';

class LucyMobileApp extends StatefulWidget {
  const LucyMobileApp({super.key});

  @override
  State<LucyMobileApp> createState() => _LucyMobileAppState();
}

class _LucyMobileAppState extends State<LucyMobileApp> {
  ProSession? _session;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LUCY Pro',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.dark,
      darkTheme: LucyTheme.dark,
      home: _session == null
          ? LoginScreen(
              onAuthenticated: (session) => setState(() => _session = session),
            )
          : MobileShell(
              session: _session!,
              onLogout: () => setState(() => _session = null),
            ),
    );
  }
}
