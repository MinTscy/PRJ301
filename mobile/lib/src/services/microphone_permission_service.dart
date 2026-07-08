import 'package:permission_handler/permission_handler.dart';

enum MicrophonePermissionResult {
  granted,
  denied,
  permanentlyDenied,
  restricted,
}

class MicrophonePermissionService {
  const MicrophonePermissionService();

  Future<MicrophonePermissionResult> request() async {
    var status = await Permission.microphone.status;
    if (!status.isGranted) {
      status = await Permission.microphone.request();
    }
    if (status.isGranted) return MicrophonePermissionResult.granted;
    if (status.isPermanentlyDenied) {
      return MicrophonePermissionResult.permanentlyDenied;
    }
    if (status.isRestricted) return MicrophonePermissionResult.restricted;
    return MicrophonePermissionResult.denied;
  }

  Future<bool> openSettings() => openAppSettings();
}
