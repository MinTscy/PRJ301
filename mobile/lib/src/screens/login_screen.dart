import 'package:flutter/material.dart';
import 'package:lucy_mobile/src/design_system/lucy_colors.dart';
import 'package:lucy_mobile/src/design_system/lucy_spacing.dart';
import 'package:lucy_mobile/src/models/pro_session.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({required this.onAuthenticated, super.key});

  final ValueChanged<ProSession> onAuthenticated;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController(text: 'mentor@lucy.local');
  final _name = TextEditingController(text: 'LUCY Mentor');
  final _token = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _email.dispose();
    _name.dispose();
    _token.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    widget.onAuthenticated(
      ProSession(
        displayName: _name.text.trim(),
        email: _email.text.trim(),
        accessToken: _token.text.trim(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(LucySpacing.lg),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      width: 72,
                      height: 72,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [LucyColors.primary, LucyColors.secondary],
                        ),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: const Text(
                        'L',
                        style: TextStyle(fontSize: 34, fontWeight: FontWeight.w900),
                      ),
                    ),
                    const SizedBox(height: LucySpacing.lg),
                    Text(
                      'Chào mừng trở lại',
                      style: Theme.of(context).textTheme.headlineLarge,
                    ),
                    const SizedBox(height: LucySpacing.xs),
                    const Text(
                      'Đăng nhập với tài khoản Pro để quản lý phòng học và học viên.',
                      style: TextStyle(color: LucyColors.textMuted, height: 1.5),
                    ),
                    const SizedBox(height: LucySpacing.xl),
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        prefixIcon: Icon(Icons.mail_outline),
                      ),
                      validator: _required,
                    ),
                    const SizedBox(height: LucySpacing.sm),
                    TextFormField(
                      controller: _name,
                      decoration: const InputDecoration(
                        labelText: 'Tên hiển thị',
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                      validator: _required,
                    ),
                    const SizedBox(height: LucySpacing.sm),
                    TextFormField(
                      controller: _token,
                      obscureText: _obscure,
                      autocorrect: false,
                      enableSuggestions: false,
                      decoration: InputDecoration(
                        labelText: 'Access token Pro',
                        prefixIcon: const Icon(Icons.key_outlined),
                        suffixIcon: IconButton(
                          onPressed: () => setState(() => _obscure = !_obscure),
                          icon: Icon(
                            _obscure
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                        ),
                      ),
                      validator: _required,
                    ),
                    const SizedBox(height: LucySpacing.lg),
                    FilledButton.icon(
                      onPressed: _submit,
                      icon: const Icon(Icons.login),
                      label: const Text('Vào LUCY Pro'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  static String? _required(String? value) =>
      value == null || value.trim().isEmpty ? 'Vui lòng nhập thông tin' : null;
}
