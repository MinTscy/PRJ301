import 'package:flutter/material.dart';
import 'package:lucy_mobile/src/models/pro_session.dart';
import 'package:lucy_mobile/src/screens/materials_screen.dart';
import 'package:lucy_mobile/src/screens/overview_screen.dart';
import 'package:lucy_mobile/src/screens/podcast_screen.dart';
import 'package:lucy_mobile/src/screens/pro_dashboard_screen.dart';
import 'package:lucy_mobile/src/screens/profile_screen.dart';

class MobileShell extends StatefulWidget {
  const MobileShell({
    required this.session,
    required this.onLogout,
    super.key,
  });

  final ProSession session;
  final VoidCallback onLogout;

  @override
  State<MobileShell> createState() => _MobileShellState();
}

class _MobileShellState extends State<MobileShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final screens = [
      OverviewScreen(
        session: widget.session,
        onOpenRoom: () => setState(() => _index = 1),
      ),
      ProDashboardScreen(
        initialDisplayName: widget.session.displayName,
        initialAccessToken: widget.session.accessToken,
        embedded: true,
      ),
      const MaterialsScreen(),
      const PodcastScreen(),
      ProfileScreen(session: widget.session, onLogout: widget.onLogout),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Tổng quan',
          ),
          NavigationDestination(
            icon: Icon(Icons.podcasts_outlined),
            selectedIcon: Icon(Icons.podcasts),
            label: 'Phòng live',
          ),
          NavigationDestination(
            icon: Icon(Icons.folder_outlined),
            selectedIcon: Icon(Icons.folder),
            label: 'Tài liệu',
          ),
          NavigationDestination(
            icon: Icon(Icons.headphones_outlined),
            selectedIcon: Icon(Icons.headphones),
            label: 'Podcast',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Hồ sơ',
          ),
        ],
      ),
    );
  }
}
